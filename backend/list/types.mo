import Time "mo:base/Time";

module {

    public type ItemStatus = {
            #list;
            #pending;
            #sold;
            #unlist;
        };
    public type ServiceId = Nat;

    public type Itype = {
            #nft;
            #coin;
            #service : ServiceId;
            #merchandise;
            #other;
        };

    public type Location = {
            #online;
            #physical : Text;
        };

    public type Item = {
        id: Nat;
        name : Text;
        description: Text;
        image: Text;
        tags : [Text];
        itype : Itype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 };
        };
        location : Location;
        status : ItemStatus;
        owner: Principal;
        listime : Int;
    };

    public type NewItem = {
        name : Text;
        description: Text;
        image: Text;
        tags : [Text];
        itype : Itype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 };
        };        
        location : Location;
        status : ItemStatus;
    };

    public type UpdateItem = {
        name : Text;
        description : Text;
        image : Text;
        tags : [Text];
        itype : Itype;
        price : Nat64;
        currency : {
            #ICP;
            #ICET;
            #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 };
        };
        location : Location;
    };
    

};