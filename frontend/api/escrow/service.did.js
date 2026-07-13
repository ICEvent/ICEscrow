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
    itype: ItemType,
    price: IDL.Nat64,
    currency: Currency,
    location: Location,
  });
  const PricingModel = IDL.Variant({ free: IDL.Null, donation: IDL.Null, fixed: IDL.Nat64, hourly: IDL.Nat64, quote: IDL.Null });
  const Availability = IDL.Variant({ always: IDL.Null, onDemand: IDL.Null, schedule: IDL.Vec(IDL.Text) });
  const Coverage = IDL.Record({ cities: IDL.Vec(IDL.Text), radius: IDL.Opt(IDL.Nat) });
  const ServiceInfo = IDL.Record({
    id: IDL.Nat,
    provider: IDL.Principal,
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
  const NewServiceInfo = IDL.Record({
    provider: IDL.Principal,
    serviceTypes: IDL.Vec(IDL.Text),
    keywords: IDL.Vec(IDL.Text),
    pricing: PricingModel,
    availability: IDL.Opt(Availability),
    coverage: IDL.Opt(Coverage),
    capacity: IDL.Opt(IDL.Nat),
  });
  const StablecoinInfo = IDL.Record({ canisterId: IDL.Text, symbol: IDL.Text, decimals: IDL.Nat8, fee: IDL.Nat64, enabled: IDL.Bool });

  const Status = IDL.Variant({
    new: IDL.Null,
    deposited: IDL.Null,
    delivered: IDL.Null,
    received: IDL.Null,
    released: IDL.Null,
    refunded: IDL.Null,
    closed: IDL.Null,
    canceled: IDL.Null,
  });
  const Balance = IDL.Variant({ e8s: IDL.Nat64, e6s: IDL.Nat64 });
  const EscrowAccount = IDL.Record({ index: IDL.Nat, id: IDL.Text });
  const Log = IDL.Record({
    ltime: IDL.Int,
    log: IDL.Text,
    logger: IDL.Variant({ buyer: IDL.Null, seller: IDL.Null, escrow: IDL.Null }),
  });
  const Comment = IDL.Record({ user: IDL.Principal, comment: IDL.Text, ctime: IDL.Int });
  const Order = IDL.Record({
    id: IDL.Nat,
    buyer: IDL.Principal,
    seller: IDL.Principal,
    memo: IDL.Text,
    amount: IDL.Nat64,
    currency: Currency,
    account: EscrowAccount,
    blockin: IDL.Nat64,
    blockout: IDL.Nat64,
    createtime: IDL.Int,
    lockedby: IDL.Principal,
    status: Status,
    updatetime: IDL.Int,
    expiration: IDL.Int,
    comments: IDL.Vec(Comment),
    logs: IDL.Vec(Log),
  });
  const NewOrder = IDL.Record({ seller: IDL.Principal, memo: IDL.Text, amount: IDL.Nat64, currency: Currency, expiration: IDL.Int });
  const NewSellOrder = IDL.Record({ buyer: IDL.Principal, memo: IDL.Text, amount: IDL.Nat64, currency: Currency, expiration: IDL.Int });
  const FreeItemClaim = IDL.Record({
    id: IDL.Nat,
    itemId: IDL.Nat,
    itemName: IDL.Text,
    seller: IDL.Principal,
    buyer: IDL.Principal,
    ctime: IDL.Int,
    comments: IDL.Vec(Comment),
    closedAt: IDL.Opt(IDL.Int),
    canceledAt: IDL.Opt(IDL.Int),
  });
  const Review = IDL.Record({ id: IDL.Nat, orderId: IDL.Nat, reviewer: IDL.Principal, target: IDL.Principal, rating: IDL.Nat, comment: IDL.Text, ctime: IDL.Int });
  const UserStats = IDL.Record({ heartsReceived: IDL.Nat, salesCompleted: IDL.Nat, purchasesCompleted: IDL.Nat, reviewCount: IDL.Nat, ratingSum: IDL.Nat, avgRating: IDL.Float64 });

  return IDL.Service({

    buy: IDL.Func([NewOrder], [Result(IDL.Nat)], []),
    sell: IDL.Func([NewSellOrder], [Result(IDL.Nat)], []),
    create: IDL.Func([NewOrder], [Result(IDL.Nat)], []),
    deposit: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    deliver: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    receive: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    release: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    close: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    cancel: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    comment: IDL.Func([IDL.Nat, IDL.Text], [Result(IDL.Nat)], []),
    getOrders: IDL.Func([], [IDL.Vec(Order)], ['query']),
    getOrder: IDL.Func([IDL.Nat], [IDL.Opt(Order)], ['query']),
    getAllOrders: IDL.Func([IDL.Nat], [IDL.Vec(Order)], ['query']),
    getMyAccountId: IDL.Func([IDL.Nat], [IDL.Text], ['query']),
    getAccountId: IDL.Func([IDL.Nat], [IDL.Text], ['query']),
    getBalanceBySub: IDL.Func([IDL.Nat, Currency], [Balance], []),
    accountBalance: IDL.Func([IDL.Text, Currency], [Balance], []),
    getOrderBalance: IDL.Func([IDL.Nat], [Balance], []),
    listItem: IDL.Func([NewItem], [Result(IDL.Nat)], []),
    updateItem: IDL.Func([IDL.Nat, UpdateItem], [Result(IDL.Nat)], []),
    deleteItem: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    getItem: IDL.Func([IDL.Nat], [IDL.Opt(Item)], ['query']),
    getItems: IDL.Func([IDL.Nat], [IDL.Vec(Item)], ['query']),
    getMyItems: IDL.Func([IDL.Nat], [IDL.Vec(Item)], ['query']),
    searchItems: IDL.Func([ItemType, IDL.Nat], [IDL.Vec(Item)], ['query']),
    createService: IDL.Func([NewServiceInfo], [Result(IDL.Nat)], []),
    updateService: IDL.Func([IDL.Nat, NewServiceInfo], [Result(IDL.Nat)], []),
    deleteService: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    getService: IDL.Func([IDL.Nat], [IDL.Opt(ServiceInfo)], ['query']),
    listServices: IDL.Func([], [IDL.Vec(ServiceInfo)], ['query']),
    getSupportedStablecoins: IDL.Func([], [IDL.Vec(StablecoinInfo)], ['query']),

    changeItemStatus: IDL.Func([IDL.Nat, ItemStatus], [Result(IDL.Nat)], []),
    claimFreeItem: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    getMyFreeItemClaims: IDL.Func([], [IDL.Vec(FreeItemClaim)], ['query']),
    getMyBuyerFreeItemClaims: IDL.Func([], [IDL.Vec(FreeItemClaim)], ['query']),
    commentOnClaim: IDL.Func([IDL.Nat, IDL.Text], [Result(IDL.Nat)], []),
    closeClaim: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    cancelClaim: IDL.Func([IDL.Nat], [Result(IDL.Nat)], []),
    heartUser: IDL.Func([IDL.Principal, IDL.Nat], [Result(IDL.Nat)], []),
    leaveReview: IDL.Func([IDL.Nat, IDL.Nat, IDL.Text], [Result(IDL.Nat)], []),
    getUserReviews: IDL.Func([IDL.Principal], [IDL.Vec(Review)], ['query']),
    getUserStats: IDL.Func([IDL.Principal], [UserStats], ['query']),
  });
};
export const init = ({ IDL }) => [];
