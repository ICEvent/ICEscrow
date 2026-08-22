import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { ItemType, ServiceInfo, ServiceId, PricingModel, Availability, Coverage, ProviderInfo } from './serviceModels';

export type { ItemType, ServiceInfo, ServiceId, PricingModel, Availability, Coverage, ProviderInfo };

export type Result<T = bigint> = { ok: T } | { err: string };
export type UnitResult = { ok: null } | { err: string };
export type ItemStatus = { list: null } | { pending: null } | { sold: null } | { unlist: null };
export type Location = { online: null } | { physical: string };
export type Currency = { ICP: null } | { ICET: null } | { ICRC1: { canisterId: Principal; symbol: string; decimals: number } };
export type OrderStatus =
  | { new: null }
  | { deposited: null }
  | { delivered: null }
  | { received: null }
  | { released: null }
  | { refunded: null }
  | { closed: null }
  | { canceled: null };
export type OrderSource =
  | {
      icevent: {
        canister: Principal;
        calendarId: bigint;
        requirementId: bigint;
        offerId: bigint;
        reservationId: bigint;
      };
    }
  | {
      external: {
        canister: Principal;
        namespace: string;
        id: string;
      };
    };

export interface Item {
  id: bigint;
  name: string;
  description: string;
  image: string;
  tags: string[];
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
export interface ItemWithAssociations { item: Item; service: [] | [ServiceInfo] }

export interface EscrowAccount {
  id: string;
  index: bigint;
}

export interface Comment {
  ctime: bigint;
  user: Principal;
  comment: string;
}

export interface Log {
  ltime: bigint;
  log: string;
  logger: { buyer: null } | { seller: null } | { escrow: null };
}

export interface Order {
  id: bigint;
  buyer: Principal;
  seller: Principal;
  memo: string;
  amount: bigint;
  currency: Currency;
  account: EscrowAccount;
  blockin: bigint;
  blockout: bigint;
  createtime: bigint;
  lockedby: Principal;
  status: OrderStatus;
  updatetime: bigint;
  expiration: bigint;
  comments: Comment[];
  logs: Log[];
}

export interface NewOrder {
  seller: Principal;
  memo: string;
  amount: bigint;
  currency: Currency;
  expiration: bigint;
}

export interface NewSellOrder {
  buyer: Principal;
  memo: string;
  amount: bigint;
  currency: Currency;
  expiration: bigint;
}

export interface CreateOrderForRequest {
  buyer: Principal;
  seller: Principal;
  memo: string;
  amount: bigint;
  currency: Currency;
  expiration: bigint;
  source: OrderSource;
}

export interface OrderContext {
  orderId: bigint;
  source: OrderSource;
  createdBy: Principal;
  createdAt: bigint;
}

export interface Review { [key: string]: any }
export interface UserStats { [key: string]: any }
export interface StablecoinInfo { canisterId: Principal; symbol: string; decimals: number; fee: bigint }

export interface NewServiceInfo {
  provider: ProviderInfo;
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
  getItemsWithAssociations: ActorMethod<[bigint], ItemWithAssociations[]>;
  getMyItems: ActorMethod<[bigint], Item[]>;
  searchItems: ActorMethod<[[] | [ItemType], [] | [ItemStatus], bigint], Item[]>;
  searchItemsByKeywords: ActorMethod<[string[], [] | [ItemType], [] | [ItemStatus], bigint], Item[]>;
  searchItemsWithAssociations: ActorMethod<[string[], [] | [ItemType], [] | [ItemStatus], bigint], ItemWithAssociations[]>;
  createService: ActorMethod<[NewServiceInfo], Result<ServiceId>>;
  updateService: ActorMethod<[ServiceId, UpdateServiceInfo], Result<ServiceId>>;
  deleteService: ActorMethod<[ServiceId], Result<ServiceId>>;
  getService: ActorMethod<[ServiceId], [] | [ServiceInfo]>;
  listServices: ActorMethod<[], ServiceInfo[]>;
  getSupportedStablecoins: ActorMethod<[], StablecoinInfo[]>;

  buy: ActorMethod<[NewOrder], Result<bigint>>;
  sell: ActorMethod<[NewSellOrder], Result<bigint>>;
  create: ActorMethod<[NewOrder], Result<bigint>>;
  createOrderFor: ActorMethod<[CreateOrderForRequest], Result<bigint>>;
  getOrder: ActorMethod<[bigint], [] | [Order]>;
  getOrders: ActorMethod<[], Order[]>;
  getAllOrders: ActorMethod<[bigint], Order[]>;
  getOrderContext: ActorMethod<[bigint], [] | [OrderContext]>;
  getOrderBySource: ActorMethod<[OrderSource], [] | [Order]>;
  deposit: ActorMethod<[bigint], Result<bigint>>;
  deliver: ActorMethod<[bigint], Result<bigint>>;
  receive: ActorMethod<[bigint], Result<bigint>>;
  release: ActorMethod<[bigint], Result<bigint>>;
  close: ActorMethod<[bigint], Result<bigint>>;
  cancel: ActorMethod<[bigint], Result<bigint>>;
  refund: ActorMethod<[bigint], Result<bigint>>;
  comment: ActorMethod<[bigint, string], Result<bigint>>;

  setAdmin: ActorMethod<[Principal], UnitResult>;
  removeAdmin: ActorMethod<[Principal], UnitResult>;
  addOrderCreator: ActorMethod<[Principal], UnitResult>;
  removeOrderCreator: ActorMethod<[Principal], UnitResult>;
  listOrderCreators: ActorMethod<[], Principal[]>;

  [key: string]: ActorMethod<any, any>;
}

export const idlFactory: IDL.InterfaceFactory;
