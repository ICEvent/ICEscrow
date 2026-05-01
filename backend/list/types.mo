import Time "mo:base/Time";

module {

    public type ItemStatus = {
            #list;
            #pending;
            #sold;
            #unlist;
        };
    public type Itype = {
            #nft;
            #coin;
            #service;
            #merchandise;
            #other;
        };

    public type Item = {
        id: Nat;
        name : Text;
        description: Text;
        image: Text;
        itype : Itype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 };
        };
        status : ItemStatus;
        owner: Principal;
        listime : Int;
    };

    public type NewItem = {
        name : Text;
        description: Text;
        image: Text;
        itype : Itype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 };
        };        
        status : ItemStatus;
    };
    

};