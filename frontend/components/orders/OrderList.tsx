import * as React from 'react';
import { toast } from 'react-toastify';

import { useEscrow, useGlobalContext } from '../Store';
import OrderListItem from './OrderListItem';
import OrderForm from './OrderForm';
import ClaimCard from './ClaimCard';
import { NewOrder, NewSellOrder } from '../../api/escrow/service.did';
import {
    ORDER_STATUS_NEW,
    ORDER_STATUS_DEPOSITED,
    ORDER_STATUS_DELIVERED,
    ORDER_STATUS_RECEIVED,
    ORDER_STATUS_RELEASED,
    ORDER_STATUS_REFUNDED,
    ORDER_STATUS_CLOSED,
    ORDER_STATUS_CANCELED,
} from '../../lib/constants';

const PAGE_SIZE = 20;

export default () => {
    const escrow = useEscrow();
    const { state: { principal } } = useGlobalContext();
    const [orders, setOrders] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)
    const [page, setPage] = React.useState(1)
    const [hasOlderOrders, setHasOlderOrders] = React.useState(true)

    const [buyerClaims, setBuyerClaims] = React.useState<any[]>([]);
    const [sellerClaims, setSellerClaims] = React.useState<any[]>([]);
    const [claimsLoading, setClaimsLoading] = React.useState(false);

    const [openOrderForm, setOpenOrderForm] = React.useState(false);
    const [statusFilter, setStatusFilter] = React.useState<string>('action');

    const STATUS_FILTERS = [
        { label: 'Needs You', value: 'action' },
        { label: 'All', value: 'all' },
        { label: 'New', value: ORDER_STATUS_NEW },
        { label: 'Deposited', value: ORDER_STATUS_DEPOSITED },
        { label: 'Delivered', value: ORDER_STATUS_DELIVERED },
        { label: 'Received', value: ORDER_STATUS_RECEIVED },
        { label: 'Released', value: ORDER_STATUS_RELEASED },
        { label: 'Closed', value: ORDER_STATUS_CLOSED },
        { label: 'Canceled', value: ORDER_STATUS_CANCELED },
        { label: 'Refunded', value: ORDER_STATUS_REFUNDED },
    ];

    const getStatus = React.useCallback((order: any) => Object.getOwnPropertyNames(order.status)[0], []);

    const isTerminalOrder = React.useCallback((order: any) => {
        const status = getStatus(order);
        return status === ORDER_STATUS_CLOSED
            || status === ORDER_STATUS_CANCELED
            || status === ORDER_STATUS_REFUNDED;
    }, [getStatus]);

    const needsUserAction = React.useCallback((order: any) => {
        if (!principal || order.amount === BigInt(0)) return false;
        const status = getStatus(order);
        const isBuyer = order.buyer.toString() === principal.toString();
        const isSeller = order.seller.toString() === principal.toString();

        return (status === ORDER_STATUS_NEW && isBuyer)
            || (status === ORDER_STATUS_DEPOSITED && isSeller)
            || (status === ORDER_STATUS_DELIVERED && isBuyer)
            || (status === ORDER_STATUS_RECEIVED && isSeller)
            || (status === ORDER_STATUS_RELEASED && isSeller);
    }, [getStatus, principal]);

    const isClaimResolved = React.useCallback((claim: any): boolean => {
        const isOptSet = (v: any) => v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0);
        return isOptSet(claim.closedAt) || isOptSet(claim.canceledAt);
    }, []);

    React.useEffect(() => {
        loadProcessingOrders();
        loadClaims();
    }, []);

    async function loadProcessingOrders() {
        setLoading(true)
        try {
            const os = await escrow.getOrders();
            setOrders(os)
        } catch (err) {
            toast.error(err?.toString() ?? 'Failed to load orders');
        } finally {
            setLoading(false)
        }
    };

    async function loadAllOrders() {
        setLoading(true)
        try {
            const os = await escrow.getAllOrders(BigInt(page));
            setOrders((previous) => {
                const byId = new Map(previous.map((order: any) => [order.id.toString(), order]));
                os.forEach((order: any) => byId.set(order.id.toString(), order));
                return Array.from(byId.values());
            });
            setPage((current) => current + 1)
            setHasOlderOrders(os.length === PAGE_SIZE)
        } catch (err) {
            toast.error(err?.toString() ?? 'Failed to load older orders');
        } finally {
            setLoading(false)
        }
    };

    function loadClaims() {
        setClaimsLoading(true);
        Promise.allSettled([
            escrow.getMyBuyerFreeItemClaims(),
            escrow.getMyFreeItemClaims(),
        ]).then(([buyerResult, sellerResult]) => {
            if (buyerResult.status === 'fulfilled') {
                setBuyerClaims(buyerResult.value.sort((a: any, b: any) => Number(b.ctime) - Number(a.ctime)));
            } else {
                toast.error('Failed to load your claims');
            }
            if (sellerResult.status === 'fulfilled') {
                setSellerClaims(sellerResult.value.sort((a: any, b: any) => Number(b.ctime) - Number(a.ctime)));
            } else {
                toast.error('Failed to load incoming claims');
            }
            setClaimsLoading(false);
        });
    }

    const updateBuyerClaim = (updated: any) => {
        setBuyerClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    };

    const updateSellerClaim = (updated: any) => {
        setSellerClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    };

    async function buy(newOrder: NewOrder) {
        setLoading(true)
        try {
            const res = await escrow.buy(newOrder);
            if (res["ok"] !== undefined) {
                toast.success("Order created. Next action is shown below.")
                setOpenOrderForm(false)
                setStatusFilter('action')
                await loadProcessingOrders()
            } else {
                toast.error(res["err"]?.toString() ?? 'Failed to create order');
            }
        } catch (err) {
            toast.error(err?.toString() ?? 'Failed to create order')
        } finally {
            setLoading(false)
        }
    };

    async function sell(newOrder: NewSellOrder) {
        setLoading(true)
        try {
            const res = await escrow.sell(newOrder);
            if (res["ok"] !== undefined) {
                toast.success("Order created. Next action is shown below.")
                setOpenOrderForm(false)
                setStatusFilter('action')
                await loadProcessingOrders()
            } else {
                toast.error(res["err"]?.toString() ?? 'Failed to create order');
            }
        } catch (err) {
            toast.error(err?.toString() ?? 'Failed to create order')
        } finally {
            setLoading(false)
        }
    };

    const needsActionCount = orders.filter(needsUserAction).length;
    const openOrderCount = orders.filter((order) => !isTerminalOrder(order)).length;
    const waitingOrderCount = Math.max(0, openOrderCount - needsActionCount);
    const completeOrderCount = orders.filter(isTerminalOrder).length;
    const openIncomingClaims = sellerClaims.filter((claim) => !isClaimResolved(claim)).length;
    const openBuyerClaims = buyerClaims.filter((claim) => !isClaimResolved(claim)).length;

    const filteredOrders = statusFilter === 'action'
        ? orders.filter(needsUserAction)
        : statusFilter === 'all'
            ? orders
            : orders.filter((o: any) => getStatus(o) === statusFilter);

    const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
        const actionDelta = Number(needsUserAction(b)) - Number(needsUserAction(a));
        if (actionDelta !== 0) return actionDelta;
        return Number(b.createtime) - Number(a.createtime);
    });

    const ClaimsSection = ({
        title,
        accentClass,
        claims,
        role,
        onUpdated,
    }: {
        title: string;
        accentClass: string;
        claims: any[];
        role: 'buyer' | 'seller';
        onUpdated: (u: any) => void;
    }) => {
        const [showClosed, setShowClosed] = React.useState(false);
        const closedCount = claims.filter(isClaimResolved).length;
        const visibleClaims = showClosed ? claims : claims.filter((c) => !isClaimResolved(c));

        return (
        <div className="mt-6 rounded-2xl border border-white/50 bg-white/75 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className={`text-xs font-bold uppercase tracking-[0.18em] ${accentClass}`}>{title}</p>
                    <p className="mt-1 text-xs text-slate-500">Open requests stay visible until they are resolved.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {claims.length > 0 && (
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                            {claims.length}
                        </span>
                    )}
                    {closedCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowClosed((v) => !v)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-700"
                        >
                            {showClosed ? 'Hide closed' : `Show closed (${closedCount})`}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={loadClaims}
                        disabled={claimsLoading}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-orange-400 hover:text-orange-700 disabled:opacity-40"
                    >
                        Refresh
                    </button>
                </div>
            </div>
            {claimsLoading && (
                <div className="h-8 animate-pulse rounded bg-slate-200" />
            )}
            {!claimsLoading && visibleClaims.length === 0 && (
                <p className="text-sm text-slate-500">
                    {claims.length === 0 ? 'No claims here yet.' : 'No open claims. Use "Show closed" to view resolved claims.'}
                </p>
            )}
            {!claimsLoading && visibleClaims.length > 0 && (
                <div className="space-y-2">
                    {visibleClaims.map((claim) => (
                        <ClaimCard
                            key={String(claim.id)}
                            claim={claim}
                            role={role}
                            onUpdated={onUpdated}
                        />
                    ))}
                </div>
            )}
        </div>
        );
    };

    return (
        <>
            <section className="mb-4 mt-1 rounded-3xl border border-white/50 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Order Action Center</p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">What needs your attention</h1>
                        <p className="mt-1 text-sm text-slate-600">Vansday puts the next required action first and keeps protocol status in the background.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setOpenOrderForm(true)}
                            className="btn-modern-primary commerce-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                        >
                            Create Order
                        </button>
                        <button
                            type="button"
                            onClick={() => { loadProcessingOrders(); loadClaims(); }}
                            disabled={loading || claimsLoading}
                            className="btn-modern-secondary rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:opacity-50"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('action')}
                        className={`rounded-2xl border p-3 text-left transition ${statusFilter === 'action' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300'}`}
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Needs you</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">{needsActionCount + openIncomingClaims}</p>
                        <p className="mt-1 text-xs text-slate-500">Orders and incoming claims requiring action</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Waiting</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">{waitingOrderCount + openBuyerClaims}</p>
                        <p className="mt-1 text-xs text-slate-500">Waiting on the other party</p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter(ORDER_STATUS_CLOSED)}
                        className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Complete</p>
                        <p className="mt-1 text-2xl font-extrabold text-slate-900">{completeOrderCount}</p>
                        <p className="mt-1 text-xs text-slate-500">Loaded closed, canceled, or refunded orders</p>
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => setStatusFilter(f.value)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                                statusFilter === f.value
                                    ? 'bg-orange-500 text-white'
                                    : 'border border-slate-300 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-700'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </section>

            {!loading && sortedOrders.length > 0 && (
                <div className="space-y-3">
                    {sortedOrders.map((order) => (
                        <OrderListItem key={order.id.toString()} order={order} />
                    ))}
                </div>
            )}

            {!loading && sortedOrders.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-sm">
                    <p className="text-sm font-semibold text-slate-700">
                        {statusFilter === 'action' ? 'Nothing needs your action right now.' : 'No orders match this filter.'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {statusFilter === 'action' ? 'You’re caught up. Waiting orders and claims are still available below.' : 'Try another status or load older orders.'}
                    </p>
                </div>
            )}

            {loading && (
                <div className="space-y-2">
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                </div>
            )}

            {hasOlderOrders && (
                <div className="mt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={loadAllOrders}
                        disabled={loading}
                        className="btn-modern-secondary rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-500 hover:text-orange-700 disabled:opacity-50"
                    >
                        Load Older Orders
                    </button>
                </div>
            )}

            <ClaimsSection
                title="My Free Item Claims"
                accentClass="text-emerald-700"
                claims={buyerClaims}
                role="buyer"
                onUpdated={updateBuyerClaim}
            />

            <ClaimsSection
                title="Incoming Claims on My Items"
                accentClass="text-blue-700"
                claims={sellerClaims}
                role="seller"
                onUpdated={updateSellerClaim}
            />

            {openOrderForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenOrderForm(false)}>
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/40 bg-white/95 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setOpenOrderForm(false)}
                            className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100"
                            aria-label="Close order form"
                        >
                            ×
                        </button>
                        <h3 className="mb-1 text-lg font-semibold text-slate-900">New Escrow Contract</h3>
                        <p className="mb-4 text-sm text-slate-500">Create the agreement, then Vansday will guide each participant through the next action.</p>
                        <OrderForm buy={buy} sell={sell} />
                    </div>
                </div>
            )}
        </>
    )
}
