import Prim "mo:prim";

import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import Buffer "mo:base/Buffer";
import Error "mo:base/Error";
import Float "mo:base/Float";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import List "mo:base/List";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Trie "mo:base/Trie";
import TrieMap "mo:base/TrieMap";

import Account "./account";
import Hex "./hex";
import Types "./types";
import Utils "./utils";

import ICETTypes "./ICETTypes";
import StablecoinInterface "./StablecoinInterface";

import Page "./page";

import ItemTypes "./list/types";
import Items "./list";
import ServiceTypes "./service/types";
import Services "./service";

import UpgradeTypes "./list/upgradeTypes";

persistent actor class EscrowService() = this {

    type Order = Types.Order;
    type NewOrder = Types.NewOrder;
    type NewSellOrder = Types.NewSellOrder;
    type OrderSource = Types.OrderSource;
    type OrderContext = Types.OrderContext;
    type CreateOrderForRequest = Types.CreateOrderForRequest;
    type Log = Types.Log;
    type Comment = Types.Comment;
    type Review = Types.Review;
    type UserStats = Types.UserStats;
    // Deployed type — has comments but no closedAt. Kept for stable-memory migration.
    type OldFreeItemClaimV2 = {
        id : Nat;
        itemId : Nat;
        itemName : Text;
        seller : Principal;
        buyer : Principal;
        ctime : Int;
        comments : [Comment]
    };

    // V3 type — has closedAt but not canceledAt. Kept for stable-memory migration.
    type OldFreeItemClaimV3 = {
        id : Nat;
        itemId : Nat;
        itemName : Text;
        seller : Principal;
        buyer : Principal;
        ctime : Int;
        comments : [Comment];
        closedAt : ?Int
    };

    type FreeItemClaim = {
        id : Nat;
        itemId : Nat;
        itemName : Text;
        seller : Principal;
        buyer : Principal;
        ctime : Int;
        comments : [Comment];
        closedAt : ?Int;
        canceledAt : ?Int
    };

    type ItemWithAssociations = {
        item : ItemTypes.Item;
        service : ?ServiceTypes.ServiceInfo;
    };

    // transfer fee ICP
    transient let FEE : Nat64 = 10_000;

    var default_page_size = 20;

    var ESCROW_FEE : Nat64 = 0;

    type AccountId = Types.AccountId; // Blob
    type AccountIdText = Types.AccountIdText;

    type Subaccount = Types.Subaccount; // Nat
    type SubaccountBlob = Types.SubaccountBlob;
    type SubaccountNat8Arr = Types.SubaccountNat8Arr;
    type TransferRequest = Types.TransferRequest;
    type AccountIdentifier = Types.AccountIdentifier;
    type EscrowAccount = Types.EscrowAccount;
    type Currency = Types.Currency;
    type Status = Types.Status;
    type Balance = Types.Balance;

    // LEDGER

    transient let ICET = "ot4zw-oaaaa-aaaag-qabaa-cai";
    transient let ICPLedger : Types.Ledger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai");
    transient let ICETLedger : ICETTypes.Self = actor "ot4zw-oaaaa-aaaag-qabaa-cai";
    transient let NotifService : Types.NotificationService = actor "pxu6k-jaaaa-aaaap-aaamq-cai";

    type AccountIdAndTime = {
        accountId : AccountIdText;
        time : Time.Time
    };

    var nextSubAccount : Nat = 1;
    var nextOrderId : Nat = 1;
    var upgradeOrders : [(Nat, Order)] = [];
    // Order provenance is kept separately so the deployed Order stable type does not change.
    var upgradeOrderContexts : [(Nat, OrderContext)] = [];
    // Principals allowed to create orders on behalf of real buyers/sellers.
    var upgradeOrderCreators : [Text] = [];

    // Old deployed Item type — no `location` field. Kept to deserialise stable memory on this upgrade only.
    type OldItype = {
        #nft;
        #coin;
        #service;
        #merchandise;
        #other;
    };

    type OldItem = {
        id : Nat;
        name : Text;
        description : Text;
        image : Text;
        itype : OldItype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 }
        };
        status : ItemTypes.ItemStatus;
        owner : Principal;
        listime : Int
    };

    type OldItemV2 = {
        id : Nat;
        name : Text;
        description : Text;
        image : Text;
        itype : OldItype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 }
        };
        location : ItemTypes.Location;
        status : ItemTypes.ItemStatus;
        owner : Principal;
        listime : Int
    };


    type OldItemV3 = {
        id : Nat;
        name : Text;
        description : Text;
        image : Text;
        itype : ItemTypes.Itype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 }
        };
        location : ItemTypes.Location;
        status : ItemTypes.ItemStatus;
        owner : Principal;
        listime : Int
    };

    func migrateItype(itype : OldItype) : ItemTypes.Itype {
        switch (itype) {
            case (#nft) { #nft };
            case (#coin) { #coin };
            case (#service) { #service(0) };
            case (#merchandise) { #merchandise };
            case (#other) { #other };
        }
    };

    var _upgradeItemId : Nat = 1;
    // Old stable store — Item without location. Kept for one-time migration.
    var _upgradeItems : [(Nat, OldItem)] = [];
    // Old stable store — Item with location and unlinked #service. Kept for one-time migration.
    var _upgradeItemsV2 : [(Nat, OldItemV2)] = [];
    // Old stable store — Item with #service(ServiceId), but no tags. Kept for one-time migration.
    var _upgradeItemsV3 : [(Nat, OldItemV3)] = [];
    // New stable store — Item with tags.
    var _upgradeItemsV4 : [(Nat, ItemTypes.Item)] = [];
    var _upgradeServiceId : Nat = 1;
    var _upgradeServices : [(ServiceTypes.ServiceId, ServiceTypes.ServiceInfo)] = [];
    // Compatibility tombstone. The explicit migration consumes the previous V2
    // store into `_upgradeServices` and keeps this field empty.
    var _upgradeServicesV2 : [(ServiceTypes.ServiceId, ServiceTypes.ServiceInfo)] = [];
    var nextFreeItemClaimId : Nat = 1;
    // upgradeFreeItemClaims (old name, deployed without `comments`) is intentionally dropped.
    // Dropping a stable var is a WARNING (data loss) not an ERROR — and the live canister
    // had zero claims since claimFreeItem was never successfully deployed.
    //
    // upgradeFreeItemClaimsV2 used the type WITHOUT closedAt. It is kept here with the old
    // type so stable memory deserialises correctly, then migrated to V3 during init.
    var upgradeFreeItemClaimsV2 : [(Nat, OldFreeItemClaimV2)] = [];
    // V3 stable store — FreeItemClaim had closedAt but not canceledAt.
    var upgradeFreeItemClaimsV3 : [(Nat, OldFreeItemClaimV3)] = [];
    // New stable store — FreeItemClaim now includes canceledAt.
    var upgradeFreeItemClaimsV4 : [(Nat, FreeItemClaim)] = [];

    //backukp
    var backupItems : [UpgradeTypes.U_Item] = [];

    // Reputation stable storage
    var nextReviewId : Nat = 1;
    var upgradeReviews : [(Nat, Review)] = [];
    // hearts: target principal text → array of giver principal texts
    var upgradeHearts : [(Text, [Text])] = [];
    // heartedClaims: set of claim IDs that have already been used to give a heart
    var upgradeHeartedClaims : [Nat] = [];

    // Stablecoin registry: canister-id (Text) → StablecoinInfo
    var upgradeStablecoins : [(Text, StablecoinInterface.StablecoinInfo)] = [];

    // Admin principals (allowed to manage the stablecoin registry and trusted order creators).
    // Empty on first deployment; use setAdmin to bootstrap.
    var upgradeAdmins : [Text] = [];

    private func natHash(n : Nat) : Hash.Hash { Text.hash(Nat.toText(n)) };

    private func sourceOwner(source : OrderSource) : Principal {
        switch (source) {
            case (#icevent(value)) { value.canister };
            case (#external(value)) { value.canister };
        }
    };

    // Canonical source key used for idempotency. Length-prefix free-form external
    // fields so delimiters inside namespace/id cannot produce collisions.
    private func sourceKey(source : OrderSource) : Text {
        switch (source) {
            case (#icevent(value)) {
                "icevent|" # Principal.toText(value.canister) # "|" # Nat.toText(value.calendarId) # "|" # Nat.toText(value.requirementId) # "|" # Nat.toText(value.offerId) # "|" # Nat.toText(value.reservationId)
            };
            case (#external(value)) {
                "external|" # Principal.toText(value.canister) # "|" # Nat.toText(Text.size(value.namespace)) # ":" # value.namespace # "|" # Nat.toText(Text.size(value.id)) # ":" # value.id
            };
        }
    };

    transient var orders = TrieMap.TrieMap<Nat, Order>(Nat.equal, natHash);
    orders := TrieMap.fromEntries<Nat, Order>(Iter.fromArray(upgradeOrders), Nat.equal, natHash);

    transient var orderContexts = TrieMap.TrieMap<Nat, OrderContext>(Nat.equal, natHash);
    orderContexts := TrieMap.fromEntries<Nat, OrderContext>(Iter.fromArray(upgradeOrderContexts), Nat.equal, natHash);

    // Derived index: source key → order id. Rebuilt from stable contexts on every upgrade.
    transient var orderBySource = TrieMap.TrieMap<Text, Nat>(Text.equal, Text.hash);
    for ((orderId, context) in orderContexts.entries()) {
        orderBySource.put(sourceKey(context.source), orderId);
    };

    transient var orderCreatorSet = TrieMap.TrieMap<Text, Bool>(Text.equal, Text.hash);
    for (creator in upgradeOrderCreators.vals()) {
        orderCreatorSet.put(creator, true);
    };

    // One-time migration: add location = #online to items that don't have it yet.
    transient let _migratedItems : [(Nat, ItemTypes.Item)] = if (_upgradeItems.size() > 0) {
        Array.map<(Nat, OldItem), (Nat, ItemTypes.Item)>(
            _upgradeItems,
            func((k, v) : (Nat, OldItem)) : (Nat, ItemTypes.Item) {
                (k, {
                    id = v.id;
                    name = v.name;
                    description = v.description;
                    image = v.image;
                    tags = [];
                    itype = migrateItype(v.itype);
                    price = v.price;
                    currency = v.currency;
                    status = v.status;
                    owner = v.owner;
                    listime = v.listime;
                    location = #online
                })
            }
        )
    } else if (_upgradeItemsV2.size() > 0) {
        Array.map<(Nat, OldItemV2), (Nat, ItemTypes.Item)>(
            _upgradeItemsV2,
            func((k, v) : (Nat, OldItemV2)) : (Nat, ItemTypes.Item) {
                (k, {
                    id = v.id;
                    name = v.name;
                    description = v.description;
                    image = v.image;
                    tags = [];
                    itype = migrateItype(v.itype);
                    price = v.price;
                    currency = v.currency;
                    status = v.status;
                    owner = v.owner;
                    listime = v.listime;
                    location = v.location
                })
            }
        )
    } else if (_upgradeItemsV3.size() > 0) {
        Array.map<(Nat, OldItemV3), (Nat, ItemTypes.Item)>(
            _upgradeItemsV3,
            func((k, v) : (Nat, OldItemV3)) : (Nat, ItemTypes.Item) {
                (k, {
                    id = v.id;
                    name = v.name;
                    description = v.description;
                    image = v.image;
                    tags = [];
                    itype = v.itype;
                    price = v.price;
                    currency = v.currency;
                    status = v.status;
                    owner = v.owner;
                    listime = v.listime;
                    location = v.location
                })
            }
        )
    } else { _upgradeItemsV4 };
    transient let items = Items.Items(_upgradeItemId, _migratedItems);
    transient let services = Services.Services(_upgradeServiceId, _upgradeServices);
    transient var freeItemClaims = TrieMap.TrieMap<Nat, FreeItemClaim>(Nat.equal, natHash);
    freeItemClaims := if (upgradeFreeItemClaimsV2.size() > 0) {
        // One-time migration from V2: add closedAt = null and canceledAt = null.
        let migrated = Array.map<(Nat, OldFreeItemClaimV2), (Nat, FreeItemClaim)>(
            upgradeFreeItemClaimsV2,
            func((k, v) : (Nat, OldFreeItemClaimV2)) : (Nat, FreeItemClaim) {
                (k, {
                    id = v.id;
                    itemId = v.itemId;
                    itemName = v.itemName;
                    seller = v.seller;
                    buyer = v.buyer;
                    ctime = v.ctime;
                    comments = v.comments;
                    closedAt = null;
                    canceledAt = null;
                })
            },
        );
        TrieMap.fromEntries<Nat, FreeItemClaim>(Iter.fromArray(migrated), Nat.equal, natHash)
    } else if (upgradeFreeItemClaimsV3.size() > 0) {
        // One-time migration from V3: add canceledAt = null.
        let migrated = Array.map<(Nat, OldFreeItemClaimV3), (Nat, FreeItemClaim)>(
            upgradeFreeItemClaimsV3,
            func((k, v) : (Nat, OldFreeItemClaimV3)) : (Nat, FreeItemClaim) {
                (k, {
                    id = v.id;
                    itemId = v.itemId;
                    itemName = v.itemName;
                    seller = v.seller;
                    buyer = v.buyer;
                    ctime = v.ctime;
                    comments = v.comments;
                    closedAt = v.closedAt;
                    canceledAt = null;
                })
            },
        );
        TrieMap.fromEntries<Nat, FreeItemClaim>(Iter.fromArray(migrated), Nat.equal, natHash)
    } else {
        TrieMap.fromEntries<Nat, FreeItemClaim>(Iter.fromArray(upgradeFreeItemClaimsV4), Nat.equal, natHash)
    };
    transient var freeItemClaimIndex = TrieMap.TrieMap<Text, Nat>(Text.equal, Text.hash);
    for (claim in freeItemClaims.vals()) {
        let key = Nat.toText(claim.itemId) # ":" # Principal.toText(claim.buyer);
        freeItemClaimIndex.put(key, claim.id);
    };

    // Reputation transient maps
    transient var reviews = TrieMap.TrieMap<Nat, Review>(Nat.equal, natHash);
    reviews := TrieMap.fromEntries<Nat, Review>(Iter.fromArray(upgradeReviews), Nat.equal, natHash);

    // reviewByOrder index: orderId → reviewId (ensures one review per order)
    transient var reviewByOrder = TrieMap.TrieMap<Nat, Nat>(Nat.equal, natHash);
    for (r in reviews.vals()) {
        reviewByOrder.put(r.orderId, r.id);
    };

    // hearts: target principal text → Buffer of giver principal texts
    transient var hearts = TrieMap.TrieMap<Text, Buffer.Buffer<Text>>(Text.equal, Text.hash);
    for ((target, givers) in upgradeHearts.vals()) {
        let buf = Buffer.Buffer<Text>(givers.size());
        for (g in givers.vals()) { buf.add(g) };
        hearts.put(target, buf);
    };

    // heartedClaims: tracks which claim IDs have already been used to give a heart
    transient var heartedClaims = TrieMap.TrieMap<Nat, Bool>(Nat.equal, natHash);
    for (claimId in upgradeHeartedClaims.vals()) {
        heartedClaims.put(claimId, true);
    };

    // Stablecoin registry (transient map re-hydrated from stable store on upgrade)
    transient var stablecoins = TrieMap.TrieMap<Text, StablecoinInterface.StablecoinInfo>(Text.equal, Text.hash);
    stablecoins := TrieMap.fromEntries<Text, StablecoinInterface.StablecoinInfo>(
        Iter.fromArray(upgradeStablecoins),
        Text.equal,
        Text.hash,
    );

    // Admin set (transient, re-hydrated from upgradeAdmins on upgrade)
    transient var adminSet = TrieMap.TrieMap<Text, Bool>(Text.equal, Text.hash);
    for (a in upgradeAdmins.vals()) {
        adminSet.put(a, true);
    };

    // Check whether a principal is authorised to manage the stablecoin registry.
    func isAdmin(p : Principal) : Bool {
        adminSet.get(Principal.toText(p)) == ?true
    };

    func isOrderCreator(p : Principal) : Bool {
        orderCreatorSet.get(Principal.toText(p)) == ?true
    };

    private func createOrderInternal(
        buyer : Principal,
        seller : Principal,
        memo : Text,
        amount : Nat64,
        currency : Currency,
        expiration : Int,
        lockedby : Principal,
        logText : Text,
        logger : { #buyer; #seller; #escrow },
    ) : Nat {
        let orderid = nextOrderId;
        let now = Time.now();
        orders.put(
            orderid,
            {
                id = orderid;
                buyer;
                seller;
                memo;
                amount;
                currency;
                account = getNewAccountId();
                blockin = 0;
                blockout = 0;
                status = #new;
                expiration;
                createtime = now;
                updatetime = now;
                lockedby;
                comments = [];
                logs = [{
                    ltime = now;
                    log = logText;
                    logger
                }]
            },
        );
        nextOrderId += 1;
        orderid
    };

    public shared ({ caller }) func buy(newOrder : NewOrder) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else if (newOrder.memo == "") {
            #err("memo is required")
        } else {
            let orderid = createOrderInternal(
                caller,
                newOrder.seller,
                newOrder.memo,
                newOrder.amount,
                newOrder.currency,
                newOrder.expiration,
                caller,
                "create buying order",
                #buyer,
            );
            ignore sendNotification(newOrder.seller, "New escrow order #" # Nat.toText(orderid) # " has been created", caller);
            #ok(orderid)
        }
    };

    public shared ({ caller }) func sell(newOrder : NewSellOrder) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else if (newOrder.memo == "") {
            #err("memo is required")
        } else {
            let orderid = createOrderInternal(
                newOrder.buyer,
                caller,
                newOrder.memo,
                newOrder.amount,
                newOrder.currency,
                newOrder.expiration,
                caller,
                "create selling order",
                #seller,
            );
            ignore sendNotification(newOrder.buyer, "New escrow order #" # Nat.toText(orderid) # " has been created for you", caller);
            #ok(orderid)
        }
    };

    //buyer create a new order (legacy alias kept for compatibility)
    public shared ({ caller }) func create(newOrder : NewOrder) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else if (newOrder.memo == "") {
            #err("memo is required")
        } else {
            let orderid = createOrderInternal(
                caller,
                newOrder.seller,
                newOrder.memo,
                newOrder.amount,
                newOrder.currency,
                newOrder.expiration,
                caller,
                "create order",
                #buyer,
            );
            ignore sendNotification(newOrder.seller, "New escrow order #" # Nat.toText(orderid) # " has been created", caller);
            #ok(orderid)
        }
    };

    // Trusted orchestration canisters create an order for the actual buyer/seller.
    // Calls are idempotent by OrderSource: a retry returns the existing order id.
    public shared ({ caller }) func createOrderFor(request : CreateOrderForRequest) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("no authenticated")
        };
        if (not isOrderCreator(caller)) {
            return #err("unauthorized order creator")
        };
        if (Principal.isAnonymous(request.buyer) or Principal.isAnonymous(request.seller)) {
            return #err("buyer and seller must be authenticated principals")
        };
        if (request.memo == "") {
            return #err("memo is required")
        };
        if (sourceOwner(request.source) != caller) {
            return #err("order source canister must match caller")
        };

        let key = sourceKey(request.source);
        switch (orderBySource.get(key)) {
            case (?existingId) {
                switch (orders.get(existingId)) {
                    case (?existing) {
                        if (
                            existing.buyer == request.buyer and
                            existing.seller == request.seller and
                            existing.memo == request.memo and
                            existing.amount == request.amount and
                            existing.currency == request.currency and
                            existing.expiration == request.expiration
                        ) {
                            #ok(existingId)
                        } else {
                            #err("order source already exists with different order data")
                        }
                    };
                    case null {
                        #err("order source index points to a missing order")
                    };
                }
            };
            case null {
                let orderid = createOrderInternal(
                    request.buyer,
                    request.seller,
                    request.memo,
                    request.amount,
                    request.currency,
                    request.expiration,
                    request.buyer,
                    "create orchestrated order",
                    #escrow,
                );
                let context : OrderContext = {
                    orderId = orderid;
                    source = request.source;
                    createdBy = caller;
                    createdAt = Time.now()
                };
                orderContexts.put(orderid, context);
                orderBySource.put(key, orderid);
                ignore sendNotification(request.buyer, "Escrow order #" # Nat.toText(orderid) # " has been created from an external reservation", caller);
                ignore sendNotification(request.seller, "Escrow order #" # Nat.toText(orderid) # " has been created from an external reservation", caller);
                #ok(orderid)
            };
        }
    };

    //buyer deposit fund in escrow, and change status to #deposited
    public shared ({ caller }) func deposit(orderid : Nat) : async Result.Result<Nat, Text> {

        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool { (o.id == orderid) },
        );

        switch (order) {
            case (?order) {
                //check expired time
                if (Int.less(order.expiration * 1_000_000_000, Time.now())) {
                    #err("order is expired")
                } else if (order.amount == 0) {
                    // free order: no payment required, auto-confirm deposit
                    let log = {
                        ltime = Time.now();
                        log = "free order: auto deposit confirmed";
                        logger = #escrow
                    };
                    var logs : List.List<Log> = List.fromArray(order.logs);
                    logs := List.push(log, logs);

                    orders.put(
                        orderid,
                        {
                            id = orderid;
                            buyer = order.buyer;
                            seller = order.seller;
                            memo = order.memo;
                            amount = order.amount;
                            currency = order.currency;
                            account = order.account;
                            blockin = order.blockin;
                            blockout = order.blockout;
                            expiration = order.expiration;
                            createtime = order.createtime;

                            status = #deposited;
                            lockedby = order.seller;
                            updatetime = Time.now();
                            comments = order.comments;
                            logs = List.toArray(logs)
                        },
                    );
                    ignore sendNotification(order.seller, "Escrow order #" # Nat.toText(orderid) # " has been deposited", caller);
                    #ok(1)
                } else {
                    //check account balance

                    var balance : Nat64 = 0;
                    // ICRC-1 accounts are identified by owner + subaccount, not by
                    // the legacy ICP AccountIdentifier stored in `account.id`.
                    let bb = await getBalanceBySub(order.account.index, order.currency);
                    switch (bb) {
                        case (#e8s(a)) {
                            balance := a
                        };
                        case (#e6s(a)) {
                            balance := a
                        };

                    };

                    if (Nat64.equal(balance, 0)) {
                        #err("no deposit received")
                    } else if (Nat64.less(balance, order.amount)) {
                        #err("deposit (" # Nat64.toText(balance) # ") is less order ammount" # Nat64.toText(order.amount))
                    } else {
                        let log = {
                            ltime = Time.now();
                            log = "make deposit";
                            logger = #buyer
                        };
                        var logs : List.List<Log> = List.fromArray(order.logs);
                        logs := List.push(log, logs);

                        orders.put(
                            orderid,
                            {
                                id = orderid;
                                buyer = order.buyer;
                                seller = order.seller;
                                memo = order.memo;
                                amount = order.amount;
                                currency = order.currency;
                                account = order.account;
                                blockin = order.blockin;
                                blockout = order.blockout;
                                expiration = order.expiration;
                                createtime = order.createtime;

                                status = #deposited;
                                lockedby = order.seller;
                                updatetime = Time.now();
                                comments = order.comments;
                                logs = List.toArray(logs)
                            },
                        );
                        ignore sendNotification(order.seller, "Escrow order #" # Nat.toText(orderid) # " has been deposited", caller);
                        #ok(1)
                    }
                }

            };
            case (_) {
                #err("no order found")
            }
        };

    };

    //seller deliver item to buyer, and change status to #delivered
    public shared ({ caller }) func deliver(orderid : Nat) : async Result.Result<Nat, Text> {
        //update status with delivered
        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool { (o.id == orderid) },
        );
        //and (o.buyer == caller or o.seller == caller) and (o.status == #new or o.status == #deposited or o.status == #delivered)
        //only seller and deposited order can changed to deliver
        switch (order) {
            case (?order) {
                if (order.status == #deposited and order.seller == caller and order.lockedby == caller) {
                    let log = {
                        ltime = Time.now();
                        log = "deliver order item";
                        logger = #seller
                    };
                    var logs : List.List<Log> = List.fromArray(order.logs);
                    logs := List.push(log, logs);

                    orders.put(
                        orderid,
                        {
                            id = orderid;
                            buyer = order.buyer;
                            seller = order.seller;
                            memo = order.memo;
                            amount = order.amount;
                            currency = order.currency;
                            account = order.account;
                            blockin = order.blockin;
                            blockout = order.blockout;
                            expiration = order.expiration;
                            createtime = order.createtime;

                            lockedby = order.buyer;
                            status = #delivered;
                            updatetime = Time.now();
                            comments = order.comments;
                            logs = List.toArray(logs)
                        },
                    );
                    ignore sendNotification(order.buyer, "Escrow order #" # Nat.toText(orderid) # " has been delivered by the seller", caller);
                    #ok(1);

                } else {
                    #err("status is not right or no permission")
                }
            };
            case (_) {
                #err("no order found")
            }
        };

    };

    //buyer check the item received, call confirm to change status to #released
    public shared ({ caller }) func receive(orderid : Nat) : async Result.Result<Nat, Text> {

        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool { (o.id == orderid) },
        );

        switch (order) {
            case (?order) {
                if (order.status == #delivered and order.buyer == caller and order.lockedby == caller) {
                    let log = {
                        ltime = Time.now();
                        log = "receive the order item";
                        logger = #buyer
                    };
                    var logs : List.List<Log> = List.fromArray(order.logs);
                    logs := List.push(log, logs);

                    orders.put(
                        orderid,
                        {
                            id = orderid;
                            buyer = order.buyer;
                            seller = order.seller;
                            memo = order.memo;
                            amount = order.amount;
                            currency = order.currency;
                            account = order.account;
                            blockin = order.blockin;
                            blockout = order.blockout;
                            createtime = order.createtime;
                            expiration = order.expiration;

                            lockedby = getPrincipal();
                            status = #received;
                            updatetime = Time.now();

                            comments = order.comments;
                            logs = List.toArray(logs)
                        },
                    );
                    ignore sendNotification(order.seller, "Escrow order #" # Nat.toText(orderid) # " has been received by the buyer", caller)
                };
                #ok(1)
            };
            case (_) {
                #err("no order found")
            }
        };

    };

    //release fund
    public shared ({ caller }) func release(orderid : Nat) : async Result.Result<Nat, Text> {

        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool { (o.id == orderid) },
        );

        switch (order) {
            case (?order) {
                if (order.status == #received and order.seller == caller and order.lockedby == getPrincipal()) {
                    if (order.amount == 0) {
                        // free order: no funds to transfer, just mark as released
                        let log = {
                            ltime = Time.now();
                            log = "free order: release confirmed without fund transfer";
                            logger = #escrow
                        };
                        var logs : List.List<Log> = List.fromArray(order.logs);
                        logs := List.push(log, logs);

                        orders.put(
                            orderid,
                            {
                                id = orderid;
                                buyer = order.buyer;
                                seller = order.seller;
                                memo = order.memo;
                                amount = order.amount;
                                currency = order.currency;
                                account = order.account;
                                blockin = order.blockin;
                                blockout = order.blockout;
                                createtime = order.createtime;
                                expiration = order.expiration;

                                lockedby = getPrincipal();
                                status = #released;
                                updatetime = Time.now();

                                comments = order.comments;
                                logs = List.toArray(logs)
                            },
                        );
                        ignore sendNotification(order.buyer, "Escrow order #" # Nat.toText(orderid) # " has been released and funds sent to seller", caller);
                        #ok(1)
                    } else {
                        var amount : Nat64 = 0;
                        let balance = await getBalanceBySub(order.account.index, order.currency);
                        switch (balance) {
                            case (#e8s(a)) {
                                amount := a
                            };
                            case (#e6s(a)) {
                                amount := a
                            }
                        };

                        switch (payoutAmount(amount, order.currency)) {
                            case (#ok(value)) { amount := value };
                            case (#err(message)) { return #err(message) }
                        };

                        let trans = await transfer({
                            memo = 1;
                            from = order.account.index;
                            to = Account.getAccountTextId(order.seller, 0);
                            toPrincipal = ?order.seller;
                            amount = amount;
                            currency = order.currency
                        });
                        switch (trans) {
                            case (#ok(_block)) {
                                let log = {
                                    ltime = Time.now();
                                    log = "release fund to seller";
                                    logger = #escrow
                                };
                                var logs : List.List<Log> = List.fromArray(order.logs);
                                logs := List.push(log, logs);

                                orders.put(
                                    orderid,
                                    {
                                        id = orderid;
                                        buyer = order.buyer;
                                        seller = order.seller;
                                        memo = order.memo;
                                        amount = order.amount;
                                        currency = order.currency;
                                        account = order.account;
                                        blockin = order.blockin;
                                        blockout = order.blockout;
                                        createtime = order.createtime;
                                        expiration = order.expiration;

                                        lockedby = getPrincipal();
                                        status = #released;
                                        updatetime = Time.now();

                                        comments = order.comments;
                                        logs = List.toArray(logs)
                                    },
                                );

                                ignore sendNotification(order.buyer, "Escrow order #" # Nat.toText(orderid) # " has been released and funds sent to seller", caller);
                                #ok(1)
                            };
                            case (#err(e)) {
                                #err("failed to release fund" # e)
                            }
                        }
                    }

                } else {
                    #err("wrong status or no permission")
                }

            };
            case (_) {
                #err("no order found")
            }
        };

    };

    //buyer or seller
    public shared ({ caller }) func close(orderid : Nat) : async Result.Result<Nat, Text> {
        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool {
                (o.id == orderid) and (o.buyer == caller or o.seller == caller)
            },
        );

        switch (order) {
            case (?order) {
                let canCloseOrder = order.status != #closed and order.status != #canceled and order.status != #refunded;

                if (canCloseOrder) {
                    let log = {
                        ltime = Time.now();
                        log = "close order";
                        logger = if (caller == order.seller) { #seller } else { #buyer }
                    };
                    var logs : List.List<Log> = List.fromArray(order.logs);
                    logs := List.push(log, logs);

                    orders.put(
                        orderid,
                        {
                            id = orderid;
                            buyer = order.buyer;
                            seller = order.seller;
                            memo = order.memo;
                            amount = order.amount;
                            currency = order.currency;
                            account = order.account;
                            blockin = order.blockin;
                            blockout = order.blockout;
                            createtime = order.createtime;
                            expiration = order.expiration;
                            lockedby = getPrincipal();
                            status = #closed;
                            updatetime = Time.now();

                            comments = order.comments;
                            logs = List.toArray(logs)
                        },
                    );
                    let notifReceiver = if (caller == order.seller) { order.buyer } else { order.seller };
                    ignore sendNotification(notifReceiver, "Escrow order #" # Nat.toText(orderid) # " has been closed", caller);
                    #ok(1)
                } else {
                    #err("wrong status or no permission")
                }
            };
            case (_) {
                #err("no order found")
            }
        }
    };

    //buyer submit cancel request if status is #deposited
    public shared ({ caller }) func cancel(orderid : Nat) : async Result.Result<Nat, Text> {

        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool {
                (o.id == orderid) and (o.buyer == caller or o.seller == caller)
            },
        );
        switch (order) {
            case (?order) {
                if (
                    order.status == #deposited and order.seller == caller and order.lockedby == caller //seller
                    or order.status == #new and order.buyer == caller and order.lockedby == caller,
                ) {
                    var balance : Nat64 = 0;
                    let bb = await getBalanceBySub(order.account.index, order.currency);
                    switch (bb) {
                        case (#e8s(a)) {
                            balance := a
                        };
                        case (#e6s(a)) {
                            balance := a
                        };

                    };

                    var refunded = false;
                    var err = "";
                    if (balance > 0) {
                        //refund
                        switch (payoutAmount(balance, order.currency)) {
                            case (#ok(value)) { balance := value };
                            case (#err(message)) { return #err(message) }
                        };

                        let r = await transfer({
                            memo = 1;
                            from = order.account.index;
                            to = Account.getAccountTextId(order.buyer, 0);
                            toPrincipal = ?order.buyer;
                            amount = balance;
                            currency = order.currency
                        });
                        switch (r) {
                            case (#ok(_block)) {
                                refunded := true
                            };
                            case (#err(e)) {
                                err := e
                            }
                        }
                    } else {
                        //no refund needed
                        refunded := true
                    };
                    if (refunded) {
                        var logger : {
                            #buyer;
                            #seller;
                            #escrow
                        } = #buyer;
                        if (order.seller == caller) {
                            logger := #seller
                        };
                        let log = {
                            ltime = Time.now();
                            log = "cancel order";
                            logger = logger
                        };
                        var logs : List.List<Log> = List.fromArray(order.logs);
                        logs := List.push(log, logs);
                        orders.put(
                            orderid,
                            {
                                id = orderid;
                                buyer = order.buyer;
                                seller = order.seller;
                                memo = order.memo;
                                amount = order.amount;
                                currency = order.currency;
                                account = order.account;
                                blockin = order.blockin;
                                blockout = order.blockout;
                                createtime = order.createtime;
                                expiration = order.expiration;
                                lockedby = getPrincipal();
                                status = #canceled;
                                updatetime = Time.now();

                                comments = order.comments;
                                logs = List.toArray(logs)
                            },
                        );
                        let notifReceiver = if (caller == order.seller) { order.buyer } else { order.seller };
                        ignore sendNotification(notifReceiver, "Escrow order #" # Nat.toText(orderid) # " has been canceled", caller);
                        #ok(1)
                    } else {
                        #err(err)
                    }

                } else {
                    #err("no cancel allowed")
                }
            };
            case (_) {
                #err("no order found")
            }
        };

    };

    //seller refund to buyer anytime
    public shared ({ caller }) func refund(orderid : Nat) : async Result.Result<Nat, Text> {

        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool { (o.id == orderid) },
        );

        switch (order) {
            case (?order) {
                if (
                    order.seller == caller or order.buyer == caller and (order.status == #new or order.status == #canceled)
                ) {

                    var balance : Nat64 = 0;
                    let bb = await getBalanceBySub(order.account.index, order.currency);
                    switch (bb) {
                        case (#e8s(a)) {
                            balance := a
                        };
                        case (#e6s(a)) {
                            balance := a
                        };

                    };

                    switch (payoutAmount(balance, order.currency)) {
                        case (#ok(value)) { balance := value };
                        case (#err(message)) { return #err(message) }
                    };

                    let r = await transfer({
                        memo = 1;
                        from = order.account.index;
                        to = Account.getAccountTextId(order.buyer, 0);
                        toPrincipal = ?order.buyer;
                        amount = balance;
                        currency = order.currency
                    });
                    switch (r) {
                        case (#ok(_block)) {
                            var logger : {
                                #buyer;
                                #seller;
                                #escrow
                            } = #buyer;
                            if (order.seller == caller) {
                                logger := #seller
                            };
                            let log = {
                                ltime = Time.now();
                                log = "refund order";
                                logger = logger
                            };

                            writeLog(order, log);

                            ignore sendNotification(order.buyer, "Escrow order #" # Nat.toText(orderid) # " has been refunded", caller);
                            #ok(1)
                        };
                        case (#err(e)) {
                            #err(e)
                        }
                    };

                } else {
                    #err("no permission to refund")
                }

            };
            case (_) {
                #err("no order found")
            }
        };

    };

    public shared ({ caller }) func comment(orderid : Nat, comment : Text) : async Result.Result<Nat, Text> {
        let order = Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool {
                o.id == orderid
            },
        );
        switch (order) {
            case (?order) {
                if (order.buyer == caller or order.seller == caller) {
                    var comments : List.List<Comment> = List.fromArray(order.comments);
                    comments := List.push(
                        {
                            ctime = Time.now();
                            comment = comment;
                            user = caller
                        },
                        comments,
                    );
                    orders.put(
                        orderid,
                        {
                            id = order.id;
                            buyer = order.buyer;
                            seller = order.seller;
                            memo = order.memo;
                            amount = order.amount;
                            currency = order.currency;
                            account = order.account;
                            blockin = order.blockin;
                            blockout = order.blockout;
                            createtime = order.createtime;
                            expiration = order.expiration;
                            lockedby = order.lockedby;
                            status = order.status;
                            updatetime = order.updatetime;

                            comments = List.toArray(comments);
                            logs = order.logs
                        },
                    );
                    #ok(1)
                } else {
                    #err("no permission")
                }
            };
            case (_) {
                #err("no order found")
            }
        };

    };

    //fetch user's orders with status: #new; #deposited; #deliveried;
    public query ({ caller }) func getOrders() : async [Order] {
        Array.filter(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool {
                Int.greater(o.expiration * 1_000_000_000, Time.now()) and (o.buyer == caller or o.seller == caller) and (o.status == #new or o.status == #deposited or o.status == #delivered or o.status == #received)
            },
        )
    };

    //fetch user's orde by order id
    public query ({ caller }) func getOrder(orderid : Nat) : async ?Order {
        Array.find<Order>(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool {
                (o.id == orderid) and (o.buyer == caller or o.seller == caller)
            },
        )
    };

    // Return source metadata to an order participant, the originating canister, or an admin.
    public query ({ caller }) func getOrderContext(orderid : Nat) : async ?OrderContext {
        switch (orderContexts.get(orderid)) {
            case null { null };
            case (?context) {
                switch (orders.get(orderid)) {
                    case (?order) {
                        if (order.buyer == caller or order.seller == caller or context.createdBy == caller or isAdmin(caller)) {
                            ?context
                        } else {
                            null
                        }
                    };
                    case null { null };
                }
            };
        }
    };

    // Trusted source owner (or an admin) can recover the order after an uncertain/retried call.
    public query ({ caller }) func getOrderBySource(source : OrderSource) : async ?Order {
        if (sourceOwner(source) != caller and not isAdmin(caller)) {
            return null
        };
        switch (orderBySource.get(sourceKey(source))) {
            case (?orderid) { orders.get(orderid) };
            case null { null };
        }
    };

    public query ({ caller }) func getAllOrders(page : Nat) : async [Order] {
        let os = Array.filter(
            Iter.toArray(orders.vals()),
            func(o : Order) : Bool { (o.buyer == caller or o.seller == caller) },
        );

        Page.getArrayPage(os, page, default_page_size);

    };

    public query ({ caller }) func getMyAccountId(sub : Nat) : async Text {
        let sublob = Utils.subToSubBlob(sub);
        Utils.accountIdToHex(Account.accountIdentifier(caller, sublob))
    };

    public query func getAccountId(sub : Nat) : async Text {
        let sublob = Utils.subToSubBlob(sub);
        Utils.accountIdToHex(Account.accountIdentifier(getPrincipal(), sublob))
    };

    func getNewAccountId() : EscrowAccount {

        let subaccount = nextSubAccount;
        nextSubAccount += 1;
        let subaccountBlob : SubaccountBlob = Utils.subToSubBlob(subaccount);

        let accountIdText = Utils.accountIdToHex(Account.accountIdentifier(getPrincipal(), subaccountBlob));
        return {
            index = subaccount;
            id = accountIdText
        }
    };

    public shared ({ caller }) func getMyBalanceBySub(sub : Nat, currency : Currency) : async Balance {
        let sublob = Utils.subToSubBlob(sub);
        let address = Account.accountIdentifier(caller, sublob);
        await accountBalance(Utils.accountIdToHex(address), currency)
    };

    public shared func getBalanceBySub(sub : Nat, currency : Currency) : async Balance {
        let sublob = Utils.subToSubBlob(sub);
        switch (currency) {
            case (#ICRC1(info)) {
                let ledger : StablecoinInterface.Ledger = actor (Principal.toText(info.canisterId));
                let balance = await ledger.icrc1_balance_of({
                    owner = getPrincipal();
                    subaccount = ?sublob
                });
                if (info.decimals == 8) {
                    #e8s(Nat64.fromNat(balance))
                } else {
                    #e6s(Nat64.fromNat(balance))
                }
            };
            case (_) {
                await accountBalance(
                    Utils.accountIdToHex(Account.accountIdentifier(getPrincipal(), sublob)),
                    currency,
                )
            }
        }
    };

    // Return the amount that can leave an escrow subaccount after the ledger
    // transfer fee (and the ICP-only escrow fee) has been reserved.
    func payoutAmount(balance : Nat64, currency : Currency) : Result.Result<Nat64, Text> {
        let fees : Nat64 = switch (currency) {
            case (#ICP) { FEE + ESCROW_FEE };
            case (#ICET) { 0 };
            case (#ICRC1(info)) {
                switch (stablecoins.get(Principal.toText(info.canisterId))) {
                    case (?stablecoin) { Nat64.fromNat(stablecoin.fee) };
                    case null {
                        return #err("ICRC-1 token is not registered; cannot determine transfer fee")
                    }
                }
            }
        };
        if (balance <= fees) {
            #err(
                "escrow balance (" # Nat64.toText(balance) #
                ") does not cover transfer fees (" # Nat64.toText(fees) # ")"
            )
        } else {
            #ok(balance - fees)
        }
    };

    // LEDGER WRAPPERS
    public shared func accountBalance(account : AccountIdText, currency : Currency) : async Balance {
        switch (currency) {
            case (#ICP) {
                let bicp = await ICPLedger.account_balance({
                    account = Utils.hexToAccountId(account)
                });
                #e8s(bicp.e8s)
            };
            case (#ICET) {
                let bicet = await ICETLedger.balance({
                    token = ICET;
                    user = #address(account)
                });
                switch (bicet) {
                    case (#ok(b)) {
                        #e6s(Nat64.fromNat(b))
                    };
                    case (_) {
                        #e6s(0)
                    }
                }
            };
            case (#ICRC1(info)) {
                // For ICRC-1, the hex `account` string is an ICP AccountIdentifier and
                // cannot be reverse-mapped to an ICRC-1 subaccount.
                // Use getOrderBalance(orderId) for accurate ICRC-1 escrow-account balance.
                ignore info;
                // Return a recognisable sentinel so callers know to use getOrderBalance.
                // The Balance type currently only has #e8s and #e6s; we return #e6s(0)
                // to signal "unknown – please use getOrderBalance".
                #e6s(0)
            }
        };

    };

    /// Query the balance of an order's escrow account for any currency type.
    /// Preferred over accountBalance for ICRC-1 orders because it resolves the
    /// correct ICRC-1 subaccount from the order's account index.
    public shared func getOrderBalance(orderId : Nat) : async Balance {
        switch (orders.get(orderId)) {
            case null { #e8s(0) };
            case (?order) {
                let subBlob = Utils.subToSubBlob(order.account.index);
                switch (order.currency) {
                    case (#ICP) {
                        let bicp = await ICPLedger.account_balance({
                            account = Utils.hexToAccountId(order.account.id)
                        });
                        #e8s(bicp.e8s)
                    };
                    case (#ICET) {
                        let bicet = await ICETLedger.balance({
                            token = ICET;
                            user = #address(order.account.id)
                        });
                        switch (bicet) {
                            case (#ok(b)) { #e6s(Nat64.fromNat(b)) };
                            case (_) { #e6s(0) }
                        }
                    };
                    case (#ICRC1(info)) {
                        let ledger : StablecoinInterface.Ledger = actor (Principal.toText(info.canisterId));
                        let bal = await ledger.icrc1_balance_of({
                            owner = getPrincipal();
                            subaccount = ?subBlob
                        });
                        if (info.decimals == 8) {
                            #e8s(Nat64.fromNat(bal))
                        } else {
                            #e6s(Nat64.fromNat(bal))
                        }
                    }
                }
            }
        }
    };

    func transfer(r : TransferRequest) : async Result.Result<Nat64, Text> {

        switch (r.currency) {
            case (#ICP) {
                let res = await ICPLedger.transfer({
                    memo = r.memo;
                    from_subaccount = ?Utils.subToSubBlob(r.from);
                    to = Blob.fromArray(Hex.decode(r.to));
                    amount = { e8s = r.amount };
                    fee = { e8s = FEE };
                    created_at_time = ?{
                        timestamp_nanos = Nat64.fromNat(Int.abs(Time.now()))
                    }
                });
                switch (res) {
                    case (#Ok(blockIndex)) {
                        #ok(blockIndex)
                    };
                    case (#Err(#InsufficientFunds { balance })) {
                        throw Error.reject("No enough fund! The balance is only " # debug_show balance # " e8s")
                    };
                    case (#Err(other)) {
                        throw Error.reject("Unexpected error: " # debug_show other)
                    }
                }
            };
            case (#ICET) {
                let subAccountBlob = Utils.subToSubBlob(r.from);
                let res = await ICETLedger.transfer({
                    to = #address(r.to);
                    token = ICET;
                    notify = false;
                    from = #address(Utils.accountIdToHex(Account.accountIdentifier(getPrincipal(), subAccountBlob)));
                    memo = [Nat8.fromNat(Nat64.toNat(r.memo))];
                    subaccount = ?Blob.toArray(subAccountBlob);
                    amount = Nat64.toNat(r.amount);
                });
                switch (res) {
                    case (#ok(_)) {
                        #ok(1)
                    };
                    case (#err(e)) {
                        switch (e) {
                            case (#CannotNotify(_)) { #err("CannotNotify") };
                            case (#InsufficientBalance) { #err("InsufficientBalance") };
                            case (#InvalidToken(_)) { #err("InvalidToken") };
                            case (#Rejected) { #err("Rejected") };
                            case (#Unauthorized(_)) { #err("Unauthorized") };
                            case (#Other(o)) { #err(o) }
                        }
                    }
                }
            };
            case (#ICRC1(info)) {
                // Look up the registered fee; null lets the ledger use its default fee.
                let fee : ?Nat = switch (stablecoins.get(Principal.toText(info.canisterId))) {
                    case (?sc) { ?sc.fee };
                    case null { null }
                };
                let subAccountBlob = Utils.subToSubBlob(r.from);
                let ledger : StablecoinInterface.Ledger = actor (Principal.toText(info.canisterId));
                // Resolve the destination account: prefer the typed Principal when available.
                let toAccount : StablecoinInterface.Account = switch (r.toPrincipal) {
                    case (?p) { { owner = p; subaccount = null } };
                    case null {
                        // toPrincipal must always be set for ICRC-1 transfers.
                        // Return an error to prevent accidental fund loss if it is missing.
                        return #err("ICRC-1 transfer requires toPrincipal to be set")
                    }
                };
                let res = await ledger.icrc1_transfer({
                    to = toAccount;
                    fee = fee;
                    memo = null;
                    from_subaccount = ?subAccountBlob;
                    created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
                    amount = Nat64.toNat(r.amount)
                });
                switch (res) {
                    case (#Ok(blockIndex)) {
                        #ok(Nat64.fromNat(blockIndex))
                    };
                    case (#Err(#InsufficientFunds { balance })) {
                        #err("InsufficientFunds: balance=" # Nat.toText(balance))
                    };
                    case (#Err(#BadFee { expected_fee })) {
                        #err("BadFee: expected=" # Nat.toText(expected_fee))
                    };
                    case (#Err(other)) {
                        #err("Transfer error: " # debug_show other)
                    }
                }
            }
        }
    };

    // ── Stablecoin Registry ─────────────────────────────────────────────────

    /// Return all stablecoins currently registered with the escrow canister.
    public query func getSupportedStablecoins() : async [StablecoinInterface.StablecoinInfo] {
        Iter.toArray(stablecoins.vals())
    };

    /// Bootstrap: add the first admin when the admin list is empty, or add a new
    /// admin if the caller is already an admin.
    public shared ({ caller }) func setAdmin(newAdmin : Principal) : async Result.Result<(), Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("Anonymous caller not allowed")
        };
        if (adminSet.size() == 0 or isAdmin(caller)) {
            adminSet.put(Principal.toText(newAdmin), true);
            #ok(())
        } else {
            #err("Unauthorized: caller is not an admin")
        }
    };

    /// Remove an admin (admin only).
    public shared ({ caller }) func removeAdmin(target : Principal) : async Result.Result<(), Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized: caller is not an admin")
        };
        adminSet.delete(Principal.toText(target));
        #ok(())
    };

    /// Allow a canister to create orders on behalf of actual buyers/sellers.
    public shared ({ caller }) func addOrderCreator(target : Principal) : async Result.Result<(), Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized: caller is not an admin")
        };
        if (Principal.isAnonymous(target)) {
            return #err("Anonymous principal cannot be an order creator")
        };
        orderCreatorSet.put(Principal.toText(target), true);
        #ok(())
    };

    /// Revoke orchestration order-creation permission.
    public shared ({ caller }) func removeOrderCreator(target : Principal) : async Result.Result<(), Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized: caller is not an admin")
        };
        orderCreatorSet.delete(Principal.toText(target));
        #ok(())
    };

    /// Public for transparency: list canisters trusted to originate external orders.
    public query func listOrderCreators() : async [Principal] {
        Array.map<Text, Principal>(Iter.toArray(orderCreatorSet.keys()), Principal.fromText)
    };

    /// Register or update a stablecoin (admin only).
    /// Fetches live metadata (fee, decimals, symbol) from the ledger canister.
    public shared ({ caller }) func registerStablecoin(canisterId : Principal) : async Result.Result<StablecoinInterface.StablecoinInfo, Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized: caller is not an admin")
        };
        let ledger : StablecoinInterface.Ledger = actor (Principal.toText(canisterId));
        let fee = await ledger.icrc1_fee();
        let decimals = await ledger.icrc1_decimals();
        let symbol = await ledger.icrc1_symbol();
        let info : StablecoinInterface.StablecoinInfo = {
            canisterId;
            symbol;
            decimals;
            fee
        };
        stablecoins.put(Principal.toText(canisterId), info);
        #ok(info)
    };

    /// Remove a stablecoin from the registry (admin only).
    public shared ({ caller }) func removeStablecoin(canisterId : Principal) : async Result.Result<(), Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized: caller is not an admin")
        };
        stablecoins.delete(Principal.toText(canisterId));
        #ok(())
    };

    func writeLog(order : Order, log : Log) : () {
        var logs : List.List<Log> = List.fromArray(order.logs);
        logs := List.push(log, logs);
        orders.put(
            order.id,
            {
                id = order.id;
                buyer = order.buyer;
                seller = order.seller;
                memo = order.memo;
                amount = order.amount;
                currency = order.currency;
                account = order.account;
                blockin = order.blockin;
                blockout = order.blockout;
                createtime = order.createtime;
                expiration = order.expiration;
                lockedby = order.lockedby;
                status = order.status;
                updatetime = order.updatetime;

                comments = order.comments;
                logs = List.toArray(logs)
            },
        )
    };

    func getPrincipal() : Principal {
        return Principal.fromActor(this)
    };

    // Builds and fire-and-forgets a notification to the RAM notification service.
    // Must be called from within a shared (async) function.
    func sendNotification(receiver : Principal, note : Text, sender : Principal) : async () {
        ignore NotifService.addNotification({
            note = note;
            ntype = #user(Principal.toText(sender));
            receiver = Principal.toText(receiver);
            sender = Principal.toText(sender)
        })
    };

    func _accIdTextKey(s : AccountIdText) : Trie.Key<AccountIdText> {
        { key = s; hash = Text.hash(s) }
    };

    //-----------------------  Item List ---------------------------------------

    public shared ({ caller }) func listItem(newItem : ItemTypes.NewItem) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else {
            let id = items.create(newItem, caller);
            #ok(id)
        }
    };

    public shared ({ caller }) func updateItem(id : Nat, data : ItemTypes.UpdateItem) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else {
            let item = items.retrieve(id);
            switch (item) {
                case (?item) {
                    if (item.owner == caller) {
                        items.update(id, data)
                    } else {
                        #err("no permission")
                    }
                };
                case (_) {
                    #err("no item found")
                };
            };
        }
    };

    private func itemMatchesFilters(item : ItemTypes.Item, itype : ?ItemTypes.Itype, status : ?ItemTypes.ItemStatus) : Bool {
        let matchesType = switch (itype) {
            case (?value) { item.itype == value };
            case null { true };
        };
        let matchesStatus = switch (status) {
            case (?value) { item.status == value };
            case null { true };
        };
        matchesType and matchesStatus
    };

    public query func searchItems(itype : ?ItemTypes.Itype, status : ?ItemTypes.ItemStatus, page : Nat) : async [ItemTypes.Item] {
        let matchedItems = Array.filter<ItemTypes.Item>(
            items.getItems(),
            func(item) { itemMatchesFilters(item, itype, status) },
        );
        let sortedItems = Array.sort<ItemTypes.Item>(
            matchedItems,
            func(a, b) { Int.compare(Int.abs(b.listime), Int.abs(a.listime)) },
        );
        Page.getArrayPage(sortedItems, page, default_page_size)
    };

    private func itemContainsKeyword(item : ItemTypes.Item, keyword : Text) : Bool {
        let normalizedKeyword = Text.toLowercase(keyword);
        if (normalizedKeyword == "") {
            false
        } else if (Text.contains(Text.toLowercase(item.name), #text normalizedKeyword)) {
            true
        } else if (Text.contains(Text.toLowercase(item.description), #text normalizedKeyword)) {
            true
        } else {
            Array.find<Text>(
                item.tags,
                func(tag) {
                    Text.contains(Text.toLowercase(tag), #text normalizedKeyword)
                },
            ) != null
        }
    };

    private func itemMatchesKeywords(item : ItemTypes.Item, keywords : [Text]) : Bool {
        Array.find<Text>(
            keywords,
            func(keyword) {
                itemContainsKeyword(item, keyword)
            },
        ) != null
    };

    private func associatedService(item : ItemTypes.Item) : ?ServiceTypes.ServiceInfo {
        switch (item.itype) {
            case (#service(serviceId)) { services.retrieve(serviceId) };
            case (_) { null };
        }
    };

    private func serviceContainsKeyword(service : ServiceTypes.ServiceInfo, keyword : Text) : Bool {
        let normalizedKeyword = Text.toLowercase(keyword);
        if (normalizedKeyword == "") {
            false
        } else if (Text.contains(Text.toLowercase(service.provider.name), #text normalizedKeyword)) {
            true
        } else if (switch (service.provider.phone) { case (?value) Text.contains(Text.toLowercase(value), #text normalizedKeyword); case null false }) {
            true
        } else if (switch (service.provider.email) { case (?value) Text.contains(Text.toLowercase(value), #text normalizedKeyword); case null false }) {
            true
        } else if (switch (service.provider.website) { case (?value) Text.contains(Text.toLowercase(value), #text normalizedKeyword); case null false }) {
            true
        } else if (Array.find<Text>(service.serviceTypes, func(value) { Text.contains(Text.toLowercase(value), #text normalizedKeyword) }) != null) {
            true
        } else {
            Array.find<Text>(service.keywords, func(value) { Text.contains(Text.toLowercase(value), #text normalizedKeyword) }) != null
        }
    };

    private func itemWithAssociations(item : ItemTypes.Item) : ItemWithAssociations {
        { item; service = associatedService(item) }
    };

    private func itemMatchesAssociatedKeywords(item : ItemTypes.Item, keywords : [Text]) : Bool {
        if (itemMatchesKeywords(item, keywords)) return true;
        switch (associatedService(item)) {
            case (?service) {
                Array.find<Text>(keywords, func(keyword) { serviceContainsKeyword(service, keyword) }) != null
            };
            case null { false };
        }
    };

    public query func searchItemsByKeywords(keywords : [Text], itype : ?ItemTypes.Itype, status : ?ItemTypes.ItemStatus, page : Nat) : async [ItemTypes.Item] {
        let titems = items.getItems();
        let matchedItems = Array.filter<ItemTypes.Item>(
            titems,
            func(item) {
                itemMatchesFilters(item, itype, status) and itemMatchesKeywords(item, keywords)
            },
        );
        let sortedItems = Array.sort<ItemTypes.Item>(
            matchedItems,
            func(a, b) { Int.compare(Int.abs(b.listime), Int.abs(a.listime)) },
        );
        Page.getArrayPage(sortedItems, page, default_page_size)
    };

    public query func getItems(page : Nat) : async [ItemTypes.Item] {
        let titems = items.getItems();
        let sortedItems = Array.sort<ItemTypes.Item>(
            titems,
            func(a, b) { Int.compare(Int.abs(b.listime), Int.abs(a.listime)) },
        );
        Page.getArrayPage(sortedItems, page, default_page_size)
    };

    public query func getItemsWithAssociations(page : Nat) : async [ItemWithAssociations] {
        let sortedItems = Array.sort<ItemTypes.Item>(
            items.getItems(),
            func(a, b) { Int.compare(Int.abs(b.listime), Int.abs(a.listime)) },
        );
        Array.map<ItemTypes.Item, ItemWithAssociations>(
            Page.getArrayPage(sortedItems, page, default_page_size),
            itemWithAssociations,
        )
    };

    public query func searchItemsWithAssociations(keywords : [Text], itype : ?ItemTypes.Itype, status : ?ItemTypes.ItemStatus, page : Nat) : async [ItemWithAssociations] {
        let matchedItems = Array.filter<ItemTypes.Item>(
            items.getItems(),
            func(item) {
                itemMatchesFilters(item, itype, status) and itemMatchesAssociatedKeywords(item, keywords)
            },
        );
        let sortedItems = Array.sort<ItemTypes.Item>(
            matchedItems,
            func(a, b) { Int.compare(Int.abs(b.listime), Int.abs(a.listime)) },
        );
        Array.map<ItemTypes.Item, ItemWithAssociations>(
            Page.getArrayPage(sortedItems, page, default_page_size),
            itemWithAssociations,
        )
    };

    public query ({ caller }) func getMyItems(page : Nat) : async [ItemTypes.Item] {
        let titems = items.getUserItems(caller);
        Page.getArrayPage(titems, page, default_page_size)
    };

    public query func getItem(id : Nat) : async ?ItemTypes.Item {
        items.retrieve(id)
    };

    //-----------------------  Service Info ---------------------------------------

    public shared ({ caller }) func createService(data : ServiceTypes.NewServiceInfo) : async Result.Result<ServiceTypes.ServiceId, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else {
            #ok(services.create(data, caller))
        }
    };

    public shared ({ caller }) func updateService(id : ServiceTypes.ServiceId, data : ServiceTypes.UpdateServiceInfo) : async Result.Result<ServiceTypes.ServiceId, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else {
            switch (services.retrieve(id)) {
                case (?service) {
                    if (service.owner == caller) { services.update(id, data) } else { #err("no permission") }
                };
                case null { #err("no service found") };
            }
        }
    };

    public shared ({ caller }) func deleteService(id : ServiceTypes.ServiceId) : async Result.Result<ServiceTypes.ServiceId, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else {
            switch (services.retrieve(id)) {
                case (?service) {
                    if (service.owner == caller) {
                        ignore services.delete(id);
                        #ok(id)
                    } else { #err("no permission") }
                };
                case null { #err("no service found") };
            }
        }
    };

    public query func getService(id : ServiceTypes.ServiceId) : async ?ServiceTypes.ServiceInfo {
        services.retrieve(id)
    };

    public query func listServices() : async [ServiceTypes.ServiceInfo] {
        services.list()
    };
    // public shared ({ caller }) func lockItem(id : Nat) : async Result.Result<Nat, Text> {
    //     if (Principal.isAnonymous(caller)) {
    //         #err("no authenticated")
    //     } else {
    //         items.lock(id, caller)
    //     }
    // };
    public shared ({ caller }) func deleteItem(id : Nat) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else {
            let item = items.retrieve(id);
            switch (item) {
                case (?item) {
                    if (item.owner == caller) {
                        let item = items.delete(id);
                        switch (item) {
                            case (?item) {
                                #ok(1)
                            };
                            case (_) {
                                #err("failed to delete")
                            }
                        }
                    } else {
                        #err("no permission")
                    }

                };
                case (_) {
                    #err("no item found")
                }
            };

        }
    };
    public shared ({ caller }) func changeItemStatus(id : Nat, status : ItemTypes.ItemStatus) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("no authenticated")
        } else {
            let item = items.retrieve(id);
            switch (item) {
                case (?item) {
                    if (item.owner == caller) {
                        items.updateStatus(id, status)
                    } else {
                        #err("no permission")
                    }

                };
                case (_) {
                    #err("no item found")
                }
            };

        };

    };

    // Owner directly transfers (delegates) an item to a specific recipient
    public shared ({ caller }) func delegateItem(id : Nat, recipient : Principal) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("not authenticated")
        } else if (Principal.isAnonymous(recipient)) {
            #err("invalid recipient")
        } else if (caller == recipient) {
            #err("cannot delegate to yourself")
        } else {
            let item = items.retrieve(id);
            switch (item) {
                case (?item) {
                    if (item.owner != caller) {
                        #err("no permission")
                    } else if (item.status != #list) {
                        #err("item is not available for delegation")
                    } else {
                        items.changeOwner(id, recipient)
                    }
                };
                case (_) {
                    #err("no item found")
                }
            }
        }
    };

    public shared ({ caller }) func claimFreeItem(itemId : Nat) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            #err("not authenticated")
        } else {
            let item = items.retrieve(itemId);
            switch (item) {
                case (?item) {
                    if (item.owner == caller) {
                        #err("cannot claim your own item")
                    } else if (item.price != 0) {
                        #err("item is not free")
                    } else if (item.status != #list) {
                        #err("item is not available")
                    } else {
                        let claimKey = Nat.toText(itemId) # ":" # Principal.toText(caller);
                        let hasExistingOpenClaim : Bool = switch (freeItemClaimIndex.get(claimKey)) {
                            case (?existingId) {
                                switch (freeItemClaims.get(existingId)) {
                                    case (?existing) {
                                        existing.closedAt == null and existing.canceledAt == null
                                    };
                                    case (null) { false }
                                }
                            };
                            case (null) { false }
                        };
                        if (hasExistingOpenClaim) {
                            #err("you already claimed this free item")
                        } else {
                            let claimId = nextFreeItemClaimId;
                            freeItemClaims.put(
                                claimId,
                                {
                                    id = claimId;
                                    itemId = itemId;
                                    itemName = item.name;
                                    seller = item.owner;
                                    buyer = caller;
                                    ctime = Time.now();
                                    comments = [];
                                    closedAt = null;
                                    canceledAt = null
                                },
                            );
                            freeItemClaimIndex.put(claimKey, claimId);
                            nextFreeItemClaimId := nextFreeItemClaimId + 1;
                            ignore sendNotification(item.owner, "Someone claimed your free item \"" # item.name # "\" (claim #" # Nat.toText(claimId) # ")", caller);
                            ignore sendNotification(caller, "Your claim #" # Nat.toText(claimId) # " for \"" # item.name # "\" has been submitted. The seller will be in touch.", item.owner);
                            #ok(claimId)
                        }
                    }
                };
                case (_) {
                    #err("no item found")
                }
            }
        }
    };

    public query ({ caller }) func getMyFreeItemClaims() : async [FreeItemClaim] {
        let claims = Buffer.Buffer<FreeItemClaim>(0);
        for (c in freeItemClaims.vals()) {
            if (c.seller == caller) {
                claims.add(c)
            }
        };
        Buffer.toArray(claims)
    };

    public query ({ caller }) func getMyBuyerFreeItemClaims() : async [FreeItemClaim] {
        let claims = Buffer.Buffer<FreeItemClaim>(0);
        for (c in freeItemClaims.vals()) {
            if (c.buyer == caller) {
                claims.add(c)
            }
        };
        Buffer.toArray(claims)
    };

    public shared ({ caller }) func commentOnClaim(claimId : Nat, text : Text) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("not authenticated")
        };
        switch (freeItemClaims.get(claimId)) {
            case (?claim) {
                if (claim.buyer != caller and claim.seller != caller) {
                    return #err("not authorized")
                };
                switch (claim.closedAt) {
                    case (?_) {
                        return #err("claim is closed")
                    };
                    case (null) {};
                };
                let newComment : Comment = {
                    user = caller;
                    comment = text;
                    ctime = Time.now()
                };
                let updated : FreeItemClaim = {
                    id = claim.id;
                    itemId = claim.itemId;
                    itemName = claim.itemName;
                    seller = claim.seller;
                    buyer = claim.buyer;
                    ctime = claim.ctime;
                    comments = Array.append(claim.comments, [newComment]);
                    closedAt = claim.closedAt;
                    canceledAt = claim.canceledAt
                };
                freeItemClaims.put(claimId, updated);
                let notifReceiver = if (caller == claim.seller) { claim.buyer } else { claim.seller };
                ignore sendNotification(notifReceiver, "New comment on free item claim #" # Nat.toText(claimId), caller);
                #ok(claimId)
            };
            case (null) {
                #err("claim not found")
            }
        }
    };

    public shared ({ caller }) func closeClaim(claimId : Nat) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("not authenticated")
        };
        switch (freeItemClaims.get(claimId)) {
            case (?claim) {
                if (claim.seller != caller) {
                    return #err("only the seller can close this claim")
                };
                switch (claim.closedAt) {
                    case (?_) {
                        return #err("claim already closed")
                    };
                    case (null) {};
                };
                let updated : FreeItemClaim = {
                    id = claim.id;
                    itemId = claim.itemId;
                    itemName = claim.itemName;
                    seller = claim.seller;
                    buyer = claim.buyer;
                    ctime = claim.ctime;
                    comments = claim.comments;
                    closedAt = ?Time.now();
                    canceledAt = claim.canceledAt
                };
                freeItemClaims.put(claimId, updated);
                ignore sendNotification(claim.buyer, "Your free item claim #" # Nat.toText(claimId) # " has been closed by the seller", caller);
                #ok(claimId)
            };
            case (null) {
                #err("claim not found")
            }
        }
    };

    // Buyer cancels their own claim (e.g. if the seller never responds).
    public shared ({ caller }) func cancelClaim(claimId : Nat) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("not authenticated")
        };
        switch (freeItemClaims.get(claimId)) {
            case (?claim) {
                if (claim.buyer != caller) {
                    return #err("only the buyer can cancel this claim")
                };
                switch (claim.closedAt) {
                    case (?_) { return #err("claim is already closed") };
                    case (null) {};
                };
                switch (claim.canceledAt) {
                    case (?_) { return #err("claim is already canceled") };
                    case (null) {};
                };
                let updated : FreeItemClaim = {
                    id = claim.id;
                    itemId = claim.itemId;
                    itemName = claim.itemName;
                    seller = claim.seller;
                    buyer = claim.buyer;
                    ctime = claim.ctime;
                    comments = claim.comments;
                    closedAt = claim.closedAt;
                    canceledAt = ?Time.now()
                };
                freeItemClaims.put(claimId, updated);
                ignore sendNotification(claim.seller, "Buyer canceled free item claim #" # Nat.toText(claimId) # " for \"" # claim.itemName # "\"", caller);
                #ok(claimId)
            };
            case (null) {
                #err("claim not found")
            }
        }
    };

    // ---------------------- Reputation ----------------------------------------

    // Internal helper: record that `giver` hearted `target`. Each call appends one entry,
    // so buf.size() reflects the total number of hearts received (one per completed claim).
    // The same giver may appear multiple times if they had multiple completed claims.
    func awardHeart(target : Principal, giver : Principal) {
        let targetText = Principal.toText(target);
        let giverText = Principal.toText(giver);
        switch (hearts.get(targetText)) {
            case (?buf) {
                buf.add(giverText)
            };
            case (null) {
                let buf = Buffer.Buffer<Text>(1);
                buf.add(giverText);
                hearts.put(targetText, buf)
            }
        }
    };

    // A buyer gives a ❤️ for a specific closed free-item claim. Each claim can earn exactly one heart.
    public shared ({ caller }) func heartUser(target : Principal, claimId : Nat) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("not authenticated")
        };
        if (caller == target) {
            return #err("cannot heart yourself")
        };
        switch (freeItemClaims.get(claimId)) {
            case (null) {
                return #err("claim not found")
            };
            case (?claim) {
                if (claim.buyer != caller) {
                    return #err("you can only heart a seller after receiving their item")
                };
                if (claim.seller != target) {
                    return #err("claim does not match the target seller")
                };
                if (claim.closedAt == null) {
                    return #err("claim must be closed before giving a heart")
                };
                if (claim.canceledAt != null) {
                    return #err("cannot heart for a canceled claim")
                };
                if (heartedClaims.get(claimId) != null) {
                    return #err("you have already given a heart for this claim")
                };
                heartedClaims.put(claimId, true);
                awardHeart(target, caller);
                let targetText = Principal.toText(target);
                let count = switch (hearts.get(targetText)) {
                    case (?buf) { buf.size() };
                    case (null) { 0 }
                };
                ignore sendNotification(target, "You received a ❤️", caller);
                #ok(count)
            }
        }
    };

    // Buyer of a released order leaves a 1–5 star review for the seller.
    public shared ({ caller }) func leaveReview(orderId : Nat, rating : Nat, comment : Text) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("not authenticated")
        };
        if (rating < 1 or rating > 5) {
            return #err("rating must be between 1 and 5")
        };
        switch (reviewByOrder.get(orderId)) {
            case (?_) {
                return #err("order already reviewed")
            };
            case (null) {}
        };
        let order = orders.get(orderId);
        switch (order) {
            case (?o) {
                if (o.buyer != caller) {
                    return #err("only the buyer can leave a review")
                };
                if (o.status != #released) {
                    return #err("order must be released before reviewing")
                };
                let rid = nextReviewId;
                let rev : Review = {
                    id = rid;
                    orderId = orderId;
                    reviewer = caller;
                    target = o.seller;
                    rating = rating;
                    comment = comment;
                    ctime = Time.now()
                };
                reviews.put(rid, rev);
                reviewByOrder.put(orderId, rid);
                nextReviewId := nextReviewId + 1;
                ignore sendNotification(o.seller, "You received a new review on escrow order #" # Nat.toText(orderId), caller);
                #ok(rid)
            };
            case (null) {
                #err("order not found")
            }
        }
    };

    // Returns all reviews targeting a user, newest first.
    public query func getUserReviews(user : Principal) : async [Review] {
        let buf = Buffer.Buffer<Review>(0);
        for (r in reviews.vals()) {
            if (r.target == user) { buf.add(r) }
        };
        let arr = Buffer.toArray(buf);
        Array.sort<Review>(arr, func(a, b) { Int.compare(b.ctime, a.ctime) })
    };

    // Returns aggregated reputation stats for a user.
    public query func getUserStats(user : Principal) : async UserStats {
        let targetText = Principal.toText(user);

        let heartsReceived = switch (hearts.get(targetText)) {
            case (?buf) { buf.size() };
            case (null) { 0 }
        };

        var salesCompleted : Nat = 0;
        var purchasesCompleted : Nat = 0;
        for (o in orders.vals()) {
            if (o.status == #released) {
                if (o.seller == user) { salesCompleted += 1 };
                if (o.buyer == user) { purchasesCompleted += 1 };
            }
        };

        var reviewCount : Nat = 0;
        var ratingSum : Nat = 0;
        for (r in reviews.vals()) {
            if (r.target == user) {
                reviewCount += 1;
                ratingSum += r.rating;
            }
        };

        let avgRating : Float = if (reviewCount == 0) {
            0.0
        } else {
            Float.fromInt(ratingSum) / Float.fromInt(reviewCount)
        };

        {
            heartsReceived;
            salesCompleted;
            purchasesCompleted;
            reviewCount;
            ratingSum;
            avgRating
        }
    };

    /**
    system
    **/
    system func preupgrade() {
        upgradeOrders := Iter.toArray(orders.entries());
        upgradeOrderContexts := Iter.toArray(orderContexts.entries());
        upgradeOrderCreators := Iter.toArray(orderCreatorSet.keys());
        _upgradeItemId := items.toStableId();
        _upgradeItemsV4 := items.toStable();
        _upgradeItemsV3 := []; // clear old migration source
        _upgradeItemsV2 := []; // clear old migration source
        _upgradeItems := []; // clear old migration source
        _upgradeServiceId := services.toStableId();
        _upgradeServices := services.toStable();
        upgradeFreeItemClaimsV4 := Iter.toArray(freeItemClaims.entries());
        upgradeFreeItemClaimsV3 := []; // clear old migration source
        upgradeFreeItemClaimsV2 := []; // clear old migration source

        // Reputation persistence
        upgradeReviews := Iter.toArray(reviews.entries());
        upgradeHearts := Array.map<(Text, Buffer.Buffer<Text>), (Text, [Text])>(
            Iter.toArray(hearts.entries()),
            func((k, v) : (Text, Buffer.Buffer<Text>)) : (Text, [Text]) {
                (k, Buffer.toArray(v))
            },
        );
        upgradeHeartedClaims := Iter.toArray(heartedClaims.keys());
        // Stablecoin registry persistence
        upgradeStablecoins := Iter.toArray(stablecoins.entries());
        // Admin set persistence
        upgradeAdmins := Iter.toArray(adminSet.keys());
    };

    system func postupgrade() {
        _upgradeItems := [];
        _upgradeItemsV2 := [];
        _upgradeItemsV3 := [];
        _upgradeItemsV4 := [];
        upgradeFreeItemClaimsV3 := []; // ensure old migration source stays cleared
        upgradeFreeItemClaimsV2 := [];
    };

    public query func getBackupItems() : async [UpgradeTypes.U_Item] {
        backupItems
    };

    public query func getItemsSize() : async Nat {
        items.getItems().size()
    };

    public query func availableCycles() : async Nat {
        return Cycles.balance()
    };
    public query func getSystemData() : async {
        cycles : Nat;
        memory : Nat;
        heap : Nat
    } {
        return {
            cycles = Cycles.balance();
            memory = Prim.rts_memory_size();
            heap = Prim.rts_heap_size()
        }
    }
}
