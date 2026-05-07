import * as React from 'react';
import moment from 'moment';

import OfferDetail from "./OfferDetail";
import { currencyBase, currencySymbol } from '../../lib/currencyUtils';
import { getItemImageSrc } from '../../lib/itemImage';

export default (props) => {
    const [openOfferDetail, setOpenOfferDetail] = React.useState(false);
    const currency = currencySymbol(props.offer.currency);
    const base = currencyBase(props.offer.currency);

    const price = parseInt(props.offer.price) / base;
    const isFree = price === 0;
    const imageSrc = getItemImageSrc(props.offer);

    return (
        <>
            <div
            key={Number(props.offer.id)}
            onClick={() => setOpenOfferDetail(true)}
            className="soft-hover-card group flex cursor-pointer items-center gap-4 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white hover:shadow-lg"
        >
                <img
                    src={imageSrc}
                    alt={props.offer.name}
                    className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <div className="w-full">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold text-slate-900 group-hover:text-cyan-700">{props.offer.name}</p>
                            <p className={`text-sm ${isFree ? 'font-semibold text-emerald-600' : 'text-slate-600'}`}>{isFree ? 'FREE' : "$" + currency + " " + price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full border border-cyan-500/70 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                                {Object.getOwnPropertyNames(props.offer.itype)[0]}
                            </span>
                            <span className="text-xs text-slate-500">
                                {moment.unix(Number(props.offer.listime) / 1000000000).format('MMM DD, YYYY')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {openOfferDetail && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                    onClick={() => setOpenOfferDetail(false)}
                >
                    <div className="reveal-up max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/40 bg-white/95 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <OfferDetail offer={props.offer} close={() => setOpenOfferDetail(false)} />
                    </div>
                </div>
            )}
        </>
    );
}
