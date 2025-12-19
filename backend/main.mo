import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import TrieMap "mo:base/TrieMap";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

actor Escrow {

let TOKEN_CANISTER : Principal =  Principal.fromText("xevnm-gaaaa-aaaar-qafnq-cai"); //ckUSDC

  /*************************
   * Types
   *************************/

  public type AssetType = {
    #Physical;
    #Invoice;
    #Equity;
    #Service;
  };

  public type Asset = {
    assetId : Text;
    assetType : AssetType;
    proofHash : Blob; // hash of contract / invoice / document
  };

  public type Status = {
    #new;
    #funded;
    #delivered;
    #received;
    #released;
    #disputed;
    #canceled;
    #expired;
    #closed;
  };

  public type Order = {
    id : Nat;
    buyer : Principal;
    seller : Principal;
    amount : Nat64;
    asset : Asset;
    status : Status;
    createdAt : Int;
    updatedAt : Int;
    note : Text;
  };

  public type Dispute = {
    reason : Text;
    createdAt : Int;
  };

  /*************************
   * Storage
   *************************/

  stable var nextOrderId : Nat = 0;

  let orders = TrieMap.TrieMap<Nat, Order>(Nat.equal, Nat.hash);
  let disputes = TrieMap.TrieMap<Nat, Dispute>(Nat.equal, Nat.hash);

  // simple balance accounting (mock, replace with ledger integration)
  let balances = TrieMap.TrieMap<Principal, Nat64>(
    Principal.equal,
    Principal.hash
  );

  // arbitrator (can be DAO later)
  stable var arbitrator : Principal = Principal.fromText(
    "aaaaa-aa"
  );

  let ESCROW_FEE : Nat64 = 10_000; // example fee

  /*************************
   * Helpers
   *************************/

  func now() : Int { Time.now() };

  func getBalance(p : Principal) : Nat64 {
    switch (balances.get(p)) {
      case (?b) b;
      case null 0;
    }
  };

  func addBalance(p : Principal, a : Nat64) {
    balances.put(p, getBalance(p) + a);
  };

  func subBalance(p : Principal, a : Nat64) : Bool {
    let b = getBalance(p);
    if (b < a) { return false };
    balances.put(p, b - a);
    true
  };

  func only(status : Status, expected : Status) : Bool {
    status == expected
  };

  /*************************
   * Create Order
   *************************/

  public shared ({ caller }) func createOrder(
    seller : Principal,
    amount : Nat64,
    asset : Asset,
    note : Text
  ) : async Result.Result<Nat, Text> {

    if (amount == 0) return #err("amount must be > 0");

    let id = nextOrderId;
    nextOrderId += 1;

    let order : Order = {
      id = id;
      buyer = caller;
      seller = seller;
      amount = amount;
      asset = asset;
      status = #new;
      createdAt = now();
      updatedAt = now();
      note = note;
    };

    orders.put(id, order);
    #ok(id)
  };

  /*************************
   * Fund (Buyer)
   *************************/

  public shared ({ caller }) func fund(
  orderId : Nat
) : async Result.Result<(), Text> {

  let token : ICRC2 = actor (Principal.toText(TOKEN_CANISTER));

  switch (orders.get(orderId)) {
    case null return #err("order not found");
    case (?o) {
      if (caller != o.buyer) return #err("only buyer");
      if (o.status != #new) return #err("wrong status");

      let res = await token.icrc2_transfer_from({
        spender_subaccount = null;
        from = {
          owner = o.buyer;
          subaccount = null;
        };
        to = {
          owner = Principal.fromActor(Escrow);
          subaccount = null;
        };
        amount = Nat64.toNat(o.amount);
        fee = null;
        memo = null;
        created_at_time = null;
      });

      switch (res) {
        case (#Ok _) {
          orders.put(orderId, {
            o with
            status = #funded;
            updatedAt = now();
          });
          #ok()
        };
        case (#Err e) {
          #err("transfer_from failed")
        };
      }
    }
  }
}


  /*************************
   * Deliver (Seller)
   *************************/

  public shared ({ caller }) func deliver(
    orderId : Nat
  ) : async Result.Result<(), Text> {

    switch (orders.get(orderId)) {
      case null return #err("order not found");
      case (?o) {
        if (caller != o.seller) return #err("only seller");
        if (o.status != #funded) return #err("wrong status");

        orders.put(orderId, {
          o with
          status = #delivered;
          updatedAt = now();
        });

        #ok()
      }
    }
  };

  /*************************
   * Receive (Buyer)
   *************************/

  public shared ({ caller }) func receive(
    orderId : Nat
  ) : async Result.Result<(), Text> {

    switch (orders.get(orderId)) {
      case null return #err("order not found");
      case (?o) {
        if (caller != o.buyer) return #err("only buyer");
        if (o.status != #delivered) return #err("wrong status");

        orders.put(orderId, {
          o with
          status = #received;
          updatedAt = now();
        });

        #ok()
      }
    }
  };

  /*************************
   * Release Funds
   *************************/

 public shared ({ caller }) func release(
  orderId : Nat
) : async Result.Result<(), Text> {

  let token : ICRC1 = actor (Principal.toText(TOKEN_CANISTER));

  switch (orders.get(orderId)) {
    case null return #err("order not found");
    case (?o) {
      if (caller != o.buyer) return #err("only buyer");
      if (o.status != #received) return #err("wrong status");

      let payout =
        if (o.amount > ESCROW_FEE)
          o.amount - ESCROW_FEE
        else
          0;

      let res = await token.icrc1_transfer({
        to = {
          owner = o.seller;
          subaccount = null;
        };
        amount = Nat64.toNat(payout);
        fee = null;
        memo = null;
        from_subaccount = null;
        created_at_time = null;
      });

      switch (res) {
        case (#Ok _) {
          orders.put(orderId, {
            o with
            status = #released;
            updatedAt = now();
          });
          #ok()
        };
        case (#Err _) {
          #err("payout failed")
        };
      }
    }
  }
}


  /*************************
   * Dispute
   *************************/

  public shared ({ caller }) func dispute(
    orderId : Nat,
    reason : Text
  ) : async Result.Result<(), Text> {

    switch (orders.get(orderId)) {
      case null return #err("order not found");
      case (?o) {
        if (caller != o.buyer and caller != o.seller) {
          return #err("no permission");
        };
        if (o.status != #funded and o.status != #delivered) {
          return #err("cannot dispute now");
        };

        disputes.put(orderId, {
          reason = reason;
          createdAt = now();
        });

        orders.put(orderId, {
          o with
          status = #disputed;
          updatedAt = now();
        });

        #ok()
      }
    }
  };

  /*************************
   * Arbitration
   *************************/

  public shared ({ caller }) func arbitrate(
    orderId : Nat,
    winner : { #buyer; #seller }
  ) : async Result.Result<(), Text> {

    if (caller != arbitrator) return #err("not arbitrator");

    switch (orders.get(orderId)) {
      case null return #err("order not found");
      case (?o) {
        if (o.status != #disputed) return #err("not disputed");

        switch (winner) {
          case (#buyer) {
            await token.icrc1_transfer({
      to = { owner = o.buyer; subaccount = null };
      amount = Nat64.toNat(o.amount);
      fee = null;
      memo = null;
      from_subaccount = null;
      created_at_time = null;
    });
          };
          case (#seller) {
            let payout =
              if (o.amount > ESCROW_FEE)
                o.amount - ESCROW_FEE
              else 0;
            addBalance(o.seller, payout);
          };
        };

        orders.put(orderId, {
          o with
          status = #closed;
          updatedAt = now();
        });

        #ok()
      }
    }
  };

  /*************************
   * Views
   *************************/

  public query func getOrder(id : Nat) : async ?Order {
    orders.get(id)
  };

  public query func myBalance(p : Principal) : async Nat64 {
    getBalance(p)
  };

}
