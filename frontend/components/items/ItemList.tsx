import * as React from 'react';
import { Item } from '../../api/escrow/escrow.did';
import OfferItem from '../offers/OfferItem';


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
        <div className="reveal-up rounded-2xl border border-white/60 bg-white/70 p-4 shadow-lg backdrop-blur">
            <div className="mb-4 flex flex-wrap gap-2 reveal-delay-1">
                {filters.map((filter) => (
                    <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveFilter(filter)}
                        className={`btn-modern-secondary rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                            activeFilter === filter
                                ? 'bg-gradient-to-r from-cyan-600 to-emerald-500 text-white shadow-md'
                                : 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-700'
                        }`}
                    >
                        {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {filteredItems.map((item) => (
                    <OfferItem key={item.id} offer={item}  />
                ))}
            </div>
        </div>
    );
};
export default ItemList;
