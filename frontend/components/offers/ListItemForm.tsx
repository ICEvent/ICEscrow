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

export default function ListItemForm(props) {
    const freeOnly = !!props.freeOnly;
    const { state: { escrow, principal } } = useGlobalContext();
    const { stablecoins } = useStablecoins(escrow);


    const [values, setValues] = React.useState({
        name: "",
        description: "",
        image: "",
        itype: props.itype,
        price: 0,
        currency: CURRENCY_ICP,
        location: "online",
        city: "",
        status: LISTITEM_STATUS_LIST,
        providerName: "",
        providerPhone: "",
        providerEmail: "",
        providerWebsite: "",
        serviceTypes: "",
        keywords: "",
        pricingModel: freeOnly ? "free" : "fixed",
        hourlyRate: 0,
        availability: "onDemand",
        schedule: "",
        coverageCities: "",
        coverageRadius: "",
        capacity: "",
    });

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const list = async () => {
        if (!values.name || values.name == "") { toast.warn("name is required"); return; }
        if (!freeOnly && values.price < 0) { toast.warn("Price cannot be negative"); return; }
        if (values.itype === LIST_ITEM_SERVICE && !principal) { toast.warn("Sign in to list a service"); return; }

        const currency = buildCurrencyVariant(values.currency, stablecoins);
        const base = ledgerBase(values.currency, stablecoins);
        const itemPrice = freeOnly ? BigInt(0) : BigInt(Math.floor(values.price * base));
        let serviceId = BigInt(0);

        if (values.itype === LIST_ITEM_SERVICE) {
            const pricing = values.pricingModel === "free" ? { free: null } :
                values.pricingModel === "donation" ? { donation: null } :
                values.pricingModel === "hourly" ? { hourly: BigInt(Math.floor(Number(values.hourlyRate || 0) * base)) } :
                values.pricingModel === "quote" ? { quote: null } :
                { fixed: itemPrice };
            const availability: any = values.availability === "always" ? [{ always: null }] :
                values.availability === "schedule" ? [{ schedule: commaList(values.schedule) }] :
                values.availability === "none" ? [] :
                [{ onDemand: null }];
            const coverageCities = commaList(values.coverageCities);
            const coverage: any = coverageCities.length || values.coverageRadius !== ""
                ? [{ cities: coverageCities, radius: values.coverageRadius === "" ? [] : [BigInt(values.coverageRadius)] }]
                : [];
            const capacity: any = values.capacity === "" ? [] : [BigInt(values.capacity)];
            const serviceRes = await escrow.createService({
                provider: principal,
                providerInfo: {
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
                toast.error(getCanisterErrorMessage(serviceRes, "Failed to create service info"));
                return;
            }
            serviceId = serviceRes.ok;
        }

        const listype = values.itype == LIST_ITEM_NFT ? {"nft": null}:
                        values.itype == LIST_ITEM_COIN ? {"coin": null}:
                        values.itype == LIST_ITEM_MERCHANDISE ? {"merchandise": null}:
                        values.itype == LIST_ITEM_SERVICE ? {"service": serviceId}:{"other": null}
        
        const location = values.location === "online"
            ? { online: null }
            : { physical: values.city };
        let i = {
            name: values.name,
            description: values.description,
            image: values.image,
            itype: listype,
            price: itemPrice,
            currency: currency,
            location: location,
            status: { "list": null }
        };
        props.submit(i);
    };

    return (
        <div className="p-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                    <select
                        value={values.itype}
                        name="itype"
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    >
                        <option value={LIST_ITEM_NFT}>{LIST_ITEM_NFT}</option>
                        <option value={LIST_ITEM_COIN}>{LIST_ITEM_COIN}</option>
                        <option value={LIST_ITEM_MERCHANDISE}>{LIST_ITEM_MERCHANDISE}</option>
                        <option value={LIST_ITEM_SERVICE}>{LIST_ITEM_SERVICE}</option>
                        <option value={LIST_ITEM_OTHER}>{LIST_ITEM_OTHER}</option>
                    </select>
                </div>

                <div className="sm:col-span-9">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                    <input
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    />
                </div>

                {!freeOnly && (
                    <>
                        <div className="sm:col-span-6">
                            <label className="mb-1 block text-sm font-medium text-slate-700">Price</label>
                            <input
                                name="price"
                                type="number"
                                value={values.price}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                            />
                        </div>

                        <div className="sm:col-span-6">
                            <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                            <select
                                value={values.currency}
                                name="currency"
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                            >
                                <option value={CURRENCY_ICP}>{CURRENCY_ICP}</option>
                                <option value={CURRENCY_ICET}>{CURRENCY_ICET}</option>
                                {Object.values(stablecoins).map(sc => (
                                    <option key={sc.symbol} value={sc.symbol}>{sc.symbol}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <div className="sm:col-span-12">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Image url</label>
                    <input
                        name="image"
                        value={values.image}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    />
                </div>

                <div className="sm:col-span-12">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
                    <div className="flex gap-2">
                        <select
                            value={values.location}
                            name="location"
                            onChange={handleChange}
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                        >
                            <option value="online">Online</option>
                            <option value="physical">Physical</option>
                        </select>
                        {values.location === "physical" && (
                            <input
                                name="city"
                                placeholder="where it is (e.g City, town, etc.)"
                                value={values.city}
                                onChange={handleChange}
                                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                            />
                        )}
                    </div>
                </div>

                <div className="sm:col-span-12">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                    <input
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    />
                </div>

                {values.itype === LIST_ITEM_SERVICE && (
                    <div className="sm:col-span-12 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3">
                        <p className="mb-3 text-sm font-bold text-slate-800">Service details</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">

                            <div className="sm:col-span-6">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Provider name</label>
                                <input
                                    name="providerName"
                                    value={values.providerName}
                                    onChange={handleChange}
                                    placeholder="Business or contact name"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-6">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Provider phone</label>
                                <input
                                    name="providerPhone"
                                    value={values.providerPhone}
                                    onChange={handleChange}
                                    placeholder="Optional phone number"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-6">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Provider email</label>
                                <input
                                    name="providerEmail"
                                    type="email"
                                    value={values.providerEmail}
                                    onChange={handleChange}
                                    placeholder="Optional email"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-6">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Provider website</label>
                                <input
                                    name="providerWebsite"
                                    value={values.providerWebsite}
                                    onChange={handleChange}
                                    placeholder="Optional website or profile"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-6">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Service types</label>
                                <input
                                    name="serviceTypes"
                                    value={values.serviceTypes}
                                    onChange={handleChange}
                                    placeholder="landscaping, hedge trimming"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-6">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Keywords</label>
                                <input
                                    name="keywords"
                                    value={values.keywords}
                                    onChange={handleChange}
                                    placeholder="hedge, cedar, free estimate"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-4">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Pricing model</label>
                                <select
                                    name="pricingModel"
                                    value={values.pricingModel}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                >
                                    <option value="fixed">Fixed listing price</option>
                                    <option value="hourly">Hourly</option>
                                    <option value="quote">Quote</option>
                                    <option value="donation">Donation</option>
                                    <option value="free">Free</option>
                                </select>
                            </div>
                            {values.pricingModel === "hourly" && (
                                <div className="sm:col-span-4">
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Hourly rate</label>
                                    <input
                                        name="hourlyRate"
                                        type="number"
                                        value={values.hourlyRate}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                    />
                                </div>
                            )}
                            <div className="sm:col-span-4">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Availability</label>
                                <select
                                    name="availability"
                                    value={values.availability}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                >
                                    <option value="onDemand">On demand</option>
                                    <option value="always">Always</option>
                                    <option value="schedule">Schedule</option>
                                    <option value="none">Not specified</option>
                                </select>
                            </div>
                            {values.availability === "schedule" && (
                                <div className="sm:col-span-8">
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Schedule</label>
                                    <input
                                        name="schedule"
                                        value={values.schedule}
                                        onChange={handleChange}
                                        placeholder="Mon-Fri, weekends, evenings"
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                    />
                                </div>
                            )}
                            <div className="sm:col-span-5">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Coverage cities</label>
                                <input
                                    name="coverageCities"
                                    value={values.coverageCities}
                                    onChange={handleChange}
                                    placeholder="Walnut Grove, Langley"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Radius</label>
                                <input
                                    name="coverageRadius"
                                    type="number"
                                    value={values.coverageRadius}
                                    onChange={handleChange}
                                    placeholder="km"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                            <div className="sm:col-span-4">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Capacity</label>
                                <input
                                    name="capacity"
                                    type="number"
                                    value={values.capacity}
                                    onChange={handleChange}
                                    placeholder="optional"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="sm:col-span-12">
                    <button
                        type="button"
                        onClick={list}
                        disabled={!values.name}
                        className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {freeOnly ? 'Give Away' : 'List'}
                    </button>
                </div>
            </div>
        </div>

    );
}