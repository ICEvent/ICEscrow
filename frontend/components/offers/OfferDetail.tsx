import * as React from 'react';
import { useGlobalContext, useEscrow, useMenu } from '../Store';
import { toast } from 'react-toastify';
import moment from 'moment';
import { MENU_ORDERS, ORDER_DEFAULT_EXPIRED_DAYS } from '../../lib/constants';
import { currencyBase, currencySymbol } from '../../lib/currencyUtils';
import { getItemImageSrc } from '../../lib/itemImage';
import { Link } from 'react-router-dom';
import PrincipalName from '../PrincipalName';



export default (props) => {

    const { state: {
        isAuthed,
        principal
    } } = useGlobalContext();
    const escrow = useEscrow();
    const { setMenu } = useMenu();

    const [loading, setLoading] = React.useState(false);
    const [claimModalOpen, setClaimModalOpen] = React.useState(false);
    const [claimMessage, setClaimMessage] = React.useState('');
    const currency = currencySymbol(props.offer.currency);
    const [itemStatus, setItemStatus] = React.useState(Object.getOwnPropertyNames(props.offer.status)[0]);

    const base = currencyBase(props.offer.currency);
    const price = parseInt(props.offer.price) / base;
    const isFree = price === 0;

    const buyit = () => {
        if (!isAuthed) {
            toast.warn("Plseae login first");

        } else {
            setLoading(true)
            escrow.create({
                seller: props.offer.owner,
                memo: props.offer.name,
                amount: props.offer.price,
                currency: props.offer.currency,
                expiration: BigInt(moment().add(ORDER_DEFAULT_EXPIRED_DAYS, "days").unix())
            }).then(res => {
                setLoading(false)
                if (res["ok"]) {
                    toast.success("Your order has been created, check your order list!")
                } else {
                    toast.error(res["err"] ? res["err"] : "check console log for error message")
                };
                props.close ? props.close() : null;
            });
        }
    };

    const claimFree = async () => {
        if (!isAuthed) {
            toast.warn("Please login first");
            return;
        }
        setLoading(true);
        try {
            const res = await escrow.claimFreeItem(props.offer.id);
            if (res["ok"] !== undefined) {
                const claimId: bigint = res["ok"];
                if (claimMessage.trim()) {
                    try { await escrow.commentOnClaim(claimId, claimMessage.trim()); } catch (_) {}
                }
                toast.success("Claim sent! Redirecting to your claims list…");
                props.close ? props.close() : null;
                setMenu(MENU_ORDERS);
            } else {
                toast.error(res["err"] ? res["err"] : "Failed to claim item");
                props.close ? props.close() : null;
            }
        } finally {
            setLoading(false);
            setClaimModalOpen(false);
            setClaimMessage('');
        }
    };

    const holdItem = () => {
        setLoading(true)
        escrow.changeItemStatus(props.offer.id, { "pending": null }).then(res => {
            if (res["ok"]) {
                toast.success("Item set to hold")
                setItemStatus("pending")
            } else {
                toast.error(res["err"])
            };
            setLoading(false)

        })
    };

    const getOrderStatus = (order) => Object.getOwnPropertyNames(order.status)[0];

    const closeMatchingFreeOrder = async () => {
        const orders = await escrow.getOrders();
        const matchingOrder = [...orders]
            .reverse()
            .find((order) => {
                const status = getOrderStatus(order);
                return order.memo === props.offer.name
                    && order.seller.toString() === props.offer.owner.toString()
                    && order.amount === BigInt(0)
                    && status !== "closed"
                    && status !== "canceled"
                    && status !== "refunded";
            });

        if (!matchingOrder) {
            return { ok: false, err: "No matching free order found" };
        }

        return await escrow.close(matchingOrder.id);
    };

    const markSold = async () => {
        setLoading(true)
        try {
            const res = await escrow.changeItemStatus(props.offer.id, { "sold": null });
            if (res["ok"]) {
                setItemStatus("sold")

                if (isFree) {
                    const closeResult = await closeMatchingFreeOrder();
                    if (closeResult["ok"]) {
                        toast.success("Item marked as sold and order closed")
                    } else {
                        toast.warn(closeResult["err"] ? `Item marked as sold, but order close failed: ${closeResult["err"]}` : "Item marked as sold, but order was not closed")
                    }
                } else {
                    toast.success("Item marked as sold")
                }
            } else {
                toast.error(res["err"])
            };
        } finally {
            setLoading(false)
        }
    };

    const relist = () => {
        setLoading(true)
        escrow.changeItemStatus(props.offer.id, { "list": null }).then(res => {
            if (res["ok"]) {
                toast.success("Item relisted")
                setItemStatus("list")
            } else {
                toast.error(res["err"])
            };
            setLoading(false)

        })
    };

    const unlist = () => {
        setLoading(true)
        escrow.changeItemStatus(props.offer.id, { "unlist": null }).then(res => {
            if (res["ok"]) {
                toast.success("unlist this item")
                setItemStatus("unlist")
            } else {
                toast.error(res["err"])
            };
            setLoading(false)

        })
    };

    const isOwner = principal && props.offer.owner.toString() === principal.toString();
    const listedDate = moment.unix(Number(props.offer.listime) / 1000000000).format('MMMM DD, YYYY');
    const itemType = Object.getOwnPropertyNames(props.offer.itype)[0];
    const locationLabel = props.offer.location
        ? ('online' in props.offer.location ? 'Online' : `${props.offer.location.physical}`)
        : null;
    const isHeld = itemStatus === "pending";
    const isSold = itemStatus === "sold";
    const imageSrc = getItemImageSrc(props.offer);

    return (
        <>
        <div className="reveal-up relative rounded-3xl border border-white/50 bg-gradient-to-b from-white to-orange-50/30 p-4 shadow-xl sm:p-6">
            {props.close && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        props.close?.();
                    }}
                    className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close"
                >
                    x
                </button>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Item Detail</p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{props.offer.name}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-orange-500/60 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                        {itemType}
                    </span>
                    {isFree ? (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            FREE
                        </span>
                    ) : (
                        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            Escrow Protected
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
                <div className="lg:col-span-7">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <img
                            className="h-[340px] w-full bg-slate-100 object-cover sm:h-[430px]"
                            src={imageSrc}
                            alt={props.offer.name}
                        />
                    </div>

                </div>

                <div className="lg:col-span-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Description</p>
                        <p className="mt-2 mb-4 text-sm leading-7 text-slate-700">{props.offer.description || 'No description provided by seller.'}</p>

                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Price</p>
                        {isFree ? (
                            <p className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-600">FREE</p>
                        ) : (
                            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">${currency} {price}</p>
                        )}

                        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-600">Listed on: <span className="font-semibold text-slate-800">{listedDate}</span></p>
                            {locationLabel && (
                                <p className="text-xs text-slate-600">Location: <span className="font-semibold text-slate-800">{locationLabel}</span></p>
                            )}
                            <p className="text-xs text-slate-600">
                                Seller:{" "}
                                <Link className="font-semibold text-cyan-700 hover:text-cyan-800 hover:underline" to={`/userid/${props.offer.owner.toString()}`}>
                                    <PrincipalName principal={props.offer.owner} />
                                </Link>
                            </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                            {loading ? (
                                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" />
                            ) : (
                                <>
                                    {!isOwner && isFree && !isHeld && !isSold && (
                                        <button
                                            disabled={loading || !isAuthed}
                                            onClick={() => setClaimModalOpen(true)}
                                            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300"
                                        >
                                            Claim Free Item
                                        </button>
                                    )}

                                    {!isOwner && isFree && (isHeld || isSold) && (
                                        <div className="rounded-lg bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
                                            {isHeld ? "Item On Hold" : "Item Sold"}
                                        </div>
                                    )}

                                    {!isOwner && !isFree && (
                                        <button
                                            disabled={loading || !isAuthed}
                                            onClick={buyit}
                                            className="btn-modern-primary commerce-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300"
                                        >
                                            Place Escrow Order
                                        </button>
                                    )}
                                </>
                            )}

                            {!isAuthed && <p className="text-center text-xs text-slate-500">Login required to {isFree ? 'claim' : 'place an order'}.</p>}

                            {isOwner && !isHeld && !isSold && (
                                <button
                                    onClick={holdItem}
                                    className="w-full rounded-xl border border-amber-500 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                                >
                                    Hold Item
                                </button>
                            )}

                            {isOwner && isHeld && (
                                <>
                                    <button
                                        onClick={relist}
                                        className="w-full rounded-xl border border-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                    >
                                        Relist Item
                                    </button>
                                    <button
                                        onClick={markSold}
                                        className="w-full rounded-xl border border-rose-500 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                                    >
                                        Mark Sold
                                    </button>
                                </>
                            )}

                            {isOwner && isSold && (
                                <button
                                    onClick={relist}
                                    className="w-full rounded-xl border border-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                                >
                                    Relist Item
                                </button>
                            )}

                            {isOwner && (
                                <button
                                    onClick={unlist}
                                    className="btn-modern-secondary w-full rounded-xl border border-slate-400 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Remove Item
                                </button>
                            )}
                        </div>

                        {!isFree && (
                            <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">Escrow contract flow</div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">On-chain settlement</div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">Seller identity visible</div>
                                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">Transparent item terms</div>
                            </div>
                        )}

                        {isFree && (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                                Free item: claim sends a message to seller first. Seller can then create an order for you and hold this item.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {claimModalOpen && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                onClick={() => { setClaimModalOpen(false); setClaimMessage(''); }}
            >
                <div
                    className="reveal-up w-full max-w-md rounded-2xl border border-white/50 bg-white p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-bold text-slate-900">Claim Free Item</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        You're about to claim <span className="font-semibold text-slate-800">{props.offer.name}</span>.
                        Leave an optional message to the seller.
                    </p>
                    <textarea
                        className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        rows={3}
                        placeholder="Optional message to seller…"
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        maxLength={500}
                    />
                    <div className="mt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => { setClaimModalOpen(false); setClaimMessage(''); }}
                            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={claimFree}
                            className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {loading ? 'Sending…' : 'Confirm Claim'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
