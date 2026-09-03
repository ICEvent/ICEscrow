import * as React from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';

import { useEscrow, useGlobalContext } from '../Store';
import OrderDetail from './OrderDetail';
import Comments from './CommentList';
import {
    ORDER_STATUS_CANCELED,
    ORDER_STATUS_CLOSED,
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_DEPOSITED,
    ORDER_STATUS_NEW,
    ORDER_STATUS_RECEIVED,
    ORDER_STATUS_REFUNDED,
    ORDER_STATUS_RELEASED,
} from '../../lib/constants';
import {
    canCancelOrder,
    canCloseOrder,
    getOrderStatus,
    needsProgressConfirmation,
    refundModeForOrder,
} from '../../lib/orderPolicy';
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

function resultError(result: any): string {
    if (!result || result.err === undefined) return 'Action failed';
    if (typeof result.err === 'string') return result.err;
    try {
        return JSON.stringify(result.err, (_, value) => typeof value === 'bigint' ? value.toString() : value);
    } catch {
        return String(result.err);
    }
}

export default function OrderListItem(props) {
    const escrow = useEscrow();
    const { state: { principal } } = useGlobalContext();

    const [openOrder, setOpenOrder] = React.useState(false);
    const [detailOrder, setDetailOrder] = React.useState(props.order);
    const [status, setStatus] = React.useState<string>(getOrderStatus(props.order.status));
    const [confirmed, setConfirmed] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [showComment, setShowComment] = React.useState(false);
    const [commentText, setCommentText] = React.useState('');
    const [comments, setComments] = React.useState<any[]>(props.order.comments ?? []);

    const currency = currencySymbol(props.order.currency);
    const es = currencyBase(props.order.currency);
    const amount = Number(props.order.amount) / es;
    const isFreeOrder = BigInt(props.order.amount ?? 0) === 0n;
    const isBuyer = principal?.toString() === props.order.buyer.toString();
    const isSeller = principal?.toString() === props.order.seller.toString();
    const isTerminal = status === ORDER_STATUS_CLOSED || status === ORDER_STATUS_CANCELED || status === ORDER_STATUS_REFUNDED;
    const needsConfirm = !isFreeOrder && needsProgressConfirmation(status, isBuyer, isSeller);
    const canCancel = !isFreeOrder && canCancelOrder(status, isBuyer, isSeller);
    const refundMode = !isFreeOrder ? refundModeForOrder(status, isBuyer, isSeller) : null;
    const canClose = canCloseOrder(status, isSeller);

    React.useEffect(() => {
        setStatus(getOrderStatus(props.order.status));
        setComments(props.order.comments ?? []);
        setDetailOrder(props.order);
        setConfirmed(false);
    }, [props.order]);

    function applyFreshOrder(fresh: any) {
        if (!fresh) return;
        setDetailOrder(fresh);
        setStatus(getOrderStatus(fresh.status));
        setComments(fresh.comments ?? []);
        setConfirmed(false);
    }

    async function refreshSnapshot() {
        try {
            const result = await escrow.getOrder(props.order.id);
            const fresh = result?.[0];
            if (fresh) applyFreshOrder(fresh);
            return fresh ?? null;
        } catch {
            return null;
        }
    }

    async function act(
        fn: () => Promise<any>,
        nextStatus: string,
        successMessage = 'Status updated',
        confirmMessage?: string,
    ) {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        setBusy(true);
        try {
            const res = await fn();
            if (res && Object.prototype.hasOwnProperty.call(res, 'ok')) {
                toast.success(successMessage);
                setStatus(nextStatus);
                setConfirmed(false);
                await refreshSnapshot();
            } else {
                toast.error(resultError(res));
            }
        } catch (error: any) {
            toast.error(error?.message ?? 'Action failed');
        } finally {
            setBusy(false);
        }
    }

    async function openDetails() {
        setBusy(true);
        try {
            await refreshSnapshot();
        } finally {
            setBusy(false);
            setOpenOrder(true);
        }
    }

    async function submitComment() {
        const text = commentText.trim();
        if (!text) return;
        setBusy(true);
        try {
            const res = await escrow.comment(props.order.id, text);
            if (res && Object.prototype.hasOwnProperty.call(res, 'ok')) {
                toast.success('Comment posted');
                const optimistic = { user: principal, comment: text, ctime: BigInt(Date.now()) * 1_000_000n };
                setComments(prev => [...prev, optimistic]);
                setCommentText('');
                setShowComment(false);
                await refreshSnapshot();
            } else {
                toast.error(resultError(res));
            }
        } catch (error: any) {
            toast.error(error?.message ?? 'Failed to post comment');
        } finally {
            setBusy(false);
        }
    }

    const statusColor = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600 border-slate-300';

    return (
        <>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <button type="button" disabled={busy} onClick={() => void openDetails()} className="text-sm font-semibold text-orange-700 transition hover:text-orange-800 hover:underline disabled:opacity-50">
                                #{String(props.order.id)}
                            </button>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusColor}`}>{status}</span>
                        </div>
                        <p className="mt-1 truncate text-base font-semibold text-slate-900">{props.order.memo}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full border border-teal-600/50 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                        {isFreeOrder ? 'FREE' : `${amount} ${currency}`}
                    </span>
                </div>

                <p className="mb-3 text-xs text-slate-500">
                    {isBuyer ? 'You are buyer' : isSeller ? 'You are seller' : 'Participant'} · {moment.unix(Number(props.order.createtime) / 1_000_000_000).format('YYYY-MM-DD HH:mm')}
                </p>

                {!isFreeOrder && (() => {
                    if (status === ORDER_STATUS_NEW && isBuyer) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Fund escrow, then confirm the deposit. Canceling automatically attempts to return escrowed funds.</p>;
                    if (status === ORDER_STATUS_NEW && isSeller) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Waiting for buyer to fund escrow.</p>;
                    if (status === ORDER_STATUS_DEPOSITED && isSeller) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Deliver the order, or cancel and refund the buyer.</p>;
                    if (status === ORDER_STATUS_DEPOSITED && isBuyer) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Funds are secured. Waiting for seller delivery.</p>;
                    if (status === ORDER_STATUS_DELIVERED && isBuyer) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Confirm receipt only after delivery. Seller can release funds after confirmation.</p>;
                    if (status === ORDER_STATUS_RECEIVED && isSeller) return <p className="mb-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Buyer confirmed receipt. Release funds, or review refund options before settlement.</p>;
                    if (status === ORDER_STATUS_CANCELED) return <p className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">Canceled. The cancel flow already attempts an automatic buyer refund; open details only if you need to verify/recover a remaining escrow balance.</p>;
                    if (status === ORDER_STATUS_REFUNDED) return <p className="mb-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">Refund completed.</p>;
                    if (status === ORDER_STATUS_RELEASED) return <p className="mb-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Funds released to seller.</p>;
                    return null;
                })()}

                {needsConfirm && (
                    <label className="mb-2 inline-flex items-center gap-2 text-sm text-slate-700 select-none">
                        <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
                        I confirm this step
                    </label>
                )}

                {!isTerminal && (
                    <div className="flex flex-wrap gap-2">
                        {!isFreeOrder && status === ORDER_STATUS_NEW && isBuyer && (
                            <button disabled={!confirmed || busy} onClick={() => void act(() => escrow.deposit(props.order.id), ORDER_STATUS_DEPOSITED, 'Deposit confirmed')}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Confirm deposit
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_DEPOSITED && isSeller && (
                            <button disabled={!confirmed || busy} onClick={() => void act(() => escrow.deliver(props.order.id), ORDER_STATUS_DELIVERED, 'Delivery confirmed')}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Confirm delivery
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_DELIVERED && isBuyer && (
                            <button disabled={!confirmed || busy} onClick={() => void act(() => escrow.receive(props.order.id), ORDER_STATUS_RECEIVED, 'Receipt confirmed')}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Confirm received
                            </button>
                        )}
                        {!isFreeOrder && status === ORDER_STATUS_RECEIVED && isSeller && (
                            <button disabled={busy} onClick={() => void act(
                                () => escrow.release(props.order.id),
                                ORDER_STATUS_RELEASED,
                                'Funds released to seller',
                                'Release escrow funds to the seller? This is irreversible and removes the normal refund path.',
                            )}
                                className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                Release funds
                            </button>
                        )}
                        {canCancel && (
                            <button disabled={busy} onClick={() => void act(
                                () => escrow.cancel(props.order.id),
                                ORDER_STATUS_CANCELED,
                                'Order canceled; escrow refund was attempted automatically',
                                status === ORDER_STATUS_DEPOSITED
                                    ? 'Cancel this funded order and return the refundable escrow balance to the buyer?'
                                    : 'Cancel this order? If escrow already holds funds, the canister will attempt to return them to the buyer.',
                            )}
                                className="rounded-md border border-rose-400 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
                                {status === ORDER_STATUS_DEPOSITED ? 'Cancel & refund' : 'Cancel'}
                            </button>
                        )}
                        {refundMode && !canCancel && !isFreeOrder && (
                            <button type="button" disabled={busy} onClick={() => void openDetails()} className="rounded-md border border-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50">
                                Refund options
                            </button>
                        )}
                        {canClose && (
                            <button disabled={busy} onClick={() => void act(
                                () => escrow.close(props.order.id),
                                ORDER_STATUS_CLOSED,
                                'Order closed',
                                'Close this order? Review any remaining escrow balance in Details before continuing.',
                            )}
                                className="rounded-md border border-slate-400 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                                Close
                            </button>
                        )}
                        <button type="button" onClick={() => setShowComment(value => !value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                            {showComment ? 'Cancel comment' : 'Comment'}
                        </button>
                    </div>
                )}

                {isTerminal && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => void openDetails()} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
                            {status === ORDER_STATUS_CANCELED && refundMode ? 'Review refund' : 'View details'}
                        </button>
                        <button type="button" onClick={() => setShowComment(value => !value)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                            {showComment ? 'Cancel comment' : 'Comment'}
                        </button>
                    </div>
                )}

                {showComment && (
                    <div className="mt-3">
                        <textarea value={commentText} onChange={event => setCommentText(event.target.value)} rows={2} placeholder="Write a comment…" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500" />
                        <div className="mt-1 flex justify-end gap-2">
                            <button type="button" onClick={() => { setShowComment(false); setCommentText(''); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
                            <button type="button" disabled={!commentText.trim() || busy} onClick={() => void submitComment()} className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? 'Posting…' : 'Post'}</button>
                        </div>
                    </div>
                )}

                {comments.length > 0 && <Comments comments={comments} />}
            </div>

            {openOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenOrder(false)}>
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl" onClick={event => event.stopPropagation()}>
                        <button type="button" onClick={() => setOpenOrder(false)} className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100">✕</button>
                        <OrderDetail order={detailOrder} onChanged={applyFreshOrder} />
                    </div>
                </div>
            )}
        </>
    );
}
