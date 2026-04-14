import * as React from 'react';
import { CURRENCY_ICET, CURRENCY_ICP, LEDGER_E6S, LEDGER_E8S } from '../../lib/constants';
import OfferDetail from './OfferDetail';



export default (props) => {
    const [openOfferDetail, setOpenOfferDetail] = React.useState(false);
    const currency = Object.getOwnPropertyNames(props.offer.currency)[0] == CURRENCY_ICP ? CURRENCY_ICP : CURRENCY_ICET;

    const price = currency == CURRENCY_ICP ? parseInt(props.offer.price) / LEDGER_E8S : parseInt(props.offer.price) / LEDGER_E6S;

    return (
        <div className="soft-hover-card group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setOpenOfferDetail(true)}
                className="relative block w-full"
            >
                <div className="absolute left-3 top-3 z-10 rounded-full border border-white/70 bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                    {Object.getOwnPropertyNames(props.offer.itype)[0]}
                </div>

                {props.offer.image ? (
                    <img
                        className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        src={props.offer.image}
                        alt={props.offer.name}
                        title={props.offer.description}
                    />
                ) : (
                    <div className="flex h-52 w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
                        No product image
                    </div>
                )}
            </button>

            <div className="space-y-3 p-4">
                <div>
                    <p className="line-clamp-1 text-base font-bold text-slate-900">{props.offer.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{props.offer.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-end justify-between gap-2">
                    <p className="text-lg font-extrabold tracking-tight text-slate-900">${currency} {price}</p>
                    <button
                        type="button"
                        onClick={() => setOpenOfferDetail(true)}
                        className="btn-modern-primary commerce-gradient rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white"
                    >
                        View Item
                    </button>
                </div>
            </div>

            {openOfferDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenOfferDetail(false)}>
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
                        <OfferDetail offer={props.offer} close={() => setOpenOfferDetail(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}