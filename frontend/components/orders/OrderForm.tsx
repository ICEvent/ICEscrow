import * as React from 'react';
import { Principal } from '@dfinity/principal';
import moment from 'moment';
import { toast } from 'react-toastify';

import {
    CURRENCY_ICET,
    CURRENCY_ICP,
    LEDGER_E6S,
    LEDGER_E8S,
    ORDER_DEFAULT_EXPIRED_DAYS,
} from '../../lib/constants';
import { useGlobalContext } from '../Store';
import { useStablecoins, StablecoinMap } from '../../lib/hooks/useStablecoins';

/** Build the Candid Currency variant object expected by the backend. */
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

/** Return the ledger base (smallest units per whole token) for a given key. */
function ledgerBase(currencyKey: string, icrc1Tokens: StablecoinMap): number {
    if (currencyKey === CURRENCY_ICET) return LEDGER_E6S;
    const info = icrc1Tokens[currencyKey];
    if (info) return Math.pow(10, info.decimals);
    return LEDGER_E8S;
}

export default function OrderForm(props) {
    const {
        state: { principal, escrow },
    } = useGlobalContext();

    const { stablecoins } = useStablecoins(escrow);

    const [state, setState] = React.useState({
        item: '',
        yourside: 'buyer',
        buyer: principal.toText(),
        seller: '',
        amount: 0,
        currency: CURRENCY_ICP,
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;

        if (name === 'yourside') {
            if (value === 'buyer') {
                setState({ ...state, yourside: value, buyer: principal.toText(), seller: '' });
            } else {
                setState({ ...state, yourside: value, seller: principal.toText(), buyer: '' });
            }
            return;
        }

        if (name === 'amount') {
            const amount = Number(value);
            setState({ ...state, amount: Number.isFinite(amount) ? amount : 0 });
            return;
        }

        setState({ ...state, [name]: value });
    }

    function createOrder() {
        if (!state.item.trim()) {
            toast.warn('order item is required');
            return;
        }
        if (state.amount <= 0) {
            toast.warn('amount must be greater than 0');
            return;
        }

        const base = ledgerBase(state.currency, stablecoins);
        const currency = buildCurrencyVariant(state.currency, stablecoins);
        const expiration = BigInt(moment().add(ORDER_DEFAULT_EXPIRED_DAYS, 'days').unix());
        const amount = BigInt(Math.floor(state.amount * base));

        try {
            if (state.yourside === 'buyer') {
                const seller = Principal.fromText(state.seller.trim());
                props.buy({
                    seller,
                    memo: state.item,
                    amount,
                    currency,
                    expiration,
                });
            } else {
                const buyer = Principal.fromText(state.buyer.trim());
                props.sell({
                    buyer,
                    memo: state.item,
                    amount,
                    currency,
                    expiration,
                });
            }
        } catch {
            toast.error('invalid principal');
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="mb-3">
                    Create a custom order to guard your fund with your buyer/seller in escrow smart contract. (e.g. house rental deposit, sale deposit...)
                </p>
                <div className="grid gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Deposit Fund in Escrow</div>
                    <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Seller Deliver Item</div>
                    <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Buyer Receive Item</div>
                    <div className="rounded-md bg-white px-3 py-2 text-center font-medium text-slate-700">Release Fund to Seller</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-12">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Describe your ordering item</label>
                    <input
                        name="item"
                        value={state.item}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    />
                </div>

                <div className="sm:col-span-4">
                    <p className="mb-1 text-sm font-medium text-slate-700">Are you?</p>
                    <div className="flex gap-4 text-sm">
                        <label className="inline-flex items-center gap-2">
                            <input type="radio" name="yourside" value="buyer" checked={state.yourside === 'buyer'} onChange={handleChange} />
                            Buyer
                        </label>
                        <label className="inline-flex items-center gap-2">
                            <input type="radio" name="yourside" value="seller" checked={state.yourside === 'seller'} onChange={handleChange} />
                            Seller
                        </label>
                    </div>
                </div>

                {state.yourside === 'seller' && (
                    <div className="sm:col-span-8">
                        <label className="mb-1 block text-sm font-medium text-slate-700">the principal of buyer</label>
                        <input
                            name="buyer"
                            value={state.buyer}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                        />
                    </div>
                )}

                {state.yourside === 'buyer' && (
                    <div className="sm:col-span-8">
                        <label className="mb-1 block text-sm font-medium text-slate-700">the principal of seller</label>
                        <input
                            name="seller"
                            value={state.seller}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                        />
                    </div>
                )}

                <div className="sm:col-span-6">
                    <label className="mb-1 block text-sm font-medium text-slate-700">the amount of order</label>
                    <input
                        name="amount"
                        type="number"
                        value={state.amount}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
                    />
                </div>

                <div className="sm:col-span-6">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                    <select
                        name="currency"
                        value={state.currency}
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
                    <button
                        type="button"
                        onClick={createOrder}
                        className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
