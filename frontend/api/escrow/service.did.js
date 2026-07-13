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
  const ProviderInfo = IDL.Record({
    name: IDL.Text,
    phone: IDL.Opt(IDL.Text),
    email: IDL.Opt(IDL.Text),
    website: IDL.Opt(IDL.Text),
  });
  const ServiceInfo = IDL.Record({
    id: IDL.Nat,
    provider: IDL.Principal,
    providerInfo: ProviderInfo,
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
    providerInfo: ProviderInfo,
    serviceTypes: IDL.Vec(IDL.Text),
    keywords: IDL.Vec(IDL.Text),
    pricing: PricingModel,
    availability: IDL.Opt(Availability),
    coverage: IDL.Opt(Coverage),
    capacity: IDL.Opt(IDL.Nat),
  });
  const StablecoinInfo = IDL.Record({ canisterId: IDL.Text, symbol: IDL.Text, decimals: IDL.Nat8, fee: IDL.Nat64, enabled: IDL.Bool });

  return IDL.Service({
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
  });
};
export const init = ({ IDL }) => [];
