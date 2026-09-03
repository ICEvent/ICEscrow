import React, { FC, useState } from 'react'
import { useLocation, useNavigate } from "react-router-dom";
import vansdayLogo from '../assets/vansday.png'
import DarkModeToggle from './DarkModeToggle'

import { useEffect } from "react"

import { HttpAgent, Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { HOST } from "../lib/canisters";

import { useSetAgent, useGlobalContext, useLoading } from "../components/Store";

import LoginButton from "../components/LoginButton";
import NotificationBell from "../components/NotificationBell";
import PrincipalName from "../components/PrincipalName";

const Header: FC = () => {
  const setAgent = useSetAgent();
  const navigate = useNavigate();
  const location = useLocation();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const { loading } = useLoading();

  const [authClient, setAuthClient] = useState<AuthClient>(null);
  const [openMenu, setOpenMenu] = React.useState(false);

  const handleClick = () => {
    setOpenMenu((prev) => !prev);
  };

  const handleClose = () => {
    setOpenMenu(false);
  };

  const go = (path: string) => {
    handleClose();
    navigate(path);
  };

  const openOrders = () => go('/orders');
  const openProfile = () => go('/profile');
  const openShop = () => go('/market');
  const openFreeItems = () => go('/free');
  const openMyItems = () => go('/items');

  useEffect(() => {
    (async () => {
      const authClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true
        }
      });
      setAuthClient(authClient);

      if (await authClient.isAuthenticated()) {
        handleAuthenticated(authClient);
      }
    })();
  }, []);

  const handleAuthenticated = async (authClient: AuthClient) => {
    const identity: Identity = authClient.getIdentity();

    setAgent({
      agent: await HttpAgent.create({
        identity,
        host: HOST,
      }),
      isAuthed: true,
    });
  };

  const logout = async () => {
    handleClose();
    await authClient?.logout();
    setAgent({ agent: null });
    navigate("/market", { replace: true });
  };

  const isActive = (path: string) => {
    if (path === '/market') {
      return location.pathname === '/market' || location.pathname.startsWith('/item/');
    }
    return location.pathname === path;
  };

  const desktopTabClass = (path: string) =>
    `rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
      isActive(path)
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-600 hover:text-slate-900'
    }`;

  const mobileTabClass = (path: string) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-bold uppercase tracking-wide transition ${
      isActive(path)
        ? 'bg-slate-900 text-white shadow-sm'
        : 'text-slate-600'
    }`;

  return (
    <>
      <header className="fade-in fixed left-0 right-0 top-0 z-40 px-4 pt-3 sm:px-6 lg:px-10">
        <div className="glass-panel mx-auto flex h-16 w-full max-w-7xl items-center gap-2 rounded-2xl px-3 sm:px-4">
          <button
            type="button"
            className="mr-2 flex items-center gap-2"
            onClick={openShop}
          >
            <img src={vansdayLogo} alt="Vansday" className="h-9 w-9 rounded-xl object-contain" />
            <span className="text-left">
              <span className="block text-base font-extrabold leading-none text-slate-900">Vansday</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Escrow</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 rounded-xl bg-slate-100/80 p-1 md:flex" aria-label="Primary navigation">
            <button type="button" onClick={openShop} className={desktopTabClass('/market')}>
              Market
            </button>
            <button type="button" onClick={openFreeItems} className={desktopTabClass('/free')}>
              Free
            </button>
            {isAuthed && (
              <>
                <button type="button" onClick={openOrders} className={desktopTabClass('/orders')}>
                  Orders
                </button>
                <button type="button" onClick={openMyItems} className={desktopTabClass('/items')}>
                  My Items
                </button>
                <button type="button" onClick={openProfile} className={desktopTabClass('/profile')}>
                  Profile
                </button>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DarkModeToggle />
            <NotificationBell />

            {isAuthed && (
              <button
                type="button"
                onClick={handleClick}
                className="btn-modern-secondary rounded-full border border-slate-300/80 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm sm:px-4"
                aria-expanded={openMenu}
                aria-label="Open account menu"
              >
                {principal ? <PrincipalName principal={principal} /> : 'Account'}
              </button>
            )}
            {!isAuthed && <LoginButton />}
          </div>

          {openMenu && (
            <div className="reveal-up absolute right-4 top-16 z-50 min-w-[210px] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
              <button
                type="button"
                onClick={openProfile}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={openOrders}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Orders
              </button>
              <button
                type="button"
                onClick={openMyItems}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                My Items
              </button>
              <button
                type="button"
                onClick={logout}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <nav
        className="fixed bottom-3 left-3 right-3 z-40 mx-auto flex max-w-lg items-center gap-1 rounded-2xl border border-white/70 bg-white/95 p-1.5 shadow-2xl backdrop-blur md:hidden"
        aria-label="Mobile navigation"
      >
        <button type="button" onClick={openShop} className={mobileTabClass('/market')}>
          <span className="mb-1 text-sm" aria-hidden="true">⌂</span>
          Market
        </button>
        <button type="button" onClick={openFreeItems} className={mobileTabClass('/free')}>
          <span className="mb-1 text-sm" aria-hidden="true">♡</span>
          Free
        </button>
        {isAuthed && (
          <>
            <button type="button" onClick={openOrders} className={mobileTabClass('/orders')}>
              <span className="mb-1 text-sm" aria-hidden="true">↔</span>
              Orders
            </button>
            <button type="button" onClick={openMyItems} className={mobileTabClass('/items')}>
              <span className="mb-1 text-sm" aria-hidden="true">□</span>
              Items
            </button>
            <button type="button" onClick={openProfile} className={mobileTabClass('/profile')}>
              <span className="mb-1 text-sm" aria-hidden="true">●</span>
              Me
            </button>
          </>
        )}
      </nav>

      {loading && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40" onClick={handleClose}>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/40 border-t-white" />
        </div>
      )}
    </>
  )
}

export default Header
