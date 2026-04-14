import * as React from 'react';
import { CURRENCY_ICET, CURRENCY_ICP, LEDGER_E6S, LEDGER_E8S } from '../../lib/constants';
import OfferDetail from './OfferDetail';



export default (props) => {
    const [openOfferDetail, setOpenOfferDetail] = React.useState(false);
    const currency = Object.getOwnPropertyNames(props.offer.currency)[0] == CURRENCY_ICP ? CURRENCY_ICP : CURRENCY_ICET;

    const price = currency == CURRENCY_ICP ? parseInt(props.offer.price) / LEDGER_E8S : parseInt(props.offer.price) / LEDGER_E6S;

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="mb-2 font-medium text-slate-800">{props.offer.name}</p>
            <img
                className="h-48 w-full cursor-pointer rounded-md object-cover"
                src={props.offer.image}
                alt="no image"
                title={props.offer.description}
                onClick={() => setOpenOfferDetail(true)}
            />
            <p className="mt-2 text-sm font-semibold text-slate-700">${currency} {price}</p>

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