import * as React from 'react';
import { useGlobalContext, useEscrow } from '../Store';
import { toast } from 'react-toastify';
import moment from 'moment';
import { CURRENCY_ICET, CURRENCY_ICP, LEDGER_E6S, LEDGER_E8S, ORDER_DEFAULT_EXPIRED_DAYS } from '../../lib/constants';
import { Link, useNavigate } from 'react-router-dom';



export default (props) => {

    const { state: {
        isAuthed,
        principal
    } } = useGlobalContext();
    const escrow = useEscrow();
    const navigate = useNavigate();

    const [loading, setLoading] = React.useState(false);
    const currency = Object.getOwnPropertyNames(props.offer.currency)[0] == CURRENCY_ICP ? CURRENCY_ICP : CURRENCY_ICET;

    const price = currency == CURRENCY_ICP ? parseInt(props.offer.price) / LEDGER_E8S : parseInt(props.offer.price) / LEDGER_E6S;
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

    const claimFree = () => {
        if (!isAuthed) {
            toast.warn("Please login first");
        } else {
            setLoading(true);
            escrow.claimFreeItem(props.offer.id).then(res => {
                setLoading(false);
                if (res["ok"]) {
                    toast.success("Item claimed! It is now yours.");
                } else {
                    toast.error(res["err"] ? res["err"] : "Failed to claim item");
                }
                props.close ? props.close() : null;
            });
        }
    };

    const unlist = () => {
        setLoading(true)
        escrow.changeItemStatus(props.offer.id, { "sold": null }).then(res => {
            if (res["ok"]) {
                toast.success("unlist this item")
            } else {
                toast.error(res["err"])
            };
            setLoading(false)

        })
    };

    const isOwner = principal && props.offer.owner.toString() === principal.toString();
    const listedDate = moment.unix(Number(props.offer.listime) / 1000000000).format('MMMM DD, YYYY');
    const itemType = Object.getOwnPropertyNames(props.offer.itype)[0];

    return (
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
                        {props.offer.image ? (
                            <img
                                className="h-[340px] w-full bg-slate-100 object-cover sm:h-[430px]"
                                src={props.offer.image}
                                alt={props.offer.name}
                            />
                        ) : (
                            <div className="flex h-[340px] w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500 sm:h-[430px]">
                                No image available
                            </div>
                        )}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Description</p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">{props.offer.description || 'No description provided by seller.'}</p>
                    </div>
                </div>

                <div className="lg:col-span-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Price</p>
                        {isFree ? (
                            <p className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-600">FREE</p>
                        ) : (
                            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">${currency} {price}</p>
                        )}

                        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs text-slate-600">Listed on: <span className="font-semibold text-slate-800">{listedDate}</span></p>
                            <p className="text-xs text-slate-600">
                                Seller:{" "}
                                <Link className="font-semibold text-cyan-700 hover:text-cyan-800 hover:underline" to={`/userid/${props.offer.owner.toString()}`}>
                                    {props.offer.owner.toString()}
                                </Link>
                            </p>
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                            {loading ? (
                                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" />
                            ) : (
                                <>
                                    {!isOwner && isFree && (
                                        <button
                                            disabled={loading || !isAuthed}
                                            onClick={claimFree}
                                            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-300"
                                        >
                                            Claim for Free
                                        </button>
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

                            {isOwner && (
                                <button
                                    onClick={() => navigate(`/delegate/${props.offer.id}`)}
                                    className="w-full rounded-xl border border-cyan-500 px-4 py-2.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                                >
                                    Delegate / Share Item
                                </button>
                            )}

                            {isOwner && (
                                <button
                                    onClick={unlist}
                                    className="btn-modern-secondary w-full rounded-xl border border-rose-500 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                                >
                                    Unlist Item
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
                                This item is being given away for free. Claiming it will transfer ownership to your account with no payment required.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}