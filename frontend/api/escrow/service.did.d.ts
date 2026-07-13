import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { ItemType, ServiceInfo, ServiceId, PricingModel, Availability, Coverage, ProviderInfo } from './serviceModels';

export type { ItemType, ServiceInfo, ServiceId, PricingModel, Availability, Coverage, ProviderInfo };

export type Result<T = bigint> = { ok: T } | { err: string };
export type ItemStatus = { list: null } | { pending: null } | { sold: null } | { unlist: null };
export type Location = { online: null } | { physical: string };
export type Currency = { ICP: null } | { ICET: null } | { ICRC1: { canisterId: Principal; symbol: string; decimals: number } };

export interface Item {
  id: bigint;
  name: string;
  description: string;
  image: string;
  itype: ItemType;
  price: bigint;
  currency: Currency;
  location: Location;
  status: ItemStatus;
  owner: Principal;
  listime: bigint;
}

export interface NewItem extends Omit<Item, 'id' | 'owner' | 'listime'> {}
export interface UpdateItem extends Omit<NewItem, 'status'> {}

export interface NewOrder { [key: string]: any }
export interface NewSellOrder { [key: string]: any }
export interface Review { [key: string]: any }
export interface UserStats { [key: string]: any }
export interface StablecoinInfo { canisterId: string; symbol: string; decimals: number; fee: bigint; enabled: boolean }

export interface NewServiceInfo {
  provider: Principal;
  providerInfo: ProviderInfo;
  serviceTypes: string[];
  keywords: string[];
  pricing: PricingModel;
  availability: [] | [Availability];
  coverage: [] | [Coverage];
  capacity: [] | [bigint];
}
export type UpdateServiceInfo = NewServiceInfo;

export interface _SERVICE {
  listItem: ActorMethod<[NewItem], Result<bigint>>;
  updateItem: ActorMethod<[bigint, UpdateItem], Result<bigint>>;
  deleteItem: ActorMethod<[bigint], Result<bigint>>;
  getItem: ActorMethod<[bigint], [] | [Item]>;
  getItems: ActorMethod<[bigint], Item[]>;
  getMyItems: ActorMethod<[bigint], Item[]>;
  searchItems: ActorMethod<[ItemType, bigint], Item[]>;
  createService: ActorMethod<[NewServiceInfo], Result<ServiceId>>;
  updateService: ActorMethod<[ServiceId, UpdateServiceInfo], Result<ServiceId>>;
  deleteService: ActorMethod<[ServiceId], Result<ServiceId>>;
  getService: ActorMethod<[ServiceId], [] | [ServiceInfo]>;
  listServices: ActorMethod<[], ServiceInfo[]>;
  getSupportedStablecoins: ActorMethod<[], StablecoinInfo[]>;
  [key: string]: ActorMethod<any, any>;
}

export const idlFactory: IDL.InterfaceFactory;
