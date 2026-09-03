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
import CounterpartyPicker from './CounterpartyPicker';

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

export default function OrderForm(props) {
    const {
        state: { principal, escrow },
    } = useGlobalContext();
    const { stablecoins } = useStablecoins(escrow);
    const principalText = principal?.toString() ?? '';

    const [state, setState] = React.useState({
        item: '',
        yourside: 'buyer',
        buyer: principalText,
        seller: '',
        amount: 0,
        currency: CURRENCY_ICP,
    });

    React.useEffect(() => {
        if (!principalText) return;
        setState((current) => current.yourside === 'buyer'
            ? { ...current, buyer: principalText }
            : { ...current, seller: principalText });
    }, [principalText]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;

        if (name === 'yourside') {
            setState((current) => value === 'buyer'
                ? { ...current, yourside: value, buyer: principalText, seller: '' }
                : { ...current, yourside: value, seller: principalText, buyer: '' });
            return;
        }

        if (name === 'amount') {
            const amount = Number(value);
            setState({ ...state, amount: Number.isFinite(amount) ? amount : 0 });
            return;
        }

        setState({ ...state, [name]: value });
    }

    const setCounterparty = (value: string) => {
        if (state.yourside === 'buyer') {
            setState((current) => ({ ...current, seller: value }));
        } else {
            setState((current) => ({ ...current, buyer: value }));
        }
    };

    function createOrder() {
        if (!principalText) {
            toast.warn('Sign in before creating an escrow order');
            return;
        }
        if (!state.item.trim()) {
            toast.warn('Describe what this escrow order is for');
            return;
        }
        if (state.amount <= 0) {
            toast.warn('Amount must be greater than 0');
            return;
        }

        const counterparty = state.yourside === 'buyer' ? state.seller.trim() : state.buyer.trim();
        if (!counterparty) {
            toast.warn(`Choose the ${state.yourside === 'buyer' ? 'seller' : 'buyer'}`);
            return;
        }

        const base = ledgerBase(state.currency, stablecoins);
        const currency = buildCurrencyVariant(state.currency, stablecoins);
        const expiration = BigInt(moment().add(ORDER_DEFAULT_EXPIRED_DAYS, 'days').unix());
        const amount = BigInt(Math.floor(state.amount * base));

        try {
            if (state.yourside === 'buyer') {
                props.buy({
                    seller: Principal.fromText(counterparty),
                    memo: state.item.trim(),
                    amount,
                    currency,
                    expiration,
                });
            } else {
                props.sell({
                    buyer: Principal.fromText(counterparty),
                    memo: state.item.trim(),
                    amount,
                    currency,
                    expiration,
                });
            }
        } catch {
            toast.error('The selected account has an invalid Principal');
        }
    }

    const counterpartyValue = state.yourside === 'buyer' ? state.seller : state.buyer;
    const counterpartyRole = state.yourside === 'buyer' ? 'seller' : 'buyer';

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Escrow keeps funds protected while both sides complete the agreement.</p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-white px-3 py-2 text-center font-medium text-slate-700">1. Buyer funds escrow</div>
                    <div className="rounded-lg bg-white px-3 py-2 text-center font-medium text-slate-700">2. Seller delivers</div>
                    <div className="rounded-lg bg-white px-3 py-2 text-center font-medium text-slate-700">3. Buyer confirms</div>
                    <div className="rounded-lg bg-white px-3 py-2 text-center font-medium text-slate-700">4. Seller receives funds</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-12">
                    <label className="mb-1 block text-sm font-medium text-slate-700">What is this agreement for?</label>
                    <input
                        name="item"
                        value={state.item}
                        onChange={handleChange}
                        placeholder="e.g. Website redesign deposit, used kayak, landscaping service"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                </div>

                <div className="sm:col-span-12">
                    <p className="mb-2 text-sm font-medium text-slate-700">Your role</p>
                    <div className="grid grid-cols-2 gap-2">
                        {['buyer', 'seller'].map((role) => (
                            <label
                                key={role}
                                className={`cursor-pointer rounded-xl border px-4 py-3 text-sm transition ${state.yourside === role ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                            >
                                <input className="sr-only" type="radio" name="yourside" value={role} checked={state.yourside === role} onChange={handleChange} />
                                <span className="block font-semibold">I’m the {role}</span>
                                <span className="mt-0.5 block text-xs text-slate-500">{role === 'buyer' ? 'I will fund escrow' : 'I will deliver and receive funds'}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="sm:col-span-12">
                    <CounterpartyPicker
                        label={`Choose the ${counterpartyRole}`}
                        value={counterpartyValue}
                        onChange={setCounterparty}
                        excludePrincipal={principalText}
                    />
                </div>

                <div className="sm:col-span-7">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Escrow amount</label>
                    <input
                        name="amount"
                        type="number"
                        min="0"
                        step="any"
                        value={state.amount}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                </div>

                <div className="sm:col-span-5">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                    <select
                        name="currency"
                        value={state.currency}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                        <option value={CURRENCY_ICP}>{CURRENCY_ICP}</option>
                        <option value={CURRENCY_ICET}>{CURRENCY_ICET}</option>
                        {Object.values(stablecoins).map(sc => (
                            <option key={sc.symbol} value={sc.symbol}>{sc.symbol}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-12 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">You are the {state.yourside}.</span>{' '}
                    Vansday will create the order now and guide both participants through each required action in Orders.
                </div>

                <div className="sm:col-span-12">
                    <button
                        type="button"
                        onClick={createOrder}
                        disabled={!state.item.trim() || !counterpartyValue || state.amount <= 0}
                        className="btn-modern-primary commerce-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:w-auto"
                    >
                        Create Escrow Order
                    </button>
                </div>
            </div>
        </div>
    );
}
