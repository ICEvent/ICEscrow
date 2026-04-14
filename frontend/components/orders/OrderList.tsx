import * as React from 'react';
import { toast } from 'react-toastify';

import { useEscrow } from '../Store';
import OrderListItem from './OrderListItem';
import OrderForm from './OrderForm';
import { NewOrder, NewSellOrder } from '../../api/escrow/escrow.did';

export default () => {
    const escrow = useEscrow();
    const [orders, setOrders] = React.useState([])
    const [loading, setLoading] = React.useState(false)
    const [page, setPage] = React.useState(1)

    const [openOrderForm, setOpenOrderForm] = React.useState(false);

    React.useEffect(() => {
        loadProcessingOrders();
    }, []);

    function loadProcessingOrders() {
        setLoading(true)
        escrow.getOrders().then(os => {
            setOrders(os)
            setLoading(false)
        })
    };

    function loadAllOrders() {
        setLoading(true)
        escrow.getAllOrders(BigInt(page)).then(os => {
            console.log(os)
            setOrders(os)
            setPage(page + 1)
            setLoading(false)
        })
    };

    function buy(newOrder: NewOrder) {
        try {
            setLoading(true)
            escrow.buy(newOrder).then(res => {
                setLoading(false);
                if (res["ok"]) {
                    toast.success("your order has created!")

                } else {
                    toast.error(res["err"].toString());
                }

            });
            setOpenOrderForm(false);
        } catch (err) {
            toast.error(err.toString())
        };

    };

    function sell(newOrder: NewSellOrder) {
        try {
            setLoading(true)
            escrow.sell(newOrder).then(res => {
                setLoading(false);
                if (res["ok"]) {
                    toast.success("your order has created!")

                } else {
                    toast.error(res["err"].toString());
                }

            });
            setOpenOrderForm(false);
        } catch (err) {
            toast.error(err.toString())
        };

    };

    let ol = orders.map(o =>
        <OrderListItem key={o.id} order={o} />
    )
    return (
        <>
            <div className="mb-4 mt-1 rounded-2xl border border-white/50 bg-white/75 p-3 shadow-sm backdrop-blur">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Escrow Orders</p>
                <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setOpenOrderForm(true)}
                    className="btn-modern-primary commerce-gradient min-w-[160px] rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm"
                >
                    Create An Order
                </button>
                <button
                    type="button"
                    onClick={loadAllOrders}
                    className="btn-modern-secondary min-w-[160px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-500 hover:text-orange-700"
                >
                    All Orders ({page})
                </button>
                </div>
            </div>

            {!loading && (
                <div className="space-y-3">
                    {ol}
                </div>
            )}

            {loading && (
                <div className="space-y-2">
                    <div className="h-8 animate-pulse rounded bg-slate-200" />
                    <div className="h-8 animate-pulse rounded bg-slate-100" />
                </div>
            )}

            {openOrderForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenOrderForm(false)}>
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/40 bg-white/95 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setOpenOrderForm(false)}
                            className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100"
                        >
                            x
                        </button>
                        <h3 className="mb-4 text-lg font-semibold text-slate-900">New Escrow Contract</h3>
                        <OrderForm buy={buy} sell={sell} />
                    </div>
                </div>
            )}

        </>
    )
}