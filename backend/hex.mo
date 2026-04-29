/* credit: https://github.com/Toniq-Labs/extendable-token/blob/main/motoko/util/Hex.mo */

import Array    "mo:base/Array";
import Char     "mo:base/Char";
import Hash     "mo:base/Hash";
import HashMap  "mo:base/HashMap";
import Iter     "mo:base/Iter";
import Nat      "mo:base/Nat";
import Nat8     "mo:base/Nat8";
import Nat32    "mo:base/Nat32";
import Text     "mo:base/Text";

module {

    private func natHash(n : Nat) : Hash.Hash { Text.hash(Nat.toText(n)) };

    private let symbols = [
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
    ];
    private let base : Nat8 = 0x10;

    public func encode(array : [Nat8]) : Text {
        func nat8ToText(u8: Nat8) : Text {
            let c1 = symbols[Nat8.toNat((u8/base))];
            let c2 = symbols[Nat8.toNat((u8%base))];
            return Char.toText(c1) # Char.toText(c2);
        };
        Array.foldLeft<Nat8, Text>(array, "", func (accum, u8) {
            accum # nat8ToText(u8);
        });
    };

    /* credit https://github.com/dfinance-tech/motoko-token/blob/ledger/src/Utils.mo */
    public func decode(t : Text) : [Nat8] {
        var map = HashMap.HashMap<Nat, Nat8>(1, Nat.equal, natHash);
        // '0': 48 -> 0; '9': 57 -> 9
        for (num in Iter.range(48, 57)) {
            map.put(num, Nat8.fromNat(num-48));
        };
        // 'a': 97 -> 10; 'f': 102 -> 15
        for (lowcase in Iter.range(97, 102)) {
            map.put(lowcase, Nat8.fromNat(lowcase-97+10));
        };
        // 'A': 65 -> 10; 'F': 70 -> 15
        for (uppercase in Iter.range(65, 70)) {
            map.put(uppercase, Nat8.fromNat(uppercase-65+10));
        };
        let p = Iter.toArray(Iter.map(Text.toIter(t), func (x: Char) : Nat { Nat32.toNat(Char.toNat32(x)) }));
        var res : [var Nat8] = [var];       
        for (i in Iter.range(0, 31)) {            
            let a = switch (map.get(p[i*2])) { case (?v) v; case null { assert false; (0:Nat8) } };
            let b = switch (map.get(p[i*2 + 1])) { case (?v) v; case null { assert false; (0:Nat8) } };
            let c = 16*a + b;
            res := Array.thaw(Array.append(Array.freeze(res), Array.make(c)));
        };
        let result = Array.freeze(res);
        return result;
    };
};