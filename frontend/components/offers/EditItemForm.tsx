import * as React from 'react';
import {
    CURRENCY_ICET,
    CURRENCY_ICP,
    LEDGER_E6S,
    LEDGER_E8S,
    LIST_ITEM_COIN,
    LIST_ITEM_MERCHANDISE,
    LIST_ITEM_NFT,
    LIST_ITEM_OTHER,
    LIST_ITEM_SERVICE,
} from '../../lib/constants';
import { toast } from 'react-toastify';
import { Principal } from '@dfinity/principal';
import { useGlobalContext } from '../Store';
import { useStablecoins, StablecoinMap } from '../../lib/hooks/useStablecoins';
import { currencyBase, currencySymbol } from '../../lib/currencyUtils';

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

/** Derive the currency key string (ICP / ICET / symbol) from a canister currency variant. */
function commaList(value: string): string[] {
    return value.split(',').map((part) => part.trim()).filter(Boolean);
}

function currencyToKey(currency: any): string {
    if ('ICP' in currency) return CURRENCY_ICP;
    if ('ICET' in currency) return CURRENCY_ICET;
    if ('ICRC1' in currency) return currency.ICRC1.symbol;
    return CURRENCY_ICP;
}

export default function EditItemForm({ item, onSave, onCancel }: {
    item: any;
    onSave: (updated: any) => Promise<void>;
    onCancel: () => void;
}) {
    const { state: { escrow } } = useGlobalContext();
    const { stablecoins } = useStablecoins(escrow);

    const locationKey = item.location
        ? ('online' in item.location ? 'online' : 'physical')
        : 'online';
    const cityValue = item.location && 'physical' in item.location
        ? item.location.physical
        : '';
    const itypeKey = Object.getOwnPropertyNames(item.itype)[0];
    const base = currencyBase(item.currency);

    const [values, setValues] = React.useState({
        name: item.name ?? '',
        description: item.description ?? '',
        image: item.image ?? '',
        tags: (item.tags ?? []).join(', '),
        itype: itypeKey,
        price: Number(item.price) / base,
        currency: currencyToKey(item.currency),
        location: locationKey,
        city: cityValue,
    });
    const [saving, setSaving] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const save = async () => {
        if (!values.name) { toast.warn('Name is required'); return; }
        const currency = buildCurrencyVariant(values.currency, stablecoins);
        const base = ledgerBase(values.currency, stablecoins);
        const itype =
            values.itype === LIST_ITEM_NFT ? { nft: null } :
            values.itype === LIST_ITEM_COIN ? { coin: null } :
            values.itype === LIST_ITEM_MERCHANDISE ? { merchandise: null } :
            values.itype === LIST_ITEM_SERVICE ? { service: BigInt(item.itype?.service ?? 0) } :
            { other: null };
        const location = values.location === 'online'
            ? { online: null }
            : { physical: values.city };

        const payload = {
            name: values.name,
            description: values.description,
            image: values.image,
            tags: commaList(values.tags),
            itype,
            price: BigInt(Math.floor(values.price * base)),
            currency,
            location,
        };
        setSaving(true);
        try {
            await onSave(payload);
        } finally {
            setSaving(false);
        }
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

                <div className="sm:col-span-12">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Image URL</label>
                    <input
                        name="image"
                        value={values.image}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    />
                </div>

                <div className="sm:col-span-12">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
                    <input
                        name="tags"
                        value={values.tags}
                        onChange={handleChange}
                        placeholder="Comma-separated tags, e.g. vintage, local, handmade"
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
                        {values.location === 'physical' && (
                            <input
                                name="city"
                                placeholder="City"
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

                <div className="sm:col-span-12 flex gap-2">
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || !values.name}
                        className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={saving}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
