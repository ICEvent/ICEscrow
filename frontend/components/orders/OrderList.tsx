import * as React from 'react';
import { toast } from 'react-toastify';
import moment from 'moment';

import { useEscrow } from '../Store';
import OrderListItem from './OrderListItem';
import OrderForm from './OrderForm';
import ClaimCard from './ClaimCard';
import { NewOrder, NewSellOrder } from '../../api/escrow/service.did';

export default () => {
    const escrow = useEscrow();
    const [orders, setOrders] = React.useState([])
    const [loading, setLoading] = React.useState(false)
    const [page, setPage] = React.useState(1)

    const [buyerClaims, setBuyerClaims] = React.useState<any[]>([]);
    const [sellerClaims, setSellerClaims] = React.useState<any[]>([]);
    const [claimsLoading, setClaimsLoading] = React.useState(false);

    const [openOrderForm, setOpenOrderForm] = React.useState(false);

    React.useEffect(() => {
        loadProcessingOrders();
        loadClaims();
    }, []);

    function loadProcessingOrders() {
        setLoading(true)
        escrow.getOrders().then(os => {
            setOrders(os)
            setLoading(false)
        })
    };

    function loadAllOrders() {
        setLoading(true)
        escrow.getAllOrders(BigInt(page)).then(os => {
            console.log(os)
            setOrders(os)
            setPage(page + 1)
            setLoading(false)
        })
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

    function buy(newOrder: NewOrder) {
        try {
            setLoading(true)
            escrow.buy(newOrder).then(res => {
                setLoading(false);
                if (res["ok"]) {
                    toast.success("your order has created!")
                } else {
                    toast.error(res["err"].toString());
                }
            });
            setOpenOrderForm(false);
        } catch (err) {
            toast.error(err.toString())
        };
    };

    function sell(newOrder: NewSellOrder) {
        try {
            setLoading(true)
            escrow.sell(newOrder).then(res => {
                setLoading(false);
                if (res["ok"]) {
                    toast.success("your order has created!")
                } else {
                    toast.error(res["err"].toString());
                }
            });
            setOpenOrderForm(false);
        } catch (err) {
            toast.error(err.toString())
        };
    };

    let ol = orders.map(o =>
        <OrderListItem key={o.id} order={o} />
    )

    const isClaimClosed = (claim: any): boolean => {
        const v = claim.closedAt;
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.length > 0;
        return true;
    };

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
        const closedCount = claims.filter(isClaimClosed).length;
        const visibleClaims = showClosed ? claims : claims.filter((c) => !isClaimClosed(c));

        return (
        <div className="mt-6 rounded-2xl border border-white/50 bg-white/75 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className={`text-xs font-bold uppercase tracking-[0.18em] ${accentClass}`}>{title}</p>
                <div className="flex items-center gap-2">
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
            <div className="mb-4 mt-1 rounded-2xl border border-white/50 bg-white/75 p-3 shadow-sm backdrop-blur">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Escrow Orders</p>
                <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setOpenOrderForm(true)}
                    className="btn-modern-primary commerce-gradient min-w-[160px] rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"
                >
                    Create An Order
                </button>
                <button
                    type="button"
                    onClick={loadAllOrders}
                    className="btn-modern-secondary min-w-[160px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-500 hover:text-orange-700"
                >
                    All Orders ({page})
                </button>
                </div>
            </div>

            {!loading && (
                <div className="space-y-3">
                    {ol}
                </div>
            )}

            {loading && (
                <div className="space-y-2">
                    <div className="h-8 animate-pulse rounded bg-slate-200" />
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                </div>
            )}

            <ClaimsSection
                title="My Free Item Claims (as Buyer)"
                accentClass="text-emerald-700"
                claims={buyerClaims}
                role="buyer"
                onUpdated={updateBuyerClaim}
            />

            <ClaimsSection
                title="Incoming Claims on My Items (as Seller)"
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
                        >
                            x
                        </button>
                        <h3 className="mb-4 text-lg font-semibold text-slate-900">New Escrow Contract</h3>
                        <OrderForm buy={buy} sell={sell} />
                    </div>
                </div>
            )}
        </>
    )
}
