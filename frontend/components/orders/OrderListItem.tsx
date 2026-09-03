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

    const needsAction = !isFreeOrder && (
        needsConfirm ||
        (status === ORDER_STATUS_RECEIVED && isSeller) ||
        (status === ORDER_STATUS_RELEASED && isSeller)
    );

    const confirmationText = (() => {
        if (status === ORDER_STATUS_NEW && isBuyer) {
            return `I’m ready to deposit ${amount} ${currency} into escrow.`;
        }
        if (status === ORDER_STATUS_DEPOSITED && isSeller) {
            return `I have delivered “${props.order.memo}” to the buyer.`;
        }
        if (status === ORDER_STATUS_DELIVERED && isBuyer) {
            return `I received “${props.order.memo}” and understand this confirmation allows the seller to request payout.`;
        }
        return '';
    })();

    async function act(fn: () => Promise<any>, nextStatus: string) {
        setBusy(true);
        try {
            const res = await fn();
            if (res['ok'] !== undefined) {
                toast.success('Order updated');
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
            <div className={`rounded-xl border bg-white p-4 shadow-sm ${needsAction ? 'border-orange-300 ring-1 ring-orange-100' : 'border-slate-200'}`}>
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
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
                            {needsAction && (
                                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    Action required
                                </span>
                            )}
                        </div>
                        <p className="mt-1 truncate text-base font-semibold text-slate-900">{props.order.memo}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full border border-teal-600/50 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                        {isFreeOrder ? 'FREE' : `${amount} ${currency}`}
                    </span>
                </div>

                <p className="mb-3 text-xs text-slate-500">
                    {isBuyer ? 'You are buyer' : isSeller ? 'You are seller' : 'Participant'} · {moment.unix(parseInt(props.order.createtime) / 1_000_000_000).format('YYYY-MM-DD HH:mm')}
                </p>

                {!isFreeOrder && !isTerminal && (() => {
                    if (status === ORDER_STATUS_NEW && isBuyer) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Next: deposit {amount} {currency} into escrow to fund this order.</p>;
                    if (status === ORDER_STATUS_NEW && isSeller) return <p className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Waiting for the buyer to fund escrow.</p>;
                    if (status === ORDER_STATUS_DEPOSITED && isSeller) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Next: deliver “{props.order.memo}”, then confirm delivery here.</p>;
                    if (status === ORDER_STATUS_DEPOSITED && isBuyer) return <p className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Escrow is funded. Waiting for the seller to deliver.</p>;
                    if (status === ORDER_STATUS_DELIVERED && isBuyer) return <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Next: confirm receipt only after you have received the item or service.</p>;
                    if (status === ORDER_STATUS_DELIVERED && isSeller) return <p className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Waiting for the buyer to confirm receipt.</p>;
                    if (status === ORDER_STATUS_RECEIVED && isSeller) return <p className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Buyer confirmed receipt. You can now request release of the escrowed funds.</p>;
                    if (status === ORDER_STATUS_RECEIVED && isBuyer) return <p className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">Receipt confirmed. Waiting for the seller to request payout.</p>;
                    if (status === ORDER_STATUS_RELEASED && isSeller) return <p className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Funds were released. Close the order when everything is complete.</p>;
                    return null;
                })()}

                {needsConfirm && !isFreeOrder && (
                    <label className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 select-none">
                        <input className="mt-0.5" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                        <span>{confirmationText}</span>
                    </label>
                )}

                {!isTerminal && (
                    <div className="flex flex-wrap gap-2">
                        {!isFreeOrder && status === ORDER_STATUS_NEW && isBuyer && (
                            <button disabled={!confirmed || busy} onClick={() => act(() => escrow.deposit(props.order.id), ORDER_STATUS_DEPOSITED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Deposit to Escrow
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_DEPOSITED && isSeller && (
                            <button disabled={!confirmed || busy} onClick={() => act(() => escrow.deliver(props.order.id), ORDER_STATUS_DELIVERED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Confirm Delivery
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_DELIVERED && isBuyer && (
                            <button disabled={!confirmed || busy} onClick={() => act(() => escrow.receive(props.order.id), ORDER_STATUS_RECEIVED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Confirm Receipt
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_RECEIVED && isSeller && (
                            <button disabled={busy} onClick={() => act(() => escrow.release(props.order.id), ORDER_STATUS_RELEASED)}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Release Funds
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_NEW && (
                            <button disabled={busy} onClick={() => act(() => escrow.cancel(props.order.id), ORDER_STATUS_CANCELED)}
                                className="rounded-md border border-rose-400 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
                                Cancel Order
                            </button>
                        )}
                        {isSeller && (isFreeOrder || status === ORDER_STATUS_RELEASED) && (
                            <button disabled={busy} onClick={() => act(() => escrow.close(props.order.id), ORDER_STATUS_CLOSED)}
                                className="rounded-md border border-slate-400 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                Close Order
                            </button>
                        )}
                        <button type="button" onClick={() => setShowComment(v => !v)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                            {showComment ? 'Cancel Comment' : 'Comment'}
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
                            {showComment ? 'Cancel Comment' : 'Comment'}
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
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setOpenOrder(false)}
                            className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100"
                            aria-label="Close order details">
                            ✕
                        </button>
                        <h3 className="mb-4 pr-10 text-lg font-semibold text-slate-900">Order: {props.order.memo}</h3>
                        <OrderDetail order={props.order} />
                    </div>
                </div>
            )}
        </>
    );
}
