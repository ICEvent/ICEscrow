export const idlFactory = ({ IDL }) => {
  const Result = (ok) => IDL.Variant({ ok, err: IDL.Text });
  const ItemStatus = IDL.Variant({ list: IDL.Null, pending: IDL.Null, sold: IDL.Null, unlist: IDL.Null });
  const Currency = IDL.Variant({
    ICP: IDL.Null,
    ICET: IDL.Null,
    ICRC1: IDL.Record({ canisterId: IDL.Principal, symbol: IDL.Text, decimals: IDL.Nat8 }),
  });
  const Location = IDL.Variant({ online: IDL.Null, physical: IDL.Text });
  const ItemType = IDL.Variant({ nft: IDL.Null, coin: IDL.Null, service: IDL.Nat, merchandise: IDL.Null, other: IDL.Null });
  const Item = IDL.Record({
    id: IDL.Nat,
    name: IDL.Text,
    description: IDL.Text,
    image: IDL.Text,
    tags: IDL.Vec(IDL.Text),
    itype: ItemType,
    price: IDL.Nat64,
    currency: Currency,
    location: Location,
    status: ItemStatus,
    owner: IDL.Principal,
    listime: IDL.Int,
  });
  const NewItem = IDL.Record({
    name: IDL.Text,
    description: IDL.Text,
    image: IDL.Text,
    tags: IDL.Vec(IDL.Text),
    itype: ItemType,
    price: IDL.Nat64,
    currency: Currency,
    location: Location,
    status: ItemStatus,
  });
  const UpdateItem = IDL.Record({
    name: IDL.Text,
    description: IDL.Text,
    image: IDL.Text,
    tags: IDL.Vec(IDL.Text),
    itype: ItemType,
    price: IDL.Nat64,
    currency: Currency,
    location: Location,
  });
  const PricingModel = IDL.Variant({ free: IDL.Null, donation: IDL.Null, fixed: IDL.Nat64, hourly: IDL.Nat64, quote: IDL.Null });
  const Availability = IDL.Variant({ always: IDL.Null, onDemand: IDL.Null, schedule: IDL.Vec(IDL.Text) });
  const Coverage = IDL.Record({ cities: IDL.Vec(IDL.Text), radius: IDL.Opt(IDL.Nat) });
  const ProviderInfo = IDL.Record({
    name: IDL.Text,
    phone: IDL.Opt(IDL.Text),
    email: IDL.Opt(IDL.Text),
    website: IDL.Opt(IDL.Text),
  });
  const ServiceInfo = IDL.Record({
    id: IDL.Nat,
    provider: ProviderInfo,
    owner: IDL.Principal,
    serviceTypes: IDL.Vec(IDL.Text),
    keywords: IDL.Vec(IDL.Text),
    pricing: PricingModel,
    availability: IDL.Opt(Availability),
    coverage: IDL.Opt(Coverage),
    capacity: IDL.Opt(IDL.Nat),
    createdAt: IDL.Int,
    updatedAt: IDL.Int,
  });
  const ItemWithAssociations = IDL.Record({ item: Item, service: IDL.Opt(ServiceInfo) });
  const NewServiceInfo = IDL.Record({
    provider: ProviderInfo,
    serviceTypes: IDL.Vec(IDL.Text),
    keywords: IDL.Vec(IDL.Text),
    pricing: PricingModel,
    availability: IDL.Opt(Availability),
    coverage: IDL.Opt(Coverage),
    capacity: IDL.Opt(IDL.Nat),
  });
  const StablecoinInfo = IDL.Record({ canisterId: IDL.Text, symbol: IDL.Text, decimals: IDL.Nat8, fee: IDL.Nat64, enabled: IDL.Bool });
  const OrderCurrency = IDL.Variant({
    ICP: IDL.Null,
    ICET: IDL.Null,
    ICRC1: IDL.Record({ canisterId: IDL.Principal, symbol: IDL.Text, decimals: IDL.Nat8 }),
  });
  const Balance = IDL.Variant({ e6s: IDL.Nat64, e8s: IDL.Nat64 });
  const OrderStatus = IDL.Variant({
    new: IDL.Null,
    deposited: IDL.Null,
    delivered: IDL.Null,
    received: IDL.Null,
    released: IDL.Null,
    refunded: IDL.Null,
    closed: IDL.Null,
    canceled: IDL.Null,
  });
  const Comment = IDL.Record({ ctime: IDL.Int, user: IDL.Principal, comment: IDL.Text });
  const Log = IDL.Record({
    log: IDL.Text,
    logger: IDL.Variant({ buyer: IDL.Null, escrow: IDL.Null, seller: IDL.Null }),
    ltime: IDL.Int,
  });
  const EscrowAccount = IDL.Record({ id: IDL.Text, index: IDL.Nat });
  const Order = IDL.Record({
    account: EscrowAccount,
    amount: IDL.Nat64,
    blockin: IDL.Nat64,
    blockout: IDL.Nat64,
    buyer: IDL.Principal,
    comments: IDL.Vec(Comment),
    createtime: IDL.Int,
    currency: OrderCurrency,
    expiration: IDL.Int,
    id: IDL.Nat,
    lockedby: IDL.Principal,
    logs: IDL.Vec(Log),
    memo: IDL.Text,
    seller: IDL.Principal,
    status: OrderStatus,
    updatetime: IDL.Int,
  });
  const NewOrder = IDL.Record({
    amount: IDL.Nat64,
    currency: OrderCurrency,
    expiration: IDL.Int,
    memo: IDL.Text,
    seller: IDL.Principal,
  });
  const NewSellOrder = IDL.Record({
    amount: IDL.Nat64,
    buyer: IDL.Principal,
    currency: OrderCurrency,
    expiration: IDL.Int,
    memo: IDL.Text,
  });
  const FreeItemClaim = IDL.Record({
    buyer: IDL.Principal,
    canceledAt: IDL.Opt(IDL.Int),
    closedAt: IDL.Opt(IDL.Int),
    comments: IDL.Vec(Comment),
    ctime: IDL.Int,
    id: IDL.Nat,
    itemId: IDL.Nat,
    itemName: IDL.Text,
    seller: IDL.Principal,
  });

  return IDL.Service({
    listItem: IDL.Func([NewItem], [Result(IDL.Nat)], []),
    updateItem: IDL.Func([IDL.Nat, UpdateItem], [Result(IDL.Nat)], []),
    changeItemStatus: IDL.Func([IDL.Nat, ItemStatus], [Result(IDL.Nat)], []),
    deleteItem: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    getItem: IDL.Func([IDL.Nat], [IDL.Opt(Item)], ['query']),
    getItems: IDL.Func([IDL.Nat], [IDL.Vec(Item)], ['query']),
    getItemsWithAssociations: IDL.Func([IDL.Nat], [IDL.Vec(ItemWithAssociations)], ['query']),
    getMyItems: IDL.Func([IDL.Nat], [IDL.Vec(Item)], ['query']),
    searchItems: IDL.Func([ItemType, IDL.Nat], [IDL.Vec(Item)], ['query']),
    searchItemsByKeywords: IDL.Func([IDL.Vec(IDL.Text), IDL.Nat], [IDL.Vec(Item)], ['query']),
    searchItemsWithAssociations: IDL.Func([IDL.Vec(IDL.Text), IDL.Nat], [IDL.Vec(ItemWithAssociations)], ['query']),
    createService: IDL.Func([NewServiceInfo], [Result(IDL.Nat)], []),
    updateService: IDL.Func([IDL.Nat, NewServiceInfo], [Result(IDL.Nat)], []),
    deleteService: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    getService: IDL.Func([IDL.Nat], [IDL.Opt(ServiceInfo)], ['query']),
    listServices: IDL.Func([], [IDL.Vec(ServiceInfo)], ['query']),
    getSupportedStablecoins: IDL.Func([], [IDL.Vec(StablecoinInfo)], ['query']),
    accountBalance: IDL.Func([IDL.Text, OrderCurrency], [Balance], []),
    buy: IDL.Func([NewOrder], [Result(IDL.Nat)], []),
    cancel: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    cancelClaim: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    close: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    closeClaim: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    comment: IDL.Func([IDL.Nat, IDL.Text], [Result(IDL.Nat)], []),
    commentOnClaim: IDL.Func([IDL.Nat, IDL.Text], [Result(IDL.Nat)], []),
    deliver: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    deposit: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    getAllOrders: IDL.Func([IDL.Nat], [IDL.Vec(Order)], ['query']),
    getMyBuyerFreeItemClaims: IDL.Func([], [IDL.Vec(FreeItemClaim)], ['query']),
    getMyFreeItemClaims: IDL.Func([], [IDL.Vec(FreeItemClaim)], ['query']),
    getOrder: IDL.Func([IDL.Nat], [IDL.Opt(Order)], ['query']),
    getOrderBalance: IDL.Func([IDL.Nat], [Balance], []),
    getOrders: IDL.Func([], [IDL.Vec(Order)], ['query']),
    receive: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    release: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    sell: IDL.Func([NewSellOrder], [Result(IDL.Nat)], []),
  });
};
export const init = ({ IDL }) => [];
