// Common ICRC-1 stablecoin interface for ICEscrow.
// Any ICRC-1 compatible token ledger (ckUSDC, ckUSDT, ckBTC, ckETH, …) satisfies
// the `Ledger` actor type defined here, so the escrow canister can interact with
// any whitelisted stablecoin without custom per-token code.

module {

    // ── ICRC-1 account type ──────────────────────────────────────────────────

    public type Account = {
        owner : Principal;
        subaccount : ?Blob
    };

    // ── ICRC-1 transfer ──────────────────────────────────────────────────────

    public type TransferArg = {
        to : Account;
        fee : ?Nat;
        memo : ?Blob;
        from_subaccount : ?Blob;
        created_at_time : ?Nat64;
        amount : Nat
    };

    public type TransferError = {
        #GenericError : { message : Text; error_code : Nat };
        #TemporarilyUnavailable;
        #BadBurn : { min_burn_amount : Nat };
        #Duplicate : { duplicate_of : Nat };
        #BadFee : { expected_fee : Nat };
        #CreatedInFuture : { ledger_time : Nat64 };
        #TooOld;
        #InsufficientFunds : { balance : Nat }
    };

    public type TransferResult = { #Ok : Nat; #Err : TransferError };

    // ── On-chain stablecoin metadata stored in the registry ─────────────────

    /// All information the escrow canister needs to work with a stablecoin.
    public type StablecoinInfo = {
        canisterId : Principal;
        symbol : Text;
        /// Number of decimal places (e.g. 6 for ckUSDC/ckUSDT, 8 for ckBTC).
        decimals : Nat8;
        /// Per-transfer fee in the token's smallest unit.
        fee : Nat
    };

    // ── Minimal ICRC-1 ledger actor type ────────────────────────────────────

    /// Any ICRC-1 ledger that the escrow canister can call for balance checks
    /// and transfers.  Implementors only need these four endpoints.
    public type Ledger = actor {
        icrc1_balance_of : shared query Account -> async Nat;
        icrc1_transfer : shared TransferArg -> async TransferResult;
        icrc1_fee : shared query () -> async Nat;
        icrc1_decimals : shared query () -> async Nat8;
        icrc1_symbol : shared query () -> async Text
    };

}
