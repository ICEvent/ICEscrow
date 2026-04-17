import * as React from 'react';
import moment from 'moment';

import OrderDetail from './OrderDetail';

export default (props) => {

    const [openOrder, setOpenOrder] = React.useState(false)
    const currency = Object.getOwnPropertyNames(props.order.currency)[0];
    let es = currency == "ICP" ? 100000000 : 1000000;
    const amount = parseInt(props.order.amount) / es;
    const isFreeOrder = amount === 0;
    return (
        <>
            <div
                key={props.order.id}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
            >
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <button
                            type="button"
                            onClick={() => setOpenOrder(true)}
                            className="text-sm font-semibold text-orange-700 transition hover:text-orange-800 hover:underline"
                        >
                            #{parseInt(props.order.id)}
                        </button>
                        <p className="mt-1 text-base font-semibold text-slate-900">{props.order.memo}</p>
                    </div>
                    <span className="rounded-full border border-teal-600/50 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                        {currency}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <div className="rounded-md bg-slate-50 px-3 py-2">
                        <span className="font-semibold text-slate-600">Amount:</span> {isFreeOrder ? 'FREE' : `${amount} (${currency})`}
                    </div>
                    <div className="rounded-md bg-slate-50 px-3 py-2 sm:text-right">
                        <span className="font-semibold text-slate-600">Created:</span> {moment.unix(parseInt(props.order.createtime) / 1000000000).format("YYYY-MM-DD hh:mm")}
                    </div>
                </div>
            </div>

            {openOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenOrder(false)}>
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setOpenOrder(false)}
                            className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100"
                        >
                            x
                        </button>
                        <h3 className="mb-4 text-lg font-semibold text-slate-900">Order: {props.order.memo}</h3>
                        <OrderDetail order={props.order} />
                    </div>
                </div>
            )}
        </>
    )
}