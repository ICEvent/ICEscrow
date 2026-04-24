import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Item } from '../../api/escrow/service.did';
import OfferCard from '../offers/OfferCard';


interface ItemListProps {
    items: Item[];
    onItemClick?: (item: Item) => void;
    defaultFilter?: string; // Optional default filter
}

const ItemList: React.FC<ItemListProps> = ({ items, onItemClick, defaultFilter }) => {
    const navigate = useNavigate();
    const initialFilter = defaultFilter || 'all';
    const [activeFilter, setActiveFilter] = React.useState(initialFilter);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortBy, setSortBy] = React.useState('newest');
    const filters = ['all', 'free', 'nft', 'coin', 'service', 'merchandise', 'other'];

    const availableItems = React.useMemo(() => {
        return items.filter((item) => Object.getOwnPropertyNames(item.status)[0] === 'list');
    }, [items]);

    const getItemType = React.useCallback((item: Item) => {
        return Object.getOwnPropertyNames(item.itype)[0].toLowerCase();
    }, []);

    const toPriceNumber = React.useCallback((item: Item) => {
        const raw = Number(item.price);
        const currency = Object.getOwnPropertyNames(item.currency)[0];
        return currency === 'ICP' ? raw / 100_000_000 : raw / 1_000_000;
    }, []);

    const toListTime = React.useCallback((item: Item) => Number(item.listime), []);

    const filterCounts = React.useMemo(() => {
        const counts: Record<string, number> = { all: availableItems.length };
        counts.free = availableItems.filter((item) => toPriceNumber(item) === 0).length;
        for (const filter of filters) {
            if (filter !== 'all' && filter !== 'free') {
                counts[filter] = availableItems.filter((item) => getItemType(item) === filter).length;
            }
        }
        return counts;
    }, [availableItems, filters, getItemType, toPriceNumber]);

    const visibleItems = React.useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = availableItems.filter((item) => {
            const type = getItemType(item);
            const matchesType = activeFilter === 'all'
                || (activeFilter === 'free' && toPriceNumber(item) === 0)
                || type === activeFilter;
            if (!matchesType) return false;

            if (!normalizedSearch) return true;

            const haystack = `${item.name ?? ''} ${item.description ?? ''} ${type}`.toLowerCase();
            return haystack.includes(normalizedSearch);
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'price-low') return toPriceNumber(a) - toPriceNumber(b);
            if (sortBy === 'price-high') return toPriceNumber(b) - toPriceNumber(a);
            return toListTime(b) - toListTime(a);
        });
    }, [availableItems, activeFilter, searchTerm, sortBy, getItemType, toPriceNumber, toListTime]);

    React.useEffect(() => {
        setActiveFilter(initialFilter);
    }, [initialFilter]);

    return (
        <section className="reveal-up mt-4 rounded-3xl border border-white/60 bg-white/75 p-4 shadow-lg backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Browse by Category</p>
                <p className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {visibleItems.length} items
                </p>
            </div>

            <div className="sticky top-[5.1rem] z-20 -mx-4 mb-4 space-y-3 border-y border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:space-y-0 sm:border-0 sm:bg-transparent sm:p-0">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search products..."
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-orange-400"
                    />

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-orange-400"
                    >
                        <option value="newest">Sort: Newest</option>
                        <option value="price-low">Sort: Price Low to High</option>
                        <option value="price-high">Sort: Price High to Low</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setSortBy('newest');
                            setActiveFilter(initialFilter);
                        }}
                        className="btn-modern-secondary rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-orange-500 hover:text-orange-700"
                    >
                        Reset Filters
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 reveal-delay-1">
                {filters.map((filter) => (
                    <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveFilter(filter)}
                        className={`btn-modern-secondary rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                            activeFilter === filter
                                ? 'commerce-gradient text-white shadow-md'
                                : 'border border-slate-300 bg-white text-slate-700 hover:border-orange-400 hover:text-orange-700'
                        }`}
                    >
                        {(filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)) + ` (${filterCounts[filter] ?? 0})`}
                    </button>
                ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleItems.map((item) => (
                    <OfferCard
                        key={item.id}
                        offer={item}
                        onOpen={(clickedItem) => {
                            onItemClick?.(clickedItem);
                            navigate(`/item/${clickedItem.id}`);
                        }}
                    />
                ))}
            </div>

            {visibleItems.length === 0 && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
                    <p className="text-sm font-semibold text-slate-700">No matching items found.</p>
                    <p className="mt-1 text-xs text-slate-500">Try another keyword, category, or sort option.</p>
                </div>
            )}
        </section>
    );
};
export default ItemList;
