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
            <div className="mb-4 mt-1 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setOpenOrderForm(true)}
                    className="min-w-[160px] rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                    Create An Order
                </button>
                <button
                    type="button"
                    onClick={loadAllOrders}
                    className="min-w-[160px] rounded-md border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                >
                    All Orders ({page})
                </button>
            </div>

            {!loading && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="grid grid-cols-12 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <div className="col-span-2">ID</div>
                        <div className="col-span-4">Order Item</div>
                        <div className="col-span-3 text-right">Amount</div>
                        <div className="col-span-3 text-right">Order Time</div>
                    </div>
                    <div className="divide-y divide-slate-100">{ol}</div>
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
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
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