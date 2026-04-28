import React, { useEffect, useRef, useState } from "react";
import moment from "moment";
import { useGlobalContext, useRam } from "./Store";
import { Notification } from "../api/ram/ram.did";

const POLL_INTERVAL_MS = 60_000;
const NOTIFICATIONS_PAGE_SIZE = 50;

export default function NotificationBell() {
  const ram = useRam();
  const { state: { isAuthed } } = useGlobalContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(NOTIFICATIONS_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isread).length;

  useEffect(() => {
    if (!isAuthed) {
      setNotifications([]);
      return;
    }

    async function fetchNotifications() {
      try {
        const result = await ram.getMyNotifications(false, BigInt(NOTIFICATIONS_PAGE_SIZE));
        setNotifications(result.slice().reverse());
      } catch (e) {
        // silently ignore errors (e.g. when not authenticated)
      }
    }

    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isAuthed, ram]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleMarkRead(id: bigint) {
    try {
      await ram.readNotification(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isread: true } : n))
      );
    } catch (e) {
      // ignore
    }
  }

  async function handleDelete(id: bigint) {
    try {
      await ram.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      // ignore
    }
  }

  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    // Refresh when opening; reset limit so repeated open/close doesn't accumulate
    if (nextOpen) {
      setLimit(NOTIFICATIONS_PAGE_SIZE);
      try {
        const result = await ram.getMyNotifications(false, BigInt(NOTIFICATIONS_PAGE_SIZE));
        setNotifications(result.slice().reverse());
      } catch (e) {
        // ignore
      }
    }
  }

  async function handleLoadMore() {
    const nextLimit = limit + NOTIFICATIONS_PAGE_SIZE;
    setLoadingMore(true);
    try {
      const result = await ram.getMyNotifications(false, BigInt(nextLimit));
      // Replace the list (never append) to prevent duplicate entries
      setNotifications(result.slice().reverse());
      setLimit(nextLimit);
    } catch (e) {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }

  if (!isAuthed) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative rounded-full border border-slate-300/80 bg-white p-2 shadow-sm transition hover:border-orange-400 hover:text-orange-600"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="reveal-up absolute right-0 top-10 z-50 w-80 rounded-2xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
            {unreadCount > 0 && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={String(n.id)}
                  className={`group flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition ${
                    n.isread ? "bg-white" : "bg-orange-50"
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    🔔
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-xs text-slate-700">{n.note}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {moment(Number(n.sendtime) / 1_000_000).fromNow()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                    {!n.isread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      title="Delete"
                      className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length === limit && (
            <div className="border-t border-slate-100 px-4 py-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full rounded-lg py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-orange-600 disabled:opacity-40"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
