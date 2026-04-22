export const FIVE_SECONDS_MS = 5 * 1000;
export const ONE_MINUTES_MS = 60 * 1000;
export const FIVE_MINUTES_MS = 5 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_WEEK_SEC = 7 * 24 * 60 * 60;
export const ONE_WEEK_NS = BigInt(ONE_WEEK_SEC * 1e9);

export const MINT_CYCLES_MEMO = 1347768404;

export const MAX_CHUNK_SIZE = 1024 * 500; // 500kb for file upload in storage canister

export const LEDGER_E8S = 100000000; //ICP
export const LEDGER_FEE = 10000; //ICP Transaction Fee
export const LEDGER_E6S = 1000000; //ICET


//canisterids


export const IDENTITY_PROVIDER = "https://identity.ic0.app";

//paging
export const PAGING_LENGTH = 10;

export const ORDER_DEFAULT_EXPIRED_DAYS = 5;

export const MENU_HOME = "home";
export const MENU_ORDERS = "orders";
export const MENU_PROFILE = "profile";
export const MENU_FREE = "free";
export const MENU_MY_ITEMS = "my_items";

export const ORDER_STATUS_NEW = "new";
export const ORDER_STATUS_DEPOSITED = "deposited";
export const ORDER_STATUS_DELIVERED = "delivered";
export const ORDER_STATUS_RECEIVED = "received";
export const ORDER_STATUS_RELEASED = "released";
export const ORDER_STATUS_REFUNDED = "refunded";
export const ORDER_STATUS_CLOSED = "closed";
export const ORDER_STATUS_CANCELED = "canceled";

export const LISTITEM_STATUS_LIST = "list";
export const LISTITEM_STATUS_PENDING = "pending";
export const LISTITEM_STATUS_SOLD = "sold";
export const LISTITEM_STATUS_UNLIST = "unlist";

export const CURRENCY_ICP = "ICP";
export const CURRENCY_ICET = "ICET";

export const LIST_ITEM_ALL = "all";
export const LIST_ITEM_INSCRIPTION = "inscription";
export const LIST_ITEM_NFT = "nft";
export const LIST_ITEM_COIN = "coin";
export const LIST_ITEM_MERCHANDISE = "merchandise";
export const LIST_ITEM_SERVICE = "service";
export const LIST_ITEM_OTHER = "other";

export const CANISTER_CYCLES = "rkp4c-7iaaa-aaaaa-aaaca-cai";
//canisterids
export const CANISTER_ICEVENT = "ukvuy-5aaaa-aaaaj-qabva-cai";
export const CANISTER_ICEVENT_ASSET = "znisf-eqaaa-aaaaj-aabta-cai";
export const CANISTER_ICET = "ot4zw-oaaaa-aaaag-qabaa-cai";
export const CANISTER_ICETICKET = "rvzx7-oqaaa-aaaaj-qagxq-cai";
export const CANISTER_STORAGE = "5pqgi-saaaa-aaaal-aaavq-cai";
export const CANISTER_RAM = "pxu6k-jaaaa-aaaap-aaamq-cai";
export const CANISTER_LEDGER = "7qstd-hiaaa-aaaak-aariq-cai";
export const CANISTER_ESCROW = "oslfo-7iaaa-aaaag-qakra-cai";
export const CANISTER_TREASURY = "gncpj-jyaaa-aaaan-qagta-cai";

export const CANISTER_ATTENDNFT = "vjod3-4iaaa-aaaan-qaoeq-cai";
export const CANISTER_ONEBLOCK = "nzxho-uqaaa-aaaak-adwxq-cai";
export const CANISTER_ONEBLOCK_ASSET = "32pz7-5qaaa-aaaag-qacra-cai";
export const CANISTER_ICM = "rzdlh-haaaa-aaaal-aab3q-cai";
export const CANISTER_BACKUP = "ixuio-siaaa-aaaam-qacxq-cai";
export const CANISTER_ICEVENT_STAGING = "owctf-4qaaa-aaaak-qaahq-cai";

export const CANISTER_INFIDENZA = 'h7ecw-giaaa-aaaal-ab75a-cai';
export const CANISTER_ICPLEDGER = "ryjl3-tyaaa-aaaaa-aaaba-cai";

export const CANISTER_ICRC_CKBTC = "mxzaz-hqaaa-aaaar-qaada-cai";
export const CANISTER_ICRC_CKETH = "ss2fx-dyaaa-aaaar-qacoq-cai";
export const CANISTER_ICRC_SNS1 = "zfcdd-tqaaa-aaaaq-aaaga-cai";

export const CANISTER_JUNO_ICEVENT = "ruc7a-fiaaa-aaaal-ab4ha-cai";
export const CANISTER_INBOX_DEFAULT = "r6cnt-kyaaa-aaaal-aab3a-cai";

export const CANISTER_CKETH_INDEXER = "bqzgt-iiaaa-aaaai-qpdoa-cai";



export const WHITELIST = [
  CANISTER_ICEVENT,
  'owctf-4qaaa-aaaak-qaahq-cai',
  CANISTER_ICET,
  CANISTER_ICETICKET,
  'btsqz-aaaaa-aaaae-aaawq-cai',
  CANISTER_STORAGE,
  CANISTER_RAM,
  CANISTER_LEDGER,
  'gncpj-jyaaa-aaaan-qagta-cai',
  CANISTER_ESCROW,
  CANISTER_TREASURY,
  CANISTER_ATTENDNFT,
  CANISTER_INFIDENZA,
  CANISTER_ICPLEDGER,
  CANISTER_ICRC_CKETH,
  CANISTER_CKETH_INDEXER
].filter(
  Boolean
);
export const IDENTITY_PROVIDER_IC = 'https://identity.ic0.app';
export const IDENTITY_PROVIDER_NFID = "https://nfid.one";
export const DERIVATION_ORIGION = "https://32pz7-5qaaa-aaaag-qacra-cai.raw.ic0.app";
export const APP_LOGO = "/blocklist_logo.png";

export const ckETH_DECIMALS = 1_000_000_000_000_000_000;
export const ckETH_FEE = 2_000_000_000_000;