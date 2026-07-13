import { Principal } from '@dfinity/principal';

export type ServiceId = bigint;

export type ItemType =
    | { nft: null }
    | { coin: null }
    | { service: ServiceId }
    | { merchandise: null }
    | { other: null };

export type PricingModel =
    | { free: null }
    | { donation: null }
    | { fixed: bigint }
    | { hourly: bigint }
    | { quote: null };

export type Availability =
    | { always: null }
    | { onDemand: null }
    | { schedule: string[] };

export interface Coverage {
    cities: string[];
    radius: [] | [bigint];
}

export interface ProviderInfo {
    name: string;
    phone: [] | [string];
    email: [] | [string];
    website: [] | [string];
}

export interface ServiceInfo {
    id: ServiceId;
    provider: Principal;
    providerInfo: ProviderInfo;
    owner: Principal;
    serviceTypes: string[];
    keywords: string[];
    pricing: PricingModel;
    availability: [] | [Availability];
    coverage: [] | [Coverage];
    capacity: [] | [bigint];
    createdAt: bigint;
    updatedAt: bigint;
}

export function getServiceId(itemType: ItemType | Record<string, unknown> | null | undefined): ServiceId | null {
    if (itemType && typeof itemType === 'object' && 'service' in itemType) {
        return BigInt((itemType as { service: bigint | number }).service ?? 0);
    }
    return null;
}
