import * as React from 'react';
import { Item } from '../../api/escrow/escrow.did';
import OfferCard from '../offers/OfferCard';


interface ItemListProps {
    items: Item[];
    onItemClick?: (item: Item) => void;
    defaultFilter?: string; // Optional default filter
}

const ItemList: React.FC<ItemListProps> = ({ items, onItemClick, defaultFilter }) => {
    const [activeFilter, setActiveFilter] = React.useState(defaultFilter || 'all');
    const filters = ['all', 'nft', 'crypto', 'service', 'merchandise', 'other'];

    const filteredItems = React.useMemo(() => {
        if (activeFilter === 'all') return items;
        return items.filter(item => Object.getOwnPropertyNames(item.itype)[0].toLowerCase() === activeFilter.toLowerCase());
    }, [items, activeFilter]);

    return (
        <section className="reveal-up mt-4 rounded-3xl border border-white/60 bg-white/75 p-4 shadow-lg backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Browse by Category</p>
                <p className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {filteredItems.length} items
                </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 reveal-delay-1">
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
                        {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                    <OfferCard key={item.id} offer={item} />
                ))}
            </div>
        </section>
    );
};
export default ItemList;
