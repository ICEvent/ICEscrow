import Prim "mo:prim";

import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Float "mo:base/Float";
import Hash "mo:base/Hash";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
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

import CRC32 "CRC32";
import SHA224 "SHA224";
import Account "./account";
import Hex "./hex";
import Types "./types";
import Utils "./utils";

import ICETTypes "./ICETTypes";

import Page "./page";

import ItemTypes "./list/types";
import Items "./list";

import UpgradeTypes "./list/upgradeTypes";

persistent actor class EscrowService() = this {

    type Order = Types.Order;
    type NewOrder = Types.NewOrder;
    type NewSellOrder = Types.NewSellOrder;
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

    type FreeItemClaim = {
        id : Nat;
        itemId : Nat;
        itemName : Text;
        seller : Principal;
        buyer : Principal;
        ctime : Int;
        comments : [Comment];
        closedAt : ?Int
    };

    // transfer fee ICP
    transient let FEE : Nat64 = 10_000;
    transient let E8S : Nat64 = 10_000_000;

    stable var default_page_size = 20;

    stable var ESCROW_FEE : Nat64 = 0;

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

    stable var nextSubAccount : Nat = 1;
    stable var nextOrderId : Nat = 1;
    stable var upgradeOrders : [(Nat, Order)] = [];

    stable var _upgradeItemId : Nat = 1;
    stable var _upgradeItems : [(Nat, ItemTypes.Item)] = [];
    stable var nextFreeItemClaimId : Nat = 1;
    // upgradeFreeItemClaims (old name, deployed without `comments`) is intentionally dropped.
    // Dropping a stable var is a WARNING (data loss) not an ERROR — and the live canister
    // had zero claims since claimFreeItem was never successfully deployed.
    //
    // upgradeFreeItemClaimsV2 used the type WITHOUT closedAt. It is kept here with the old
    // type so stable memory deserialises correctly, then migrated to V3 during init.
    stable var upgradeFreeItemClaimsV2 : [(Nat, OldFreeItemClaimV2)] = [];
    // New stable store — FreeItemClaim now includes closedAt.
    stable var upgradeFreeItemClaimsV3 : [(Nat, FreeItemClaim)] = [];

    //backukp
    stable var backupItems : [UpgradeTypes.U_Item] = [];

    // Reputation stable storage
    stable var nextReviewId : Nat = 1;
    stable var upgradeReviews : [(Nat, Review)] = [];
    // hearts: target principal text → array of giver principal texts
    stable var upgradeHearts : [(Text, [Text])] = [];

    transient var orders = TrieMap.TrieMap<Nat, Order>(Nat.equal, Hash.hash);
    orders := TrieMap.fromEntries<Nat, Order>(Iter.fromArray(upgradeOrders), Nat.equal, Hash.hash);

    transient let items = Items.Items(_upgradeItemId, _upgradeItems);
    transient var freeItemClaims = TrieMap.TrieMap<Nat, FreeItemClaim>(Nat.equal, Hash.hash);
    freeItemClaims := if (upgradeFreeItemClaimsV2.size() > 0) {
        // One-time migration: add closedAt = null to every existing claim.
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
                })
            },
        );
        TrieMap.fromEntries<Nat, FreeItemClaim>(Iter.fromArray(migrated), Nat.equal, Hash.hash)
    } else {
        TrieMap.fromEntries<Nat, FreeItemClaim>(Iter.fromArray(upgradeFreeItemClaimsV3), Nat.equal, Hash.hash)
    };
    transient var freeItemClaimIndex = TrieMap.TrieMap<Text, Nat>(Text.equal, Text.hash);
    for (claim in freeItemClaims.vals()) {
        let key = Nat.toText(claim.itemId) # ":" # Principal.toText(claim.buyer);
        freeItemClaimIndex.put(key, claim.id);
    };

    // Reputation transient maps
    transient var reviews = TrieMap.TrieMap<Nat, Review>(Nat.equal, Hash.hash);
    reviews := TrieMap.fromEntries<Nat, Review>(Iter.fromArray(upgradeReviews), Nat.equal, Hash.hash);

    // reviewByOrder index: orderId → reviewId (ensures one review per order)
    transient var reviewByOrder = TrieMap.TrieMap<Nat, Nat>(Nat.equal, Hash.hash);
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

    public shared ({ caller }) func buy(newOrder : NewOrder) : async Result.Result<Nat, Text> {

        if (Principal.isAnonymous(caller)) {

            #err("no authenticated")
        } else if (newOrder.memo == "") {
            #err("memo is required")
        } else {
            let orderid = nextOrderId;

            orders.put(
                orderid,
                {
                    id = orderid;
                    buyer = caller;
                    seller = newOrder.seller;
                    memo = newOrder.memo;
                    amount = newOrder.amount;
                    currency = newOrder.currency;
                    account = getNewAccountId();
                    blockin = 0;
                    blockout = 0;
                    status = #new;
                    expiration = newOrder.expiration;
                    createtime = Time.now();
                    updatetime = Time.now();
                    lockedby = caller;
                    comments = [];
                    logs = [{
                        ltime = Time.now();
                        log = "create buying order";
                        logger = #buyer
                    }]
                },
            );

            nextOrderId := nextOrderId + 1;
            ignore sendNotification(newOrder.seller, "New escrow order #" # Nat.toText(orderid) # " has been created", caller);
            #ok(orderid)
        };

    };
    public shared ({ caller }) func sell(newOrder : NewSellOrder) : async Result.Result<Nat, Text> {

        if (Principal.isAnonymous(caller)) {

            #err("no authenticated")
        } else if (newOrder.memo == "") {
            #err("memo is required")
        } else {
            let orderid = nextOrderId;

            orders.put(
                orderid,
                {
                    id = orderid;
                    buyer = newOrder.buyer;
                    seller = caller;
                    memo = newOrder.memo;
                    amount = newOrder.amount;
                    currency = newOrder.currency;
                    account = getNewAccountId();
                    blockin = 0;
                    blockout = 0;
                    status = #new;
                    expiration = newOrder.expiration;
                    createtime = Time.now();
                    updatetime = Time.now();
                    lockedby = caller;
                    comments = [];
                    logs = [{
                        ltime = Time.now();
                        log = "create selling order";
                        logger = #buyer
                    }]
                },
            );

            nextOrderId := nextOrderId + 1;
            ignore sendNotification(newOrder.buyer, "New escrow order #" # Nat.toText(orderid) # " has been created for you", caller);
            #ok(orderid)
        };

    };
    //buyer create a new order
    public shared ({ caller }) func create(newOrder : NewOrder) : async Result.Result<Nat, Text> {

        if (Principal.isAnonymous(caller)) {

            #err("no authenticated")
        } else if (newOrder.memo == "") {
            #err("memo is required")
        } else {
            let orderid = nextOrderId;

            orders.put(
                orderid,
                {
                    id = orderid;
                    buyer = caller;
                    seller = newOrder.seller;
                    memo = newOrder.memo;
                    amount = newOrder.amount;
                    currency = newOrder.currency;
                    account = getNewAccountId();
                    blockin = 0;
                    blockout = 0;
                    status = #new;
                    expiration = newOrder.expiration;
                    createtime = Time.now();
                    updatetime = Time.now();
                    lockedby = caller;
                    comments = [];
                    logs = [{
                        ltime = Time.now();
                        log = "create order";
                        logger = #buyer
                    }]
                },
            );

            nextOrderId := nextOrderId + 1;
            ignore sendNotification(newOrder.seller, "New escrow order #" # Nat.toText(orderid) # " has been created", caller);
            #ok(orderid)
        };

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
                    let bb = await accountBalance(order.account.id, order.currency);
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

                        if (order.currency == #ICP) {
                            //NO CHARGE FOR ICET
                            amount := amount - ESCROW_FEE
                        };

                        let trans = await transfer({
                            memo = 1;
                            from = order.account.index;
                            to = Account.getAccountTextId(order.seller, 0);
                            amount = amount;
                            currency = order.currency
                        });
                        switch (trans) {
                            case (#ok(block)) {
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
                        if (order.currency == #ICP) {
                            //NO CHARGE FOR ICET
                            balance := balance - ESCROW_FEE
                        };

                        let r = await transfer({
                            memo = 1;
                            from = order.account.index;
                            to = Account.getAccountTextId(order.buyer, 0);
                            amount = balance;
                            currency = order.currency
                        });
                        switch (r) {
                            case (#ok(block)) {
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

                    if (order.currency == #ICP) {
                        //NO CHARGE FOR ICET
                        balance := balance - FEE - ESCROW_FEE
                    };

                    let r = await transfer({
                        memo = 1;
                        from = order.account.index;
                        to = Account.getAccountTextId(order.buyer, 0);
                        amount = balance;
                        currency = order.currency
                    });
                    switch (r) {
                        case (#ok(block)) {
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
        }

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
        await accountBalance(Utils.accountIdToHex(Account.accountIdentifier(getPrincipal(), sublob)), currency)

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

            }
        };

    };

    func transfer(r : TransferRequest) : async Result.Result<Nat64, Text> {

        if (r.currency == #ICP) {
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
        } else {
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
                case (#ok(b)) {
                    #ok(1)
                };
                case (#err(e)) {

                    switch (e) {
                        case (#CannotNotify(e)) {
                            #err("CannotNotify")
                        };
                        case (#InsufficientBalance) {
                            #err("InsufficientBalance")
                        };
                        case (#InvalidToken(e)) {
                            #err("InvalidToken")
                        };
                        case (#Rejected) {
                            #err("Rejected")
                        };
                        case (#Unauthorized(e)) {
                            #err("Unauthorized")
                        };
                        case (#Other(o)) {
                            #err(o)
                        }
                    }

                }
            }
        }
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

    func accIdTextKey(s : AccountIdText) : Trie.Key<AccountIdText> {
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

    public query func searchItems(itype : ItemTypes.Itype, page : Nat) : async [ItemTypes.Item] {
        let titems = items.getTypeItems(itype);
        Page.getArrayPage(titems, page, default_page_size)
    };

    public query func getItems(page : Nat) : async [ItemTypes.Item] {
        let titems = items.getItems();
        let sortedItems = Array.sort<ItemTypes.Item>(
            titems,
            func(a, b) { Int.compare(Int.abs(b.listime), Int.abs(a.listime)) },
        );
        Page.getArrayPage(sortedItems, page, default_page_size)
    };

    public query ({ caller }) func getMyItems(page : Nat) : async [ItemTypes.Item] {
        let titems = items.getUserItems(caller);
        Page.getArrayPage(titems, page, default_page_size)
    };

    public query func getItem(id : Nat) : async ?ItemTypes.Item {
        items.retrieve(id)
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
                        switch (freeItemClaimIndex.get(claimKey)) {
                            case (?_) {
                                #err("you already claimed this free item")
                            };
                            case (null) {
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
                                        closedAt = null
                                    },
                                );
                                freeItemClaimIndex.put(claimKey, claimId);
                                nextFreeItemClaimId := nextFreeItemClaimId + 1;
                                ignore sendNotification(item.owner, "Someone claimed your free item \"" # item.name # "\" (claim #" # Nat.toText(claimId) # ")", caller);
                                ignore sendNotification(caller, "Your claim #" # Nat.toText(claimId) # " for \"" # item.name # "\" has been submitted. The seller will be in touch.", item.owner);
                                #ok(claimId)
                            }
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
                    closedAt = claim.closedAt
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
                    closedAt = ?Time.now()
                };
                freeItemClaims.put(claimId, updated);
                // Award the seller (item giver) a ❤️ from the buyer when a free-item claim is closed.
                awardHeart(claim.seller, claim.buyer);
                ignore sendNotification(claim.buyer, "Your free item claim #" # Nat.toText(claimId) # " has been closed by the seller", caller);
                #ok(claimId)
            };
            case (null) {
                #err("claim not found")
            }
        }
    };

    // ---------------------- Reputation ----------------------------------------

    // Internal helper: record that `giver` hearted `target` (idempotent).
    func awardHeart(target : Principal, giver : Principal) {
        let targetText = Principal.toText(target);
        let giverText = Principal.toText(giver);
        switch (hearts.get(targetText)) {
            case (?buf) {
                // Only add if giver not already present
                let alreadyGiven = Buffer.contains<Text>(buf, giverText, Text.equal);
                if (not alreadyGiven) {
                    buf.add(giverText)
                }
            };
            case (null) {
                let buf = Buffer.Buffer<Text>(1);
                buf.add(giverText);
                hearts.put(targetText, buf)
            }
        }
    };

    // Anyone (authenticated) can give a ❤️ to a user.
    public shared ({ caller }) func heartUser(target : Principal) : async Result.Result<Nat, Text> {
        if (Principal.isAnonymous(caller)) {
            return #err("not authenticated")
        };
        if (caller == target) {
            return #err("cannot heart yourself")
        };
        awardHeart(target, caller);
        let targetText = Principal.toText(target);
        let count = switch (hearts.get(targetText)) {
            case (?buf) { buf.size() };
            case (null) { 0 }
        };
        ignore sendNotification(target, "You received a ❤️", caller);
        #ok(count)
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
        _upgradeItemId := items.toStableId();
        _upgradeItems := items.toStable();
        upgradeFreeItemClaimsV3 := Iter.toArray(freeItemClaims.entries());
        upgradeFreeItemClaimsV2 := []; // clear old migration source

        // Reputation persistence
        upgradeReviews := Iter.toArray(reviews.entries());
        upgradeHearts := Array.map<(Text, Buffer.Buffer<Text>), (Text, [Text])>(
            Iter.toArray(hearts.entries()),
            func((k, v) : (Text, Buffer.Buffer<Text>)) : (Text, [Text]) {
                (k, Buffer.toArray(v))
            },
        );
    };

    system func postupgrade() {
        _upgradeItems := [];
        upgradeFreeItemClaimsV2 := []; // ensure old migration source stays cleared
    };

    public query func getBackupItems() : async [UpgradeTypes.U_Item] {
        backupItems
    };

    public query func getItemsSize() : async Nat {
        _upgradeItems.size()
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
