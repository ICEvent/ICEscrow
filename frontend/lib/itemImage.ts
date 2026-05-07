import {
    LIST_ITEM_COIN,
    LIST_ITEM_INSCRIPTION,
    LIST_ITEM_MERCHANDISE,
    LIST_ITEM_NFT,
    LIST_ITEM_OTHER,
    LIST_ITEM_SERVICE,
} from './constants';

type ItemTypeValue = Record<string, unknown> | string | null | undefined;

type ItemImageTheme = {
    label: string;
    accent: string;
    accentSoft: string;
    backgroundStart: string;
    backgroundEnd: string;
};

const ITEM_IMAGE_THEMES: Record<string, ItemImageTheme> = {
    [LIST_ITEM_INSCRIPTION]: {
        label: 'Inscription',
        accent: '#0f766e',
        accentSoft: '#99f6e4',
        backgroundStart: '#ecfeff',
        backgroundEnd: '#ccfbf1',
    },
    [LIST_ITEM_NFT]: {
        label: 'NFT',
        accent: '#7c3aed',
        accentSoft: '#ddd6fe',
        backgroundStart: '#f5f3ff',
        backgroundEnd: '#ede9fe',
    },
    [LIST_ITEM_COIN]: {
        label: 'Coin',
        accent: '#b45309',
        accentSoft: '#fde68a',
        backgroundStart: '#fffbeb',
        backgroundEnd: '#fef3c7',
    },
    [LIST_ITEM_MERCHANDISE]: {
        label: 'Merch',
        accent: '#be185d',
        accentSoft: '#fbcfe8',
        backgroundStart: '#fdf2f8',
        backgroundEnd: '#fce7f3',
    },
    [LIST_ITEM_SERVICE]: {
        label: 'Service',
        accent: '#1d4ed8',
        accentSoft: '#bfdbfe',
        backgroundStart: '#eff6ff',
        backgroundEnd: '#dbeafe',
    },
    [LIST_ITEM_OTHER]: {
        label: 'Other',
        accent: '#475569',
        accentSoft: '#cbd5e1',
        backgroundStart: '#f8fafc',
        backgroundEnd: '#e2e8f0',
    },
};

export function getItemTypeKey(itemType: ItemTypeValue): string {
    if (typeof itemType === 'string' && itemType.trim()) {
        return itemType.trim().toLowerCase();
    }

    if (!itemType || typeof itemType !== 'object') {
        return LIST_ITEM_OTHER;
    }

    const key = Object.keys(itemType)[0];
    return key ? key.toLowerCase() : LIST_ITEM_OTHER;
}

function defaultImageSvg(itemType: ItemTypeValue): string {
    const typeKey = getItemTypeKey(itemType);
    const theme = ITEM_IMAGE_THEMES[typeKey] ?? ITEM_IMAGE_THEMES[LIST_ITEM_OTHER];
    const badge = theme.label.slice(0, 1).toUpperCase();

    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="${theme.label} default image">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${theme.backgroundStart}" />
                    <stop offset="100%" stop-color="${theme.backgroundEnd}" />
                </linearGradient>
            </defs>
            <rect width="1200" height="900" rx="56" fill="url(#bg)" />
            <circle cx="985" cy="190" r="124" fill="${theme.accentSoft}" opacity="0.85" />
            <circle cx="195" cy="730" r="144" fill="${theme.accentSoft}" opacity="0.9" />
            <rect x="86" y="86" width="180" height="180" rx="42" fill="${theme.accent}" opacity="0.95" />
            <text x="176" y="198" text-anchor="middle" font-family="Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff">${badge}</text>
            <text x="86" y="384" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="${theme.accent}">${theme.label}</text>
            <text x="86" y="468" font-family="Arial, sans-serif" font-size="36" fill="#334155">Default item image</text>
            <rect x="86" y="548" width="1028" height="18" rx="9" fill="${theme.accentSoft}" />
            <rect x="86" y="600" width="720" height="18" rx="9" fill="${theme.accentSoft}" opacity="0.8" />
            <rect x="86" y="652" width="864" height="18" rx="9" fill="${theme.accentSoft}" opacity="0.65" />
        </svg>
    `.trim();
}

function toDataUri(svg: string): string {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getItemImageSrc(item: { image?: string; itype?: ItemTypeValue } | null | undefined): string {
    const image = item?.image?.trim();
    if (image) {
        return image;
    }

    return toDataUri(defaultImageSvg(item?.itype));
}
