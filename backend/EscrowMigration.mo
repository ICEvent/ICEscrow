import Array "mo:base/Array";

/// Explicit migration module for the FreeItemClaim stable variable.
///
/// The deployed canister has:
///   upgradeFreeItemClaims : [(Nat, FreeItemClaim)]
/// where FreeItemClaim had no `comments` field.
///
/// This migration:
///   - consumes the old `upgradeFreeItemClaims`
///   - produces new `upgradeFreeItemClaimsV2` with `comments = []` for every entry
module {

    // Old deployed type (no comments field)
    type OldFreeItemClaim = {
        id : Nat;
        itemId : Nat;
        itemName : Text;
        seller : Principal;
        buyer : Principal;
        ctime : Int;
    };

    // New type (with comments field)
    type NewFreeItemClaim = {
        id : Nat;
        itemId : Nat;
        itemName : Text;
        seller : Principal;
        buyer : Principal;
        ctime : Int;
        comments : [{ ctime : Int; user : Principal; comment : Text }];
    };

    public func migration(
        old : { var upgradeFreeItemClaims : [(Nat, OldFreeItemClaim)] }
    ) : { var upgradeFreeItemClaimsV2 : [(Nat, NewFreeItemClaim)] } {
        {
            var upgradeFreeItemClaimsV2 = Array.map<(Nat, OldFreeItemClaim), (Nat, NewFreeItemClaim)>(
                old.upgradeFreeItemClaims,
                func((k, v) : (Nat, OldFreeItemClaim)) : (Nat, NewFreeItemClaim) {
                    (k, {
                        id = v.id;
                        itemId = v.itemId;
                        itemName = v.itemName;
                        seller = v.seller;
                        buyer = v.buyer;
                        ctime = v.ctime;
                        comments = []
                    })
                }
            )
        }
    };

}
