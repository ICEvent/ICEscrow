import * as React from 'react';
import {
    CANISTER_CKUSDC,
    CANISTER_CKUSDT,
    CURRENCY_CKUSDC,
    CURRENCY_CKUSDT,
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

/** Known ICRC-1 stablecoins available for listing. */
const ICRC1_TOKENS: Record<string, { canisterId: string; symbol: string; decimals: number }> = {
    [CURRENCY_CKUSDC]: { canisterId: CANISTER_CKUSDC, symbol: CURRENCY_CKUSDC, decimals: 6 },
    [CURRENCY_CKUSDT]: { canisterId: CANISTER_CKUSDT, symbol: CURRENCY_CKUSDT, decimals: 6 },
};

function buildCurrencyVariant(currencyKey: string): Record<string, any> {
    if (currencyKey === CURRENCY_ICP) return { ICP: null };
    if (currencyKey === CURRENCY_ICET) return { ICET: null };
    const info = ICRC1_TOKENS[currencyKey];
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

function ledgerBase(currencyKey: string): number {
    if (currencyKey === CURRENCY_ICET) return LEDGER_E6S;
    const info = ICRC1_TOKENS[currencyKey];
    if (info) return Math.pow(10, info.decimals);
    return LEDGER_E8S;
}

export default function ListItemForm(props) {
    const freeOnly = !!props.freeOnly;


    const [values, setValues] = React.useState({
        name: "",
        description: "",
        image: "",
        itype: props.itype,
        price: 0,
        currency: CURRENCY_ICP,
        status: LISTITEM_STATUS_LIST
    });

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const list = () => {
        if (!values.name || values.name == "") { toast.warn("name is required") }
        else if (!freeOnly && values.price < 0) { toast.warn("Price cannot be negative") }
        else {
            const currency = buildCurrencyVariant(values.currency);
            const base = ledgerBase(values.currency);
            const listype = values.itype == LIST_ITEM_NFT ? {"nft": null}:
                            values.itype == LIST_ITEM_COIN ? {"coin": null}:
                            values.itype == LIST_ITEM_MERCHANDISE ? {"merchandise": null}:
                            values.itype == LIST_ITEM_SERVICE ? {"service": null}:{"other": null}
            
            let i = {
                name: values.name,
                description: values.description,
                image: values.image,
                itype: listype,
                price: freeOnly ? BigInt(0) : BigInt(Math.floor(values.price * base)),
                currency: currency,
                status: { "list": null }
            };
            props.submit(i);

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
                                <option value={CURRENCY_CKUSDC}>{CURRENCY_CKUSDC}</option>
                                <option value={CURRENCY_CKUSDT}>{CURRENCY_CKUSDT}</option>
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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                    <input
                        name="description"
                        value={values.description}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    />
                </div>

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