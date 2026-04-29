import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Result "mo:base/Result";
import TrieMap "mo:base/TrieMap";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";
import Hash "mo:base/Hash";
import Text "mo:base/Text";

import Types "types";


module{

    private func natHash(n : Nat) : Hash.Hash { Text.hash(Nat.toText(n)) };

    type Item = Types.Item;
    type NewItem = Types.NewItem;
    type Status = Types.ItemStatus;
    type Itype = Types.Itype;

    public class Items(stableItemId: Nat, stableItems: [(Nat,Item)]){

        //init states
        private var nextId: Nat = stableItemId;
        private var items = TrieMap.TrieMap<Nat, Item>(Nat.equal, natHash);
        items := TrieMap.fromEntries<Nat, Item>(Iter.fromArray(stableItems), Nat.equal, natHash);
        

        public func toStable(): [(Nat,Item)] {
             Iter.toArray(items.entries());
        };

        public func toStableId(): Nat{
            nextId
        };
        


        //add new item
        public func create(newData: NewItem, owner: Principal): Nat {
            let id = nextId;
            let item = {
                id = id;
                 name = newData.name;
                 description = newData.description;
                image = newData.image;
                itype = newData.itype;
                price  = newData.price;
                currency  = newData.currency;
                status = newData.status;
                owner = owner;
                listime = Time.now();


            };
            items.put(id,item);
            nextId := nextId+1;
            id;
        };  

        public func updateStatus(id: Nat, status: Status): Result.Result<Nat, Text>{
            let fitem = items.get(id);
            switch(fitem){
                case(?fitem){
                    let udata = {
                        id = fitem.id;
                        name = fitem.name;
                        description = fitem.description;
                        image = fitem.image;
                        itype = fitem.itype;
                        price  = fitem.price;
                        currency  = fitem.currency;
                        status = status;
                        owner = fitem.owner;
                        listime = fitem.listime;


                    };
                    items.put(id,udata);
                    #ok(1)
                };
                case(_){
                    #err("no item found")
                };
            };
        };
        
        // public func lock(id: Nat, lockedby: Principal): Result.Result<Nat, Text>{
        //     let fitem = items.get(id);
        //     switch(fitem){
        //         case(?fitem){
        //             if(fitem.status == #list){
        //                 let udata = {
        //                     id = fitem.id;
        //                     name = fitem.name;
        //                     image = fitem.image;
        //                     itype = fitem.itype;
        //                     price  = fitem.price;
        //                     currency  = fitem.currency;
        //                     status = #locked(lockedby);
        //                     owner = fitem.owner;
        //                     listime = fitem.listime;


        //                 };
        //                 items.put(id,udata);
        //                 #ok(1)
        //             }else{
        //                 #err("this item is locked by someone else")
        //             };
                    
        //         };
        //         case(_){
        //             #err("no item found")
        //         };
        //     };
        // };
        
        public func retrieve(id:Nat): ?Item{
            items.get(id)
        };

        public func delete(id: Nat): ?Item{
            items.remove(id);
        };

        public func changeOwner(id: Nat, newOwner: Principal): Result.Result<Nat, Text>{
            let fitem = items.get(id);
            switch(fitem){
                case(?fitem){
                    let udata = {
                        id = fitem.id;
                        name = fitem.name;
                        description = fitem.description;
                        image = fitem.image;
                        itype = fitem.itype;
                        price  = fitem.price;
                        currency  = fitem.currency;
                        status = #unlist;
                        owner = newOwner;
                        listime = fitem.listime;
                    };
                    items.put(id, udata);
                    #ok(1)
                };
                case(_){
                    #err("no item found")
                };
            };
        };

        public func getUserItems(user: Principal) : [Item] {
            let msgArr =   Iter.toArray(items.vals());
            Array.filter(msgArr, func(l: Item):Bool{
                l.owner == user 
            });
        };
       
       public func getTypeItems(itype: Itype): [Item]{
            let msgArr =   Iter.toArray(items.vals());
            Array.filter(msgArr, func(l: Item):Bool{
                l.itype == itype and l.status == #list
            });
       };

       public func getItems(): [Item]{
            Iter.toArray(items.vals());
       };
    }
}