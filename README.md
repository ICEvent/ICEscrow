# ICEvent Escrow
Open Decentralized Escrow service
![](https://pbs.twimg.com/media/FTxMVORVUAEC6Vv?format=png&name=900x900)

Cases:
1. Bounty 
2. NFT Trading 
3. Coin Trading
... anything trading

Cryptocurrencies Support: ICP and ICET

Methods:
1. create - create order
2. deposit - buyer deposit fund in escrow
3. deliver - seller deliver item to buyer
4. receive - buyer receive item
5. release - escrow release fund to seller
6. cancel - buyer cancel the order before depositing, seller cancel the order after depositing and refund to buyer

export DFX_WARNING=-mainnet_plaintext_identity && dfx canister --ic install escrow --mode upgrade --wasm-memory-persistence keep