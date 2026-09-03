import * as React from 'react';
import moment from 'moment';
import { toast } from 'react-toastify';

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
    orderProgressStep,
    refundModeForOrder,
} from '../../lib/orderPolicy';
import { currencySymbol } from '../../lib/currencyUtils';
import { useEscrow, useGlobalContext, useLoading } from '../Store';
import PrincipalName from '../PrincipalName';
import CommentButton from './CommentButton';
import Comments from './CommentList';
import ReviewForm from '../profile/ReviewForm';

type PendingAction = 'cancel' | 'refund' | 'release' | 'close' | null;

const STATUS_STYLES: Record<string, string> = {
    new: 'border-sky-200 bg-sky-50 text-sky-700',
    deposited: 'border-blue-200 bg-blue-50 text-blue-700',
    delivered: 'border-amber-200 bg-amber-50 text-amber-700',
    received: 'border-violet-200 bg-violet-50 text-violet-700',
    released: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    canceled: 'border-rose-200 bg-rose-50 text-rose-700',
    refunded: 'border-orange-200 bg-orange-50 text-orange-700',
    closed: 'border-slate-200 bg-slate-100 text-slate-600',
};

function currencyDecimals(currency: Record<string, any>): number {
    const key = Object.keys(currency)[0];
    if (key === 'ICP') return 8;
    if (key === 'ICET') return 6;
    if (key === 'ICRC1') return Number(currency.ICRC1?.decimals ?? 8);
    return 8;
}

function formatUnits(raw: bigint | number | string, decimals: number, maxFractionDigits = 8): string {
    try {
        const value = BigInt(raw);
        const safeDecimals = Math.max(0, Math.min(decimals, 30));
        const scale = 10n ** BigInt(safeDecimals);
        const whole = value / scale;
        const fractionUnits = value % scale;
        const groupedWhole = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(whole);
        if (fractionUnits === 0n || safeDecimals === 0) return groupedWhole;
        const fraction = fractionUnits
            .toString()
            .padStart(safeDecimals, '0')
            .slice(0, Math.min(safeDecimals, maxFractionDigits))
            .replace(/0+$/, '');
        return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
    } catch {
        return 'Unavailable';
    }
}

function rawBalance(result: any): bigint {
    if (result && result.e8s !== undefined) return BigInt(result.e8s);
    if (result && result.e6s !== undefined) return BigInt(result.e6s);
    throw new Error('Escrow returned an unsupported balance response.');
}

function resultError(result: any): string {
    if (!result || result.err === undefined) return 'Action failed';
    if (typeof result.err === 'string') return result.err;
    try {
        return JSON.stringify(result.err, (_, value) => typeof value === 'bigint' ? value.toString() : value);
    } catch {
        return String(result.err);
    }
}

function ConfirmAction({
    open,
    title,
    description,
    confirmLabel,
    danger = false,
    busy,
    onCancel,
    onConfirm,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onCancel}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Keep order
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onConfirm}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-cyan-700 hover:bg-cyan-800'}`}
                    >
                        {busy ? 'Submitting…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function OrderDetail(props) {
    const { state: { principal } } = useGlobalContext();
    const escrow = useEscrow();
    const { setLoading } = useLoading();

    const [order, setOrder] = React.useState(props.order);
    const [comments, setComments] = React.useState(props.order.comments ?? []);
    const [status, setStatus] = React.useState<string>(getOrderStatus(props.order.status));
    const [confirmed, setConfirmed] = React.useState(false);
    const [balance, setBalance] = React.useState<bigint | null>(null);
    const [balanceLoading, setBalanceLoading] = React.useState(false);
    const [balanceError, setBalanceError] = React.useState('');
    const [busyAction, setBusyAction] = React.useState<string>('');
    const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);
    const [reviewSubmitted, setReviewSubmitted] = React.useState(false);

    const principalText = principal?.toString?.() ?? '';
    const isBuyer = principalText === order.buyer.toString();
    const isSeller = principalText === order.seller.toString();
    const decimals = currencyDecimals(order.currency);
    const currency = currencySymbol(order.currency);
    const amountRaw = BigInt(order.amount ?? 0);
    const isFreeOrder = amountRaw === 0n;
    const amountLabel = isFreeOrder ? 'FREE' : `${formatUnits(amountRaw, decimals)} ${currency}`;
    const balanceLabel = balance === null ? 'Unavailable' : `${formatUnits(balance, decimals)} ${currency}`;
    const hasEscrowBalance = balance !== null && balance > 0n;
    const canCancel = !isFreeOrder && canCancelOrder(status, isBuyer, isSeller);
    const refundMode = isFreeOrder ? null : refundModeForOrder(status, isBuyer, isSeller);
    const canStandaloneRefund = Boolean(refundMode && hasEscrowBalance && !canCancel);
    const canClose = canCloseOrder(status, isSeller);
    const needsConfirm = !isFreeOrder && needsProgressConfirmation(status, isBuyer, isSeller);
    const activeStep = orderProgressStep(status);
    const statusStyle = STATUS_STYLES[status] ?? 'border-slate-200 bg-slate-50 text-slate-600';

    React.useEffect(() => {
        setOrder(props.order);
        setComments(props.order.comments ?? []);
        setStatus(getOrderStatus(props.order.status));
        setConfirmed(false);
    }, [props.order]);

    const refreshOrder = React.useCallback(async () => {
        try {
            const response = await escrow.getOrder(order.id);
            const fresh = response?.[0];
            if (fresh) {
                setOrder(fresh);
                setComments(fresh.comments ?? []);
                setStatus(getOrderStatus(fresh.status));
                setConfirmed(false);
                props.onChanged?.(fresh);
                return fresh;
            }
        } catch {
            // A successful mutation should not be reported as failed only because refresh failed.
        }
        return null;
    }, [escrow, order.id, props]);

    const refreshBalance = React.useCallback(async () => {
        if (isFreeOrder) {
            setBalance(0n);
            setBalanceError('');
            return;
        }
        setBalanceLoading(true);
        setBalanceError('');
        try {
            const result = await escrow.getOrderBalance(order.id);
            setBalance(rawBalance(result));
        } catch (error: any) {
            setBalance(null);
            setBalanceError(error?.message ?? 'Unable to load escrow balance.');
        } finally {
            setBalanceLoading(false);
        }
    }, [escrow, isFreeOrder, order.id]);

    React.useEffect(() => {
        void refreshBalance();
    }, [refreshBalance, status]);

    async function runAction(
        actionName: string,
        fn: () => Promise<any>,
        successMessage: string,
        fallbackStatus?: string,
    ) {
        setBusyAction(actionName);
        setLoading(true);
        try {
            const result = await fn();
            if (result && Object.prototype.hasOwnProperty.call(result, 'ok')) {
                if (fallbackStatus) setStatus(fallbackStatus);
                setConfirmed(false);
                setPendingAction(null);
                toast.success(successMessage);
                await refreshOrder();
                await refreshBalance();
                return true;
            }
            toast.error(resultError(result));
            return false;
        } catch (error: any) {
            toast.error(error?.message ?? 'Action failed');
            return false;
        } finally {
            setBusyAction('');
            setLoading(false);
        }
    }

    const deposit = () => runAction('deposit', () => escrow.deposit(order.id), 'Deposit confirmed.', ORDER_STATUS_DEPOSITED);
    const deliver = () => runAction('deliver', () => escrow.deliver(order.id), 'Delivery confirmed.', ORDER_STATUS_DELIVERED);
    const receive = () => runAction('receive', () => escrow.receive(order.id), 'Receipt confirmed.', ORDER_STATUS_RECEIVED);
    const release = () => runAction('release', () => escrow.release(order.id), 'Funds released to seller.', ORDER_STATUS_RELEASED);
    const cancelOrder = () => runAction(
        'cancel',
        () => escrow.cancel(order.id),
        'Order canceled. Any refundable escrow balance was returned to the buyer by the canister.',
        ORDER_STATUS_CANCELED,
    );
    const refund = () => runAction(
        'refund',
        () => escrow.refund(order.id),
        'Refund submitted. The escrow balance has been returned to the buyer, less applicable ledger fees.',
    );
    const closeOrder = () => runAction('close', () => escrow.close(order.id), 'Order closed.', ORDER_STATUS_CLOSED);

    function actionDialogCopy() {
        if (pendingAction === 'cancel') {
            return {
                title: status === ORDER_STATUS_DEPOSITED ? 'Cancel and refund buyer?' : 'Cancel this order?',
                description: status === ORDER_STATUS_DEPOSITED
                    ? `The canister will cancel the order and attempt to return the current escrow balance (${balanceLabel}) to the buyer. Ledger fees may apply.`
                    : `If funds are already in escrow, cancellation automatically attempts to return the refundable balance to the buyer. Current escrow balance: ${balanceLabel}.`,
                confirmLabel: status === ORDER_STATUS_DEPOSITED ? 'Cancel & refund' : 'Cancel order',
                danger: true,
                run: cancelOrder,
            };
        }
        if (pendingAction === 'refund') {
            return {
                title: refundMode === 'buyer_recovery' ? 'Recover remaining escrow balance?' : 'Refund buyer?',
                description: `Return the current escrow balance (${balanceLabel}) to the buyer. The canister deducts applicable ledger fees. This transfer cannot be undone.`,
                confirmLabel: refundMode === 'buyer_recovery' ? 'Recover balance' : 'Refund buyer',
                danger: true,
                run: refund,
            };
        }
        if (pendingAction === 'release') {
            return {
                title: 'Release funds to seller?',
                description: `Release the remaining escrow balance to the seller. Once released, this order is no longer refundable through the normal refund path.`,
                confirmLabel: 'Release funds',
                danger: false,
                run: release,
            };
        }
        if (pendingAction === 'close') {
            return {
                title: 'Close this order?',
                description: `Closing finalizes this workflow. Review the escrow balance (${balanceLabel}) before continuing; any remaining funds are handled by the canister's close logic.`,
                confirmLabel: 'Close order',
                danger: false,
                run: closeOrder,
            };
        }
        return null;
    }

    const dialog = actionDialogCopy();

    return (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-950">Order #{String(order.id)}</h2>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle}`}>{status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Created {moment.unix(Number(order.createtime) / 1_000_000_000).format('YYYY-MM-DD HH:mm')}</p>
                    {order.memo && <p className="mt-2 text-sm font-medium text-slate-700">{order.memo}</p>}
                </div>
                <div className="rounded-xl bg-slate-950 px-4 py-3 text-right text-white">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Order amount</div>
                    <div className="mt-1 text-lg font-semibold">{amountLabel}</div>
                </div>
            </div>

            <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Buyer</div>
                    <div className="mt-2 text-sm text-slate-800"><PrincipalName principal={order.buyer} /> {isBuyer && <span className="text-xs text-cyan-700">(you)</span>}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Seller</div>
                    <div className="mt-2 text-sm text-slate-800"><PrincipalName principal={order.seller} /> {isSeller && <span className="text-xs text-cyan-700">(you)</span>}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Escrow balance</div>
                        {!isFreeOrder && (
                            <button type="button" disabled={balanceLoading} onClick={() => void refreshBalance()} className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 disabled:opacity-50">
                                {balanceLoading ? 'Checking…' : 'Refresh'}
                            </button>
                        )}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">{isFreeOrder ? 'No funds required' : balanceLoading && balance === null ? 'Checking…' : balanceLabel}</div>
                </div>
            </section>

            {!isFreeOrder && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Refund protection</h3>
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                                Cancel and refund are different actions. Canceling an eligible order automatically attempts to return its escrow balance to the buyer. A separate refund action is shown only when a balance still exists and the current role/status allows it.
                            </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Destination: buyer</span>
                    </div>

                    {balanceError && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{balanceError} Refresh the balance before attempting a refund.</div>}

                    {status === ORDER_STATUS_CANCELED && !balanceLoading && balance === 0n && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
                            No escrow balance remains. The cancel flow has already completed its refund path.
                        </div>
                    )}

                    {status === ORDER_STATUS_REFUNDED && (
                        <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">This order is already marked refunded. No additional refund action is available.</div>
                    )}

                    {refundMode === 'seller_refund' && !canCancel && hasEscrowBalance && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3">
                            <div>
                                <div className="text-sm font-semibold text-rose-900">Refund available</div>
                                <div className="mt-0.5 text-xs text-rose-700">As seller, you can return the remaining escrow balance to the buyer before settlement.</div>
                            </div>
                            <button type="button" disabled={Boolean(busyAction)} onClick={() => setPendingAction('refund')} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Refund buyer</button>
                        </div>
                    )}

                    {refundMode === 'buyer_recovery' && !canCancel && hasEscrowBalance && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                            <div>
                                <div className="text-sm font-semibold text-amber-900">Residual escrow balance detected</div>
                                <div className="mt-0.5 text-xs text-amber-700">The order is canceled but funds still remain in escrow. You can retry recovery to the buyer account.</div>
                            </div>
                            <button type="button" disabled={Boolean(busyAction)} onClick={() => setPendingAction('refund')} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">Recover balance</button>
                        </div>
                    )}
                </section>
            )}

            <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">Order progress</p>
                    <span className="text-xs font-medium capitalize text-slate-500">{status}</span>
                </div>
                {isFreeOrder ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <p className="font-semibold">Free item claim</p>
                        <p className="mt-1 text-xs leading-5">{isSeller ? 'Go back to the item to set Hold, Sold, or Relist.' : 'Waiting for the seller to update the item status.'}</p>
                    </div>
                ) : status === ORDER_STATUS_CANCELED || status === ORDER_STATUS_REFUNDED ? (
                    <div className={`rounded-xl border px-4 py-3 text-sm ${statusStyle}`}>
                        <div className="font-semibold capitalize">{status}</div>
                        <div className="mt-1 text-xs leading-5">{status === ORDER_STATUS_CANCELED ? 'The order was canceled. Any remaining escrow balance can only be recovered through the refund path above.' : 'The escrow refund path has been completed for this order.'}</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                        {[
                            { label: 'New', step: 1 },
                            { label: 'Deposited', step: 2 },
                            { label: 'Delivered', step: 3 },
                            { label: 'Received', step: 4 },
                            { label: 'Complete', step: 5 },
                        ].map(step => (
                            <div key={step.step} className={`rounded-lg px-3 py-2 text-center font-medium ${activeStep >= step.step ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{step.label}</div>
                        ))}
                    </div>
                )}
            </section>

            {!isFreeOrder && (
                <section className="space-y-3">
                    {status === ORDER_STATUS_NEW && isBuyer && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Deposit {amountLabel} to the escrow account, then confirm the deposit. Canceling at this stage automatically attempts to return any escrowed funds.</div>}
                    {status === ORDER_STATUS_NEW && isSeller && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Waiting for the buyer to fund escrow.</div>}
                    {status === ORDER_STATUS_DEPOSITED && isSeller && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Confirm delivery, or cancel the order to return the escrow balance to the buyer.</div>}
                    {status === ORDER_STATUS_DEPOSITED && isBuyer && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Funds are secured in escrow. Waiting for the seller to deliver.</div>}
                    {status === ORDER_STATUS_DELIVERED && isBuyer && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Confirm only after you received the item/service. This moves the order to Received; the seller can then release or refund the escrowed funds.</div>}
                    {status === ORDER_STATUS_RECEIVED && isSeller && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">The buyer confirmed receipt. You may release funds to yourself or refund the remaining escrow balance to the buyer.</div>}
                    {status === ORDER_STATUS_RELEASED && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Funds have been released to the seller. The normal refund path is no longer available.</div>}
                    {status === ORDER_STATUS_CLOSED && <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">This order is closed.</div>}

                    {needsConfirm && (
                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
                            I reviewed the order state and confirm this action.
                        </label>
                    )}
                </section>
            )}

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {!isFreeOrder && status === ORDER_STATUS_NEW && isBuyer && (
                    <button type="button" disabled={!confirmed || Boolean(busyAction)} onClick={() => void deposit()} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busyAction === 'deposit' ? 'Confirming…' : 'Confirm deposit'}</button>
                )}
                {!isFreeOrder && status === ORDER_STATUS_DEPOSITED && isSeller && (
                    <button type="button" disabled={!confirmed || Boolean(busyAction)} onClick={() => void deliver()} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busyAction === 'deliver' ? 'Confirming…' : 'Confirm delivery'}</button>
                )}
                {!isFreeOrder && status === ORDER_STATUS_DELIVERED && isBuyer && (
                    <button type="button" disabled={!confirmed || Boolean(busyAction)} onClick={() => void receive()} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busyAction === 'receive' ? 'Confirming…' : 'Confirm received'}</button>
                )}
                {!isFreeOrder && status === ORDER_STATUS_RECEIVED && isSeller && (
                    <button type="button" disabled={Boolean(busyAction)} onClick={() => setPendingAction('release')} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50">Release funds</button>
                )}
                {canCancel && (
                    <button type="button" disabled={Boolean(busyAction)} onClick={() => setPendingAction('cancel')} className="rounded-lg border border-rose-400 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                        {status === ORDER_STATUS_DEPOSITED ? 'Cancel & refund buyer' : 'Cancel order'}
                    </button>
                )}
                {canClose && (
                    <button type="button" disabled={Boolean(busyAction)} onClick={() => setPendingAction('close')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Close order</button>
                )}
                <CommentButton id={order.id} reload={() => void refreshOrder()} />
            </div>

            {!isFreeOrder && (
                <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <summary className="cursor-pointer font-semibold text-slate-700">Escrow account details</summary>
                    <div className="mt-2 break-all font-mono">{order.account.id}</div>
                    <div className="mt-1 text-slate-500">Refunds and releases are executed by the escrow canister. Applicable ledger/network fees are deducted according to the canister logic.</div>
                </details>
            )}

            <Comments comments={comments} />

            {status === ORDER_STATUS_RELEASED && !isFreeOrder && isBuyer && !reviewSubmitted && (
                <ReviewForm orderId={order.id} onSubmitted={() => setReviewSubmitted(true)} />
            )}

            {dialog && (
                <ConfirmAction
                    open={Boolean(pendingAction)}
                    title={dialog.title}
                    description={dialog.description}
                    confirmLabel={dialog.confirmLabel}
                    danger={dialog.danger}
                    busy={Boolean(busyAction)}
                    onCancel={() => !busyAction && setPendingAction(null)}
                    onConfirm={() => void dialog.run()}
                />
            )}
        </div>
    );
}
