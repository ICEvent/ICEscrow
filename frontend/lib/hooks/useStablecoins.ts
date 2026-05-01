import * as React from 'react';
import { Principal } from '@dfinity/principal';
import { StablecoinInfo } from '../../api/escrow/service.did';

export interface ICRC1TokenInfo {
    canisterId: string;
    symbol: string;
    decimals: number;
}

/** Map of symbol → ICRC1TokenInfo built from getSupportedStablecoins(). */
export type StablecoinMap = Record<string, ICRC1TokenInfo>;

/**
 * Fetch the list of registered ICRC-1 stablecoins from the escrow canister.
 * Returns a stable map keyed by symbol for easy lookup in currency selects.
 */
export function useStablecoins(escrow: any): { stablecoins: StablecoinMap; loading: boolean } {
    const [stablecoins, setStablecoins] = React.useState<StablecoinMap>({});
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!escrow) return;
        let cancelled = false;
        escrow.getSupportedStablecoins().then((list: StablecoinInfo[]) => {
            if (cancelled) return;
            const map: StablecoinMap = {};
            for (const sc of list) {
                map[sc.symbol] = {
                    canisterId: Principal.from(sc.canisterId).toText(),
                    symbol: sc.symbol,
                    decimals: sc.decimals,
                };
            }
            setStablecoins(map);
            setLoading(false);
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [escrow]);

    return { stablecoins, loading };
}
