import * as React from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';

import { useEscrow, useGlobalContext } from '../Store';
import OrderDetail from './OrderDetail';
import Comments from './CommentList';
import {
    ORDER_STATUS_NEW,
    ORDER_STATUS_DEPOSITED,
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_RECEIVED,
    ORDER_STATUS_RELEASED,
    ORDER_STATUS_CLOSED,
    ORDER_STATUS_CANCELED,
} from '../../lib/constants';
import { currencyBase, currencySymbol } from '../../lib/currencyUtils';

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-sky-50 text-sky-700 border-sky-300',
    deposited: 'bg-blue-50 text-blue-700 border-blue-300',
    delivered: 'bg-amber-50 text-amber-700 border-amber-300',
    received: 'bg-purple-50 text-purple-700 border-purple-300',
    released: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    closed: 'bg-slate-100 text-slate-500 border-slate-300',
    canceled: 'bg-rose-50 text-rose-600 border-rose-300',
    refunded: 'bg-orange-50 text-orange-700 border-orange-300',
};

export default (props) => {
    const escrow = useEscrow();
    const { state: { principal } } = useGlobalContext();

    const [openOrder, setOpenOrder] = React.useState(false);
    const [status, setStatus] = React.useState<string>(Object.getOwnPropertyNames(props.order.status)[0]);
    const [confirmed, setConfirmed] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [showComment, setShowComment] = React.useState(false);
    const [commentText, setCommentText] = React.useState('');
    const [comments, setComments] = React.useState<any[]>(props.order.comments ?? []);

    const currency = currencySymbol(props.order.currency);
    const es = currencyBase(props.order.currency);
    const amount = parseInt(props.order.amount) / es;
    const isFreeOrder = amount === 0;
    const isBuyer = principal?.toString() === props.order.buyer.toString();
    const isSeller = principal?.toString() === props.order.seller.toString();
    const isTerminal = status === ORDER_STATUS_CLOSED || status === ORDER_STATUS_CANCELED || status === 'refunded';

    const needsConfirm =
        (status === ORDER_STATUS_NEW && isBuyer) ||
        (status === ORDER_STATUS_DEPOSITED && isSeller) ||
        (status === ORDER_STATUS_DELIVERED && isBuyer);

    async function act(fn: () => Promise<any>, nextStatus: string) {
        setBusy(true);
        try {
            const res = await fn();
            if (res['ok'] !== undefined) {
                toast.success('Status updated');
                setStatus(nextStatus);
                setConfirmed(false);
            } else {
                toast.error(res['err'] ?? 'Action failed');
            }
        } catch {
            toast.error('Action failed');
        } finally {
            setBusy(false);
        }
    }

    async function submitComment() {
        const text = commentText.trim();
        if (!text) return;
        setBusy(true);
        try {
            const res = await escrow.comment(props.order.id, text);
            if (res['ok'] !== undefined) {
                toast.success('Comment posted');
                setComments(prev => [...prev, { user: principal, comment: text, ctime: BigInt(Date.now()) * BigInt(1_000_000) }]);
                setCommentText('');
                setShowComment(false);
            } else {
                toast.error(res['err'] ?? 'Failed to post comment');
            }
        } catch {
            toast.error('Failed to post comment');
        } finally {
            setBusy(false);
        }
    }

    const statusColor = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600 border-slate-300';

    return (
        <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setOpenOrder(true)}
                                className="text-sm font-semibold text-orange-700 transition hover:text-orange-800 hover:underline"
                            >
                                #{parseInt(props.order.id)}
                            </button>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusColor}`}>
                                {status}
                            </span>
                        </div>
                        <p className="mt-1 text-base font-semibold text-slate-900 truncate">{props.order.memo}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full border border-teal-600/50 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                        {isFreeOrder ? 'FREE' : `${amount} ${currency}`}
                    </span>
                </div>

                {/* Meta */}
                <p className="mb-3 text-xs text-slate-500">
                    {isBuyer ? 'You are buyer' : 'You are seller'} · {moment.unix(parseInt(props.order.createtime) / 1_000_000_000).format('YYYY-MM-DD HH:mm')}
                </p>

                {/* Hint */}
                {!isFreeOrder && !isTerminal && (() => {
                    if (status === ORDER_STATUS_NEW && isBuyer) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Deposit {amount} {currency} to escrow account to proceed.</p>;
                    if (status === ORDER_STATUS_NEW && isSeller) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Waiting for buyer to deposit funds.</p>;
                    if (status === ORDER_STATUS_DEPOSITED && isSeller) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Confirm delivery of "{props.order.memo}" to buyer.</p>;
                    if (status === ORDER_STATUS_DEPOSITED && isBuyer) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Waiting for seller to deliver.</p>;
                    if (status === ORDER_STATUS_DELIVERED && isBuyer) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Confirm receipt — this releases funds to the seller.</p>;
                    if (status === ORDER_STATUS_RECEIVED && isSeller) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Request fund release (transaction fee applies).</p>;
                    return null;
                })()}

                {/* Confirm checkbox */}
                {needsConfirm && !isFreeOrder && (
                    <label className="mb-2 inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                        YES, I confirmed
                    </label>
                )}

                {/* Actions */}
                {!isTerminal && (
                    <div className="flex flex-wrap gap-2">
                        {!isFreeOrder && status === ORDER_STATUS_NEW && isBuyer && (
                            <button disabled={!confirmed || busy} onClick={() => act(() => escrow.deposit(props.order.id), ORDER_STATUS_DEPOSITED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Deposit
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_DEPOSITED && isSeller && (
                            <button disabled={!confirmed || busy} onClick={() => act(() => escrow.deliver(props.order.id), ORDER_STATUS_DELIVERED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Deliver
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_DELIVERED && isBuyer && (
                            <button disabled={!confirmed || busy} onClick={() => act(() => escrow.receive(props.order.id), ORDER_STATUS_RECEIVED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Receive
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_RECEIVED && isSeller && (
                            <button disabled={busy} onClick={() => act(() => escrow.release(props.order.id), ORDER_STATUS_RELEASED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Release Fund
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_NEW && (
                            <button disabled={busy} onClick={() => act(() => escrow.cancel(props.order.id), ORDER_STATUS_CANCELED)}
                                className="rounded-md border border-rose-400 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
                                Cancel
                            </button>
                        )}
                        {isSeller && (
                            <button disabled={busy} onClick={() => act(() => escrow.close(props.order.id), ORDER_STATUS_CLOSED)}
                                className="rounded-md border border-slate-400 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                Close
                            </button>
                        )}
                        <button type="button" onClick={() => setShowComment(v => !v)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                            {showComment ? 'Cancel' : 'Comment'}
                        </button>
                    </div>
                )}

                {isTerminal && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setOpenOrder(true)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                            View Details
                        </button>
                        <button type="button" onClick={() => setShowComment(v => !v)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                            {showComment ? 'Cancel' : 'Comment'}
                        </button>
                    </div>
                )}

                {showComment && (
                    <div className="mt-3">
                        <textarea
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            rows={2}
                            placeholder="Write a comment…"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                        />
                        <div className="mt-1 flex justify-end gap-2">
                            <button type="button" onClick={() => { setShowComment(false); setCommentText(''); }}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                                Cancel
                            </button>
                            <button type="button" disabled={!commentText.trim() || busy} onClick={submitComment}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Post
                            </button>
                        </div>
                    </div>
                )}

                {comments.length > 0 && (
                    <Comments comments={comments} />
                )}
            </div>

            {openOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenOrder(false)}>
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setOpenOrder(false)}
                            className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100">
                            ✕
                        </button>
                        <h3 className="mb-4 text-lg font-semibold text-slate-900">Order: {props.order.memo}</h3>
                        <OrderDetail order={props.order} />
                    </div>
                </div>
            )}
        </>
    );
}