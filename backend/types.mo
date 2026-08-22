import Time "mo:base/Time";

module {

    public type AccountId = Blob;
    public type AccountIdText = Text;
    public type Subaccount = Nat;
    public type SubaccountNat8Arr = [Nat8];
    public type SubaccountBlob = Blob;
    public type EscrowAccount = {
        index : Subaccount;
        id : AccountIdText
    };
    public type Balance = {
        #e8s : Nat64;
        #e6s : Nat64
    };
    public type Currency = {
        #ICP;
        #ICET;
        // Any ICRC-1 compatible token (ckUSDC, ckUSDT, ckBTC, ckETH, …).
        // The canisterId uniquely identifies the ledger; symbol and decimals
        // are cached here so order records are self-describing.
        #ICRC1 : { canisterId : Principal; symbol : Text; decimals : Nat8 }
    };
    public type Status = {
        #new;
        #deposited;
        #delivered;
        #received;
        #released;
        #refunded;
        #closed;
        #canceled
    };

    // Business provenance is deliberately stored separately from Order so the
    // financial order record can remain stable and migration-friendly.
    public type OrderSource = {
        #icevent : {
            canister : Principal;
            calendarId : Nat;
            requirementId : Nat;
            offerId : Nat;
            reservationId : Nat
        };
        #external : {
            canister : Principal;
            namespace : Text;
            id : Text
        }
    };

    public type OrderContext = {
        orderId : Nat;
        source : OrderSource;
        createdBy : Principal;
        createdAt : Int
    };

    public type Order = {
        id : Nat;
        buyer : Principal;
        seller : Principal;
        memo : Text;
        amount : Nat64;
        currency : Currency;
        account : EscrowAccount;
        blockin : Nat64;
        blockout : Nat64;
        createtime : Int;
        lockedby : Principal;
        status : Status;
        updatetime : Int;
        expiration : Int;
        comments : [Comment];
        logs : [Log]
    };

    public type NewOrder = {
        seller : Principal;
        memo : Text;
        amount : Nat64;
        currency : Currency;
        expiration : Int
    };
    public type NewSellOrder = {
        buyer : Principal;
        memo : Text;
        amount : Nat64;
        currency : Currency;
        expiration : Int
    };

    // Used by trusted orchestration canisters (for example ICEvent) to create
    // an order for the real buyer/seller rather than making caller a party.
    public type CreateOrderForRequest = {
        buyer : Principal;
        seller : Principal;
        memo : Text;
        amount : Nat64;
        currency : Currency;
        expiration : Int;
        source : OrderSource
    };

    public type Comment = {
        user : Principal;
        comment : Text;
        ctime : Int
    };

    public type Log = {
        ltime : Int;
        log : Text;
        logger : {
            #buyer;
            #seller;
            #escrow
        }
    };
    // LEDGER
    // Amount of ICP tokens, measured in 10^-8 of a token.
    public type ICP = {
        e8s : Nat64
    };

    // Number of nanoseconds from the UNIX epoch (00:00:00 UTC, Jan 1, 1970).
    public type Timestamp = {
        timestamp_nanos : Nat64
    };

    // AccountIdentifier is a 32-byte array.
    // The first 4 bytes is big-endian encoding of a CRC32 checksum of the last 28 bytes.
    public type AccountIdentifier = Blob;

    // Subaccount is an arbitrary 32-byte byte array.
    // Ledger uses subaccounts to compute the source address, which enables one
    // principal to control multiple ledger accounts.
    public type SubAccount = Nat;

    // Sequence number of a block produced by the ledger.
    public type BlockIndex = Nat64;

    // An arbitrary number associated with a transaction.
    // The caller can set it in a `transfer` call as a correlation identifier.
    public type Memo = Nat64;

    public type TransferRequest = {
        memo : Nat64;
        from : Nat;
        to : AccountIdText;
        // For ICRC-1 tokens the destination is a Principal, not an AccountIdentifier.
        // This field is used in preference to `to` when the currency is #ICRC1.
        toPrincipal : ?Principal;
        amount : Nat64;
        currency : Currency
    };

    // Arguments for the `transfer` call.
    public type TransferArgs = {
        // The caller can set it in a `transfer` call as a correlation identifier.
        memo : Memo;
        amount : ICP;
        fee : ICP;
        from_subaccount : ?SubaccountBlob;
        to : AccountIdentifier;
        created_at_time : ?Timestamp
    };

    public type TransferError = {
        #BadFee : { expected_fee : ICP };
        #InsufficientFunds : { balance : ICP };
        #TxTooOld : { allowed_window_nanos : Nat64 };
        #TxCreatedInFuture : Null;
        #TxDuplicate : { duplicate_of : BlockIndex }
    };

    public type TransferResult = {
        #Ok : BlockIndex;
        #Err : TransferError
    };

    public type AccountBalanceArgs = {
        account : AccountIdentifier
    };

    public type CanisterId = Principal;
    public type BlockHeight = Nat64;

    public type TransactionNotification = {
        from : Principal;
        from_subaccount : ?SubAccount;
        to : CanisterId;
        to_subaccount : ?SubAccount;
        block_height : BlockHeight;
        amount : ICP;
        memo : Memo
    };

    public type Ledger = actor {
        transfer : shared (TransferArgs) -> async TransferResult;
        account_balance : shared query AccountBalanceArgs -> async ICP
    };

    // Reputation
    public type Review = {
        id : Nat;
        orderId : Nat;
        reviewer : Principal;
        target : Principal;
        rating : Nat; // 1–5
        comment : Text;
        ctime : Int
    };

    public type UserStats = {
        heartsReceived : Nat;
        salesCompleted : Nat;
        purchasesCompleted : Nat;
        reviewCount : Nat;
        ratingSum : Nat;
        avgRating : Float
    };

    // Notification service (icevent_service RAM canister)
    public type TypeNotification = {
        #calendar : Nat;
        #contact : Nat;
        #event : Nat;
        #note : Nat;
        #other;
        #todo : Nat;
        #user : Text
    };

    public type NewNotification = {
        note : Text;
        ntype : TypeNotification;
        receiver : Text;
        sender : Text
    };

    public type NotificationService = actor {
        addNotification : shared (NewNotification) -> async ()
    };

}
