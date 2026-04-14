import * as React from 'react';
import moment from 'moment';
import { CURRENCY_ICET, CURRENCY_ICP, LEDGER_E6S, LEDGER_E8S } from '../../lib/constants';

import OfferDetail from "./OfferDetail";

export default (props) => {
    const [openOfferDetail, setOpenOfferDetail] = React.useState(false);
    const currency = Object.getOwnPropertyNames(props.offer.currency)[0] == CURRENCY_ICP ? CURRENCY_ICP : CURRENCY_ICET;

    const price = currency == CURRENCY_ICP ? parseInt(props.offer.price) / LEDGER_E8S : parseInt(props.offer.price) / LEDGER_E6S;

    return (
        <>
            <div
            key={Number(props.offer.id)}
            onClick={() => setOpenOfferDetail(true)}
            className="flex cursor-pointer items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-cyan-300 hover:bg-cyan-50/30"
        >
                {props.offer.image ? (
                    <img
                        src={props.offer.image}
                        alt={props.offer.name}
                        className="h-14 w-14 rounded-md object-cover"
                    />
                ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-200 text-xs text-slate-500">
                        No image
                    </div>
                )}
                <div className="w-full">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="font-medium text-slate-900">{props.offer.name}</p>
                            <p className="text-sm text-slate-600">{"$" + currency + " " + price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full border border-cyan-600 px-2 py-0.5 text-xs font-semibold uppercase text-cyan-700">
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setOpenOfferDetail(false)}
                >
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
                        <OfferDetail offer={props.offer} close={() => setOpenOfferDetail(false)} />
                    </div>
                </div>
            )}
        </>
    );
}