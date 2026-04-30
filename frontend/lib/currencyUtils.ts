/**
 * Helpers for working with the escrow Currency variant.
 *
 * The Candid representation of Currency is an object with exactly one key:
 *   { ICP: null }  |  { ICET: null }  |  { ICRC1: { canisterId, symbol, decimals } }
 */

export interface ICRC1Info {
    canisterId: { toText(): string } | string;
    symbol: string;
    decimals: number;
}

/** Return the display symbol for a currency variant object. */
export function currencySymbol(currency: Record<string, any>): string {
    const key = Object.keys(currency)[0];
    if (key === 'ICRC1') {
        return (currency['ICRC1'] as ICRC1Info).symbol;
    }
    return key; // 'ICP' or 'ICET'
}

/** Return the number of smallest-unit divisions per whole token. */
export function currencyBase(currency: Record<string, any>): number {
    const key = Object.keys(currency)[0];
    if (key === 'ICP') return 100_000_000; // e8s
    if (key === 'ICET') return 1_000_000;  // e6s
    if (key === 'ICRC1') {
        const info = currency['ICRC1'] as ICRC1Info;
        return Math.pow(10, Number(info.decimals));
    }
    return 1_000_000;
}

/** Convert a raw (bigint/number) amount to a human-readable string with symbol. */
export function formatAmount(rawAmount: bigint | number, currency: Record<string, any>): string {
    const base = currencyBase(currency);
    const symbol = currencySymbol(currency);
    const amount = Number(rawAmount) / base;
    return `${amount} ${symbol}`;
}
