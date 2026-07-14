import * as React from 'react';
import { CURRENCY_ICP, LEDGER_E8S } from '../../lib/constants';
import { currencyBase, currencySymbol } from '../../lib/currencyUtils';
import { getItemImageSrc } from '../../lib/itemImage';



export default (props) => {
    const currency = currencySymbol(props.offer.currency);
    const base = currencyBase(props.offer.currency);

    const price = parseInt(props.offer.price) / base;
    const isFree = price === 0;
    const openDetails = () => props.onOpen?.(props.offer);
    const imageSrc = getItemImageSrc(props.offer);
    const provider = props.service?.provider;

    return (
        <div className="soft-hover-card group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={openDetails}
                className="relative block w-full"
            >
                <div className="absolute left-3 top-3 z-10 rounded-full border border-white/70 bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                    {Object.getOwnPropertyNames(props.offer.itype)[0]}
                </div>

                {isFree && (
                    <div className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                        FREE
                    </div>
                )}

                <img
                    className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    src={imageSrc}
                    alt={props.offer.name}
                    title={props.offer.description}
                />
            </button>

            <div className="space-y-3 p-4">
                <div>
                    <p className="line-clamp-1 text-base font-bold text-slate-900">{props.offer.name}</p>
                    {provider && (
                        <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                            <p className="font-semibold text-teal-700">Provided by {provider.name}</p>
                            {provider.email?.[0] && <p>{provider.email[0]}</p>}
                            {provider.phone?.[0] && <p>{provider.phone[0]}</p>}
                            {props.service.serviceTypes?.length > 0 && (
                                <p className="line-clamp-1">{props.service.serviceTypes.join(' · ')}</p>
                            )}
                        </div>
                    )}
                    {(props.offer.tags ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {props.offer.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-end justify-between gap-2">
                    {isFree ? (
                        <p className="text-lg font-extrabold tracking-tight text-emerald-600">FREE</p>
                    ) : (
                        <p className="text-lg font-extrabold tracking-tight text-slate-900">${currency} {price}</p>
                    )}
                    <button
                        type="button"
                        onClick={openDetails}
                        className="btn-modern-primary commerce-gradient rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white"
                    >
                        View Item
                    </button>
                </div>
            </div>
        </div>
    );
}
