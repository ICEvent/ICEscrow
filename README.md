# ICEvent Escrow

Open decentralized escrow marketplace on the Internet Computer.

![](https://pbs.twimg.com/media/FTxMVORVUAEC6Vv?format=png&name=900x900)

## Current features

- Escrow marketplace for listed items (inscription, NFT, coin, merchandise, service, other)
- Supported currencies: **ICP** and **ICET**
- Escrow order lifecycle:
  - `create` / `buy` / `sell`
  - `deposit` (buyer funds escrow account)
  - `deliver` (seller confirms delivery)
  - `receive` (buyer confirms receipt)
  - `release` (seller requests payout)
  - `cancel`, `refund`, `close`
- On-chain order comments between participants
- User item management:
  - list items
  - hold / relist / mark sold / unlist
  - delete item
  - delegate item directly to another principal (give away)
- Free item claim workflow:
  - buyers can claim free listings
  - buyer/seller can comment on claims
  - seller can close claims
- User-specific views:
  - profile page
  - user item page
  - order list and details

## Deployment

Backend canister upgrade:

```bash
export DFX_WARNING=-mainnet_plaintext_identity
dfx canister --ic install escrow --mode upgrade --wasm-memory-persistence keep
```
