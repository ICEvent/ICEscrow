import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import TrieMap "mo:base/TrieMap";
import Result "mo:base/Result";
import Iter "mo:base/Iter";

actor ArbitrationDAO {

  /*************************
   * Types
   *************************/

  public type Vote = { #buyer; #seller };

  public type Dispute = {
    orderId : Nat;
    escrow : Principal;
    createdAt : Int;
    votesBuyer : Nat;
    votesSeller : Nat;
    voters : TrieMap.TrieMap<Principal, Vote>;
    resolved : Bool;
  };

  /*************************
   * Storage
   *************************/

  stable var nextDisputeId : Nat = 0;

  let disputes =
    TrieMap.TrieMap<Nat, Dispute>(Nat.equal, Nat.hash);

  let members =
    TrieMap.TrieMap<Principal, Bool>(
      Principal.equal,
      Principal.hash
    );

  stable var quorum : Nat = 3; // minimum votes

  /*************************
   * Init
   *************************/

  system func init() {
    // demo members, replace with DAO logic
    members.put(Principal.fromText("aaaaa-aa"), true);
  };

  func now() : Int { Time.now() };

  func isMember(p : Principal) : Bool {
    members.get(p) == ?true
  };

  /*************************
   * Dispute lifecycle
   *************************/

  public shared ({ caller }) func openDispute(
    orderId : Nat,
    escrow : Principal
  ) : async Result.Result<Nat, Text> {

    if (!isMember(caller))
      return #err("only DAO member");

    let id = nextDisputeId;
    nextDisputeId += 1;

    let d : Dispute = {
      orderId = orderId;
      escrow = escrow;
      createdAt = now();
      votesBuyer = 0;
      votesSeller = 0;
      voters =
        TrieMap.TrieMap<Principal, Vote>(
          Principal.equal,
          Principal.hash
        );
      resolved = false;
    };

    disputes.put(id, d);
    #ok(id)
  };

  public shared ({ caller }) func vote(
    disputeId : Nat,
    v : Vote
  ) : async Result.Result<(), Text> {

    if (!isMember(caller))
      return #err("not DAO member");

    switch (disputes.get(disputeId)) {
      case null return #err("dispute not found");
      case (?d) {

        if (d.resolved)
          return #err("already resolved");

        if (d.voters.get(caller) != null)
          return #err("already voted");

        let newBuyer =
          if (v == #buyer) d.votesBuyer + 1 else d.votesBuyer;

        let newSeller =
          if (v == #seller) d.votesSeller + 1 else d.votesSeller;

        d.voters.put(caller, v);

        let updated : Dispute = {
          d with
          votesBuyer = newBuyer;
          votesSeller = newSeller;
        };

        disputes.put(disputeId, updated);

        #ok()
      }
    }
  };

  /*************************
   * Resolve
   *************************/

  public shared func resolve(
    disputeId : Nat
  ) : async Result.Result<(), Text> {

    switch (disputes.get(disputeId)) {
      case null return #err("dispute not found");
      case (?d) {

        if (d.resolved)
          return #err("already resolved");

        let totalVotes = d.votesBuyer + d.votesSeller;
        if (totalVotes < quorum)
          return #err("quorum not reached");

        let winner =
          if (d.votesBuyer >= d.votesSeller)
            #buyer
          else
            #seller;

        let escrow =
          actor (Principal.toText(d.escrow)) : actor {
            arbitrate :
              (Nat, { #buyer; #seller }) -> async Result.Result<(), Text>;
          };

        let res = await escrow.arbitrate(d.orderId, winner);

        switch (res) {
          case (#ok _) {
            disputes.put(disputeId, {
              d with resolved = true
            });
            #ok()
          };
          case (#err e) {
            #err("escrow execution failed")
          };
        }
      }
    }
  };

}
