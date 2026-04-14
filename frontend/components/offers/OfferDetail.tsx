import * as React from 'react';
import { useGlobalContext, useEscrow } from '../Store';
import { toast } from 'react-toastify';
import moment from 'moment';
import { CURRENCY_ICET, CURRENCY_ICP, LEDGER_E6S, LEDGER_E8S, ORDER_DEFAULT_EXPIRED_DAYS } from '../../lib/constants';
import { Link } from 'react-router-dom';



export default (props) => {

    const { state: {
        isAuthed,
        principal
    } } = useGlobalContext();
    const escrow = useEscrow();

    const [loading, setLoading] = React.useState(false);
    const currency = Object.getOwnPropertyNames(props.offer.currency)[0] == CURRENCY_ICP ? CURRENCY_ICP : CURRENCY_ICET;

    const price = currency == CURRENCY_ICP ? parseInt(props.offer.price) / LEDGER_E8S : parseInt(props.offer.price) / LEDGER_E6S;

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

    return (
        <div className="relative rounded-lg bg-white p-6 shadow-sm">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    props.close?.();
                }}
                className="absolute right-2 top-2 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
            >
                x
            </button>

            <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">{props.offer.name}</h2>
                <div className="mt-2 flex items-center gap-2">
                    <p className="text-lg font-medium text-slate-800">${currency} {price}</p>
                    <span className="rounded-full border border-cyan-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                        {Object.getOwnPropertyNames(props.offer.itype)[0]}
                    </span>
                </div>
            </div>

            {props.offer.image && (
                <img
                    className="mb-4 h-[300px] w-full rounded-md bg-slate-100 object-contain"
                    src={props.offer.image}
                    alt={props.offer.name}
                />
            )}

            <div className="mb-6 space-y-2">
                <p className="text-sm leading-6 text-slate-600">{props.offer.description}</p>
                <p className="text-xs text-slate-500">
                    Listed on: {moment.unix(Number(props.offer.listime) / 1000000000).format('MMMM DD, YYYY')}
                </p>
                <p className="text-xs text-slate-500">
                    Owner:{" "}
                    <Link className="font-medium text-cyan-700 hover:text-cyan-800 hover:underline" to={`/userid/${props.offer.owner.toString()}`}>
                        {props.offer.owner.toString()}
                    </Link>
                </p>
            </div>

            <div className="flex justify-end gap-2">
                {loading ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600" />
                ) : (
                    <button
                        disabled={loading || !isAuthed}
                        onClick={buyit}
                        className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        Buy Now
                    </button>
                )}

                {principal && props.offer.owner.toString() === principal.toString() && (
                    <button
                        onClick={unlist}
                        className="rounded-md border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                        Unlist Item
                    </button>
                )}
            </div>
        </div>
    );
}