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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
                {filters.map((filter) => (
                    <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveFilter(filter)}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                            activeFilter === filter
                                ? 'bg-cyan-600 text-white'
                                : 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-700'
                        }`}
                    >
                        {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {filteredItems.map((item) => (
                    <OfferItem key={item.id} offer={item}  />
                ))}
            </div>
        </div>
    );
};
export default ItemList;
