import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useEscrow } from '../Store';
import {
    LISTITEM_STATUS_LIST,
    LISTITEM_STATUS_PENDING,
    LISTITEM_STATUS_SOLD,
    LISTITEM_STATUS_UNLIST,
} from '../../lib/constants';
import { currencyBase, currencySymbol } from '../../lib/currencyUtils';
import { getItemImageSrc } from '../../lib/itemImage';
import EditItemForm from '../offers/EditItemForm';
import { getCanisterErrorMessage, getThrownErrorMessage, isCanisterOkResult } from '../../lib/canisterResult';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    list:    { label: 'Listed',   className: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'On Hold',  className: 'bg-amber-100 text-amber-700' },
    sold:    { label: 'Sold',     className: 'bg-blue-100 text-blue-700' },
    unlist:  { label: 'Unlisted', className: 'bg-slate-100 text-slate-500' },
};

const PAGE_SIZE = 20;

interface ConfirmDeleteModalProps {
    itemName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ itemName, onConfirm, onCancel }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onCancel}
    >
        <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">Delete item?</h3>
            <p className="mt-1 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">"{itemName}"</span> will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-xl border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
);

const MyItems: React.FC = () => {
    const escrow = useEscrow();
    const navigate = useNavigate();

    const [items, setItems] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [changingId, setChangingId] = React.useState<bigint | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: bigint; name: string } | null>(null);
    const [editTarget, setEditTarget] = React.useState<any | null>(null);

    const loadItems = React.useCallback(async () => {
        try {
            setLoading(true);
            const all: any[] = [];
            for (let page = 1; page <= 50; page++) {
                const batch = await escrow.getMyItems(BigInt(page));
                if (!batch || batch.length === 0) break;
                all.push(...batch);
                if (batch.length < PAGE_SIZE) break;
            }
            setItems(all.sort((a, b) => Number(b.listime) - Number(a.listime)));
        } catch {
            toast.error('Failed to load your items');
        } finally {
            setLoading(false);
        }
    }, [escrow]);

    React.useEffect(() => { loadItems(); }, [loadItems]);

    const changeStatus = async (itemId: bigint, newStatus: string) => {
        setChangingId(itemId);
        try {
            const statusArg = { list: null, pending: null, sold: null, unlist: null } as any;
            Object.keys(statusArg).forEach(k => { if (k !== newStatus) delete statusArg[k]; });
            const res = await escrow.changeItemStatus(itemId, statusArg);
            if (isCanisterOkResult(res)) {
                toast.success('Item status updated');
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === itemId ? { ...item, status: { [newStatus]: null } } : item,
                    ),
                );
                await loadItems();
            } else {
                toast.error(getCanisterErrorMessage(res, 'Failed to update status'));
            }
        } catch {
            try {
                const refreshed = await escrow.getItem(itemId);
                const updatedItem = refreshed?.[0];
                if (updatedItem && getStatus(updatedItem) === newStatus) {
                    toast.success('Item status updated');
                    setItems((prev) =>
                        prev.map((item) =>
                            item.id === itemId ? { ...item, status: updatedItem.status } : item,
                        ),
                    );
                    await loadItems();
                } else {
                    toast.warn('The status change may have been applied. Please refresh to verify it.');
                }
            } catch {
                toast.warn('The status change may have been applied. Please refresh to verify it.');
            }
        } finally {
            setChangingId(null);
        }
    };

    const deleteItem = async (itemId: bigint) => {
        setChangingId(itemId);
        try {
            const res = await escrow.deleteItem(itemId);
            if (res['ok'] !== undefined) {
                toast.success('Item deleted');
                setItems((prev) => prev.filter((item) => item.id !== itemId));
            } else {
                toast.error(res['err'] ?? 'Failed to delete item');
            }
        } catch {
            toast.error('Failed to delete item');
        } finally {
            setChangingId(null);
            setDeleteTarget(null);
        }
    };

    const saveEdit = async (payload: any) => {
        if (!editTarget) return;
        try {
            const res = await escrow.updateItem(editTarget.id, payload);
            if (isCanisterOkResult(res)) {
                toast.success('Item updated');
                setItems((prev) =>
                    prev.map((item) =>
                        item.id === editTarget.id
                            ? { ...item, ...payload, price: payload.price, currency: payload.currency, itype: payload.itype, location: payload.location }
                            : item
                    )
                );
                setEditTarget(null);
            } else {
                toast.error(getCanisterErrorMessage(res, 'Failed to update item'));
            }
        } catch (error) {
            toast.error(getThrownErrorMessage(error, 'Failed to update item'));
        }
    };

    const getPrice = (item: any) => {
        const currency = currencySymbol(item.currency);
        const raw = Number(item.price);
        return { currency, price: raw / currencyBase(item.currency) };
    };

    const getStatus = (item: any): string => Object.getOwnPropertyNames(item.status)[0];

    return (
        <section className="reveal-up mt-4 rounded-3xl border border-white/60 bg-white/75 p-4 shadow-lg backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Seller Dashboard</p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">My Items</h2>
                </div>
                <p className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    {items.length} items
                </p>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-10">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" />
                </div>
            )}

            {!loading && items.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">You haven't listed any items yet.</p>
                </div>
            )}

            {!loading && items.length > 0 && (
                <div className="space-y-3">
                    {items.map((item) => {
                        const status = getStatus(item);
                        const { currency, price } = getPrice(item);
                        const isFree = price === 0;
                        const busy = changingId === item.id;
                        const statusInfo = STATUS_LABELS[status] ?? { label: status, className: 'bg-slate-100 text-slate-500' };
                        const imageSrc = getItemImageSrc(item);

                        return (
                            <div
                                key={String(item.id)}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                            >
                                <img
                                    src={imageSrc}
                                    alt={item.name}
                                    className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                                />

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/item/${item.id}`)}
                                            className="truncate text-sm font-bold text-slate-900 hover:text-orange-600"
                                        >
                                            {item.name}
                                        </button>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusInfo.className}`}>
                                            {statusInfo.label}
                                        </span>
                                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            {Object.getOwnPropertyNames(item.itype)[0]}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm font-semibold text-slate-600">
                                        {isFree ? (
                                            <span className="text-emerald-600">FREE</span>
                                        ) : (
                                            <>{currency} {price}</>
                                        )}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {status === LISTITEM_STATUS_PENDING && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => changeStatus(item.id, LISTITEM_STATUS_LIST)}
                                            className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                        >
                                            Re-list
                                        </button>
                                    )}
                                    {status === LISTITEM_STATUS_LIST && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => changeStatus(item.id, LISTITEM_STATUS_PENDING)}
                                            className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                        >
                                            Hold
                                        </button>
                                    )}
                                    {(status === LISTITEM_STATUS_LIST || status === LISTITEM_STATUS_PENDING) && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => changeStatus(item.id, LISTITEM_STATUS_SOLD)}
                                            className="rounded-lg border border-blue-400 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            Mark Sold
                                        </button>
                                    )}
                                    {status !== LISTITEM_STATUS_UNLIST && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => changeStatus(item.id, LISTITEM_STATUS_UNLIST)}
                                            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                                        >
                                            Unlist
                                        </button>
                                    )}
                                    {status === LISTITEM_STATUS_UNLIST && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => changeStatus(item.id, LISTITEM_STATUS_LIST)}
                                            className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                        >
                                            Re-list
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => setEditTarget(item)}
                                        className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                                        className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {deleteTarget && (
                <ConfirmDeleteModal
                    itemName={deleteTarget.name}
                    onConfirm={() => deleteItem(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}

            {editTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setEditTarget(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="mb-4 text-base font-bold text-slate-900">Edit Item</h3>
                        <EditItemForm
                            item={editTarget}
                            onSave={saveEdit}
                            onCancel={() => setEditTarget(null)}
                        />
                    </div>
                </div>
            )}
        </section>
    );
};

export default MyItems;
