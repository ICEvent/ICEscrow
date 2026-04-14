import * as React from 'react';
import moment from 'moment';

import OrderDetail from './OrderDetail';

export default (props) => {

    const [openOrder, setOpenOrder] = React.useState(false)
    const currency = Object.getOwnPropertyNames(props.order.currency)[0];
    let es = currency == "ICP" ? 100000000 : 1000000;
    return (
        <>
            <div key={props.order.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-slate-700">
                <div className="col-span-2">
                    <button
                        type="button"
                        onClick={() => setOpenOrder(true)}
                        className="font-semibold text-cyan-700 transition hover:text-cyan-800 hover:underline"
                    >
                        {parseInt(props.order.id)}
                    </button>
                </div>
                <div className="col-span-4 truncate">{props.order.memo}</div>
                <div className="col-span-3 text-right">{parseInt(props.order.amount) / es} (${currency})</div>
                <div className="col-span-3 text-right">{moment.unix(parseInt(props.order.createtime) / 1000000000).format("YYYY-MM-DD hh:mm")}</div>
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