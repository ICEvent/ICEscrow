import * as React from 'react';
import {
    CURRENCY_ICET,
    CURRENCY_ICP,
    LEDGER_E6S,
    LEDGER_E8S,
    LISTITEM_STATUS_LIST,
    LIST_ITEM_COIN,
    LIST_ITEM_MERCHANDISE,
    LIST_ITEM_NFT,
    LIST_ITEM_OTHER,
    LIST_ITEM_SERVICE,
} from '../../lib/constants';
import { toast } from 'react-toastify';
import { Principal } from '@dfinity/principal';
import { useGlobalContext } from '../Store';
import { getCanisterErrorMessage, isCanisterOkResult } from '../../lib/canisterResult';
import { useStablecoins, StablecoinMap } from '../../lib/hooks/useStablecoins';

function buildCurrencyVariant(currencyKey: string, icrc1Tokens: StablecoinMap): Record<string, any> {
    if (currencyKey === CURRENCY_ICP) return { ICP: null };
    if (currencyKey === CURRENCY_ICET) return { ICET: null };
    const info = icrc1Tokens[currencyKey];
    if (info) {
        return {
            ICRC1: {
                canisterId: Principal.fromText(info.canisterId),
                symbol: info.symbol,
                decimals: info.decimals,
            },
        };
    }
    return { ICP: null };
}

function ledgerBase(currencyKey: string, icrc1Tokens: StablecoinMap): number {
    if (currencyKey === CURRENCY_ICET) return LEDGER_E6S;
    const info = icrc1Tokens[currencyKey];
    if (info) return Math.pow(10, info.decimals);
    return LEDGER_E8S;
}

function commaList(value: string): string[] {
    return value.split(',').map((part) => part.trim()).filter(Boolean);
}

const ITEM_OPTIONS = [
    { value: LIST_ITEM_MERCHANDISE, label: 'Item', hint: 'Physical goods or merchandise' },
    { value: LIST_ITEM_SERVICE, label: 'Service', hint: 'Work, appointments, or professional services' },
    { value: LIST_ITEM_NFT, label: 'NFT', hint: 'A digital collectible or tokenized asset' },
    { value: LIST_ITEM_COIN, label: 'Coin', hint: 'A fungible token or coin' },
    { value: LIST_ITEM_OTHER, label: 'Other', hint: 'Anything that does not fit the categories above' },
];

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';

export default function ListItemForm(props) {
    const freeOnly = !!props.freeOnly;
    const { state: { escrow, principal } } = useGlobalContext();
    const { stablecoins } = useStablecoins(escrow);
    const [step, setStep] = React.useState(1);

    const [values, setValues] = React.useState({
        name: '',
        description: '',
        image: '',
        tags: '',
        itype: props.itype || LIST_ITEM_MERCHANDISE,
        price: 0,
        currency: CURRENCY_ICP,
        location: 'online',
        city: '',
        status: LISTITEM_STATUS_LIST,
        providerName: '',
        providerPhone: '',
        providerEmail: '',
        providerWebsite: '',
        serviceTypes: '',
        keywords: '',
        pricingModel: freeOnly ? 'free' : 'fixed',
        hourlyRate: 0,
        availability: 'onDemand',
        schedule: '',
        coverageCities: '',
        coverageRadius: '',
        capacity: '',
    });

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const validateStep = (targetStep: number) => {
        if (targetStep >= 1 && !values.name.trim()) {
            toast.warn('Give your listing a name');
            return false;
        }
        if (targetStep >= 2) {
            if (!freeOnly && Number(values.price) < 0) {
                toast.warn('Price cannot be negative');
                return false;
            }
            if (values.location === 'physical' && !values.city.trim()) {
                toast.warn('Add a city or pickup location');
                return false;
            }
            if (values.itype === LIST_ITEM_SERVICE && !values.providerName.trim()) {
                toast.warn('Add a provider or business name for this service');
                return false;
            }
        }
        return true;
    };

    const next = () => {
        if (!validateStep(step)) return;
        setStep((current) => Math.min(3, current + 1));
    };

    const list = async () => {
        if (!validateStep(2)) return;
        if (values.itype === LIST_ITEM_SERVICE && !principal) {
            toast.warn('Sign in to list a service');
            return;
        }

        const currency = buildCurrencyVariant(values.currency, stablecoins);
        const base = ledgerBase(values.currency, stablecoins);
        const itemPrice = freeOnly ? BigInt(0) : BigInt(Math.floor(Number(values.price) * base));
        let serviceId = BigInt(0);

        if (values.itype === LIST_ITEM_SERVICE) {
            const pricing = freeOnly ? { free: null } :
                values.pricingModel === 'free' ? { free: null } :
                values.pricingModel === 'donation' ? { donation: null } :
                values.pricingModel === 'hourly' ? { hourly: BigInt(Math.floor(Number(values.hourlyRate || 0) * base)) } :
                values.pricingModel === 'quote' ? { quote: null } :
                { fixed: itemPrice };
            const availability: any = values.availability === 'always' ? [{ always: null }] :
                values.availability === 'schedule' ? [{ schedule: commaList(values.schedule) }] :
                values.availability === 'none' ? [] :
                [{ onDemand: null }];
            const coverageCities = commaList(values.coverageCities);
            const coverage: any = coverageCities.length || values.coverageRadius !== ''
                ? [{ cities: coverageCities, radius: values.coverageRadius === '' ? [] : [BigInt(values.coverageRadius)] }]
                : [];
            const capacity: any = values.capacity === '' ? [] : [BigInt(values.capacity)];
            const serviceRes = await escrow.createService({
                provider: {
                    name: values.providerName.trim(),
                    phone: values.providerPhone.trim() ? [values.providerPhone.trim()] : [],
                    email: values.providerEmail.trim() ? [values.providerEmail.trim()] : [],
                    website: values.providerWebsite.trim() ? [values.providerWebsite.trim()] : [],
                },
                serviceTypes: commaList(values.serviceTypes),
                keywords: commaList(values.keywords),
                pricing,
                availability,
                coverage,
                capacity,
            });
            if (!isCanisterOkResult(serviceRes)) {
                toast.error(getCanisterErrorMessage(serviceRes, 'Failed to create service info'));
                return;
            }
            serviceId = serviceRes.ok;
        }

        const listype = values.itype === LIST_ITEM_NFT ? { nft: null } :
            values.itype === LIST_ITEM_COIN ? { coin: null } :
            values.itype === LIST_ITEM_MERCHANDISE ? { merchandise: null } :
            values.itype === LIST_ITEM_SERVICE ? { service: serviceId } : { other: null };
        const location = values.location === 'online' ? { online: null } : { physical: values.city.trim() };

        props.submit({
            name: values.name.trim(),
            description: values.description.trim(),
            image: values.image.trim(),
            tags: commaList(values.tags),
            itype: listype,
            price: itemPrice,
            currency,
            location,
            status: { list: null },
        });
    };

    const stepMeta = [
        { number: 1, label: 'What' },
        { number: 2, label: 'Terms' },
        { number: 3, label: 'Review' },
    ];

    return (
        <div className="space-y-5 p-1 sm:p-2">
            <div className="grid grid-cols-3 gap-2">
                {stepMeta.map((item) => (
                    <button
                        key={item.number}
                        type="button"
                        onClick={() => item.number < step && setStep(item.number)}
                        className={`rounded-xl border px-3 py-2 text-left transition ${step === item.number ? 'border-orange-400 bg-orange-50' : step > item.number ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                    >
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Step {item.number}</span>
                        <span className="block text-sm font-semibold text-slate-800">{item.label}</span>
                    </button>
                ))}
            </div>

            {step === 1 && (
                <section className="space-y-4">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900">What are you offering?</h4>
                        <p className="mt-1 text-sm text-slate-500">Start with what a buyer needs to recognize the listing.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {ITEM_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setValues((current) => ({ ...current, itype: option.value }))}
                                className={`rounded-xl border p-3 text-left transition ${values.itype === option.value ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                            >
                                <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">{option.hint}</span>
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Listing name</label>
                        <input name="name" value={values.name} onChange={handleChange} placeholder="What should buyers see first?" className={inputClass} />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                        <textarea name="description" value={values.description} onChange={handleChange} rows={4} placeholder="Describe condition, scope, delivery expectations, or anything important to the agreement." className={inputClass} />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Image URL <span className="font-normal text-slate-400">optional</span></label>
                        <input name="image" value={values.image} onChange={handleChange} placeholder="https://…" className={inputClass} />
                    </div>
                </section>
            )}

            {step === 2 && (
                <section className="space-y-4">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900">Price and delivery</h4>
                        <p className="mt-1 text-sm text-slate-500">Define the terms buyers need before entering escrow.</p>
                    </div>

                    {!freeOnly && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Price</label>
                                <input name="price" type="number" min="0" step="any" value={values.price} onChange={handleChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                                <select value={values.currency} name="currency" onChange={handleChange} className={inputClass}>
                                    <option value={CURRENCY_ICP}>{CURRENCY_ICP}</option>
                                    <option value={CURRENCY_ICET}>{CURRENCY_ICET}</option>
                                    {Object.values(stablecoins).map(sc => <option key={sc.symbol} value={sc.symbol}>{sc.symbol}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {freeOnly && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">This listing will be published as FREE.</div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Delivery / location</label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <select value={values.location} name="location" onChange={handleChange} className={inputClass}>
                                <option value="online">Online</option>
                                <option value="physical">Physical / local</option>
                            </select>
                            {values.location === 'physical' && (
                                <input name="city" placeholder="City or pickup area" value={values.city} onChange={handleChange} className={`${inputClass} sm:col-span-2`} />
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Tags <span className="font-normal text-slate-400">optional</span></label>
                        <input name="tags" value={values.tags} onChange={handleChange} placeholder="vintage, local, handmade" className={inputClass} />
                    </div>

                    {values.itype === LIST_ITEM_SERVICE && (
                        <div className="space-y-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                            <div>
                                <p className="text-sm font-bold text-slate-900">Service essentials</p>
                                <p className="mt-1 text-xs text-slate-500">Keep the marketplace-facing details simple; operational metadata is optional.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Provider / business name</label>
                                    <input name="providerName" value={values.providerName} onChange={handleChange} placeholder="Business or contact name" className={inputClass} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Service types</label>
                                    <input name="serviceTypes" value={values.serviceTypes} onChange={handleChange} placeholder="landscaping, hedge trimming" className={inputClass} />
                                </div>
                                {!freeOnly && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Pricing model</label>
                                        <select name="pricingModel" value={values.pricingModel} onChange={handleChange} className={inputClass}>
                                            <option value="fixed">Fixed listing price</option>
                                            <option value="hourly">Hourly</option>
                                            <option value="quote">Quote</option>
                                            <option value="donation">Donation</option>
                                            <option value="free">Free</option>
                                        </select>
                                    </div>
                                )}
                                {values.pricingModel === 'hourly' && !freeOnly && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Hourly rate</label>
                                        <input name="hourlyRate" type="number" min="0" value={values.hourlyRate} onChange={handleChange} className={inputClass} />
                                    </div>
                                )}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Availability</label>
                                    <select name="availability" value={values.availability} onChange={handleChange} className={inputClass}>
                                        <option value="onDemand">On demand</option>
                                        <option value="always">Always</option>
                                        <option value="schedule">Schedule</option>
                                        <option value="none">Not specified</option>
                                    </select>
                                </div>
                                {values.availability === 'schedule' && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Schedule</label>
                                        <input name="schedule" value={values.schedule} onChange={handleChange} placeholder="Mon-Fri, evenings" className={inputClass} />
                                    </div>
                                )}
                            </div>

                            <details className="rounded-xl border border-cyan-100 bg-white/80 p-3">
                                <summary className="cursor-pointer text-sm font-semibold text-slate-700">More service details</summary>
                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <input name="providerPhone" value={values.providerPhone} onChange={handleChange} placeholder="Phone (optional)" className={inputClass} />
                                    <input name="providerEmail" type="email" value={values.providerEmail} onChange={handleChange} placeholder="Email (optional)" className={inputClass} />
                                    <input name="providerWebsite" value={values.providerWebsite} onChange={handleChange} placeholder="Website (optional)" className={inputClass} />
                                    <input name="keywords" value={values.keywords} onChange={handleChange} placeholder="Search keywords" className={inputClass} />
                                    <input name="coverageCities" value={values.coverageCities} onChange={handleChange} placeholder="Coverage cities" className={inputClass} />
                                    <input name="coverageRadius" type="number" min="0" value={values.coverageRadius} onChange={handleChange} placeholder="Radius (km)" className={inputClass} />
                                    <input name="capacity" type="number" min="0" value={values.capacity} onChange={handleChange} placeholder="Capacity (optional)" className={inputClass} />
                                </div>
                            </details>
                        </div>
                    )}
                </section>
            )}

            {step === 3 && (
                <section className="space-y-4">
                    <div>
                        <h4 className="text-lg font-bold text-slate-900">Review and publish</h4>
                        <p className="mt-1 text-sm text-slate-500">Check the buyer-facing summary before it goes live.</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{ITEM_OPTIONS.find((option) => option.value === values.itype)?.label ?? 'Listing'}</p>
                                <p className="mt-1 text-xl font-extrabold text-slate-900">{values.name}</p>
                            </div>
                            <p className={`rounded-full px-3 py-1 text-sm font-bold ${freeOnly ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-800'}`}>
                                {freeOnly ? 'FREE' : `${values.price} ${values.currency}`}
                            </p>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{values.description || 'No description added.'}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-white px-2.5 py-1">{values.location === 'online' ? 'Online' : values.city}</span>
                            {commaList(values.tags).map((tag) => <span key={tag} className="rounded-full bg-white px-2.5 py-1">#{tag}</span>)}
                            {values.itype === LIST_ITEM_SERVICE && values.providerName && <span className="rounded-full bg-white px-2.5 py-1">Provided by {values.providerName}</span>}
                        </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
                        Publishing creates the listing on-chain. A paid buyer will then enter the guided escrow flow; a free listing uses the claim workflow.
                    </div>
                </section>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={() => setStep((current) => Math.max(1, current - 1))}
                    disabled={step === 1}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:invisible"
                >
                    Back
                </button>
                {step < 3 ? (
                    <button type="button" onClick={next} className="btn-modern-primary commerce-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm">
                        Continue
                    </button>
                ) : (
                    <button type="button" onClick={list} className="btn-modern-primary commerce-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm">
                        {freeOnly ? 'Publish Free Listing' : 'Publish Listing'}
                    </button>
                )}
            </div>
        </div>
    );
}
