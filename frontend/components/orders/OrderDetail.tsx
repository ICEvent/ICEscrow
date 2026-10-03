import * as React from 'react';
import moment from 'moment';

import { ORDER_STATUS_CANCELED, ORDER_STATUS_CLOSED, ORDER_STATUS_DELIVERED, ORDER_STATUS_DEPOSITED, ORDER_STATUS_NEW, ORDER_STATUS_RECEIVED, ORDER_STATUS_REFUNDED, ORDER_STATUS_RELEASED } from '../../lib/constants';
import { toast } from 'react-toastify';

import { useEscrow, useGlobalContext, useLoading } from '../Store';
import PrincipalName from '../PrincipalName';
import CommentButton from './CommentButton';
import Comments from './CommentList';
import ReviewForm from '../profile/ReviewForm';
import { currencyBase, currencySymbol } from '../../lib/currencyUtils';



export default (props) => {


    const { state: {
        principal
    } } = useGlobalContext();
    const escrow = useEscrow();

    const [order] = React.useState(props.order);
    const [comments, setComments] = React.useState(props.order.comments);
    const [status, setStatus] = React.useState<string>(Object.getOwnPropertyNames(order.status)[0])

    const currency = currencySymbol(order.currency);
    const es = currencyBase(order.currency);
    const amount = parseInt(order.amount) / es;
    const isFreeOrder = amount === 0;
    const amountLabel = isFreeOrder ? "FREE" : `${amount} (${currency})`;
    const isSeller = principal?.toString() === order.seller.toString();
    const isLockHolder = principal?.toString() === order.lockedby?.toString();
    const isTerminalOrder =
        status === ORDER_STATUS_CLOSED ||
        status === ORDER_STATUS_CANCELED ||
        status === ORDER_STATUS_REFUNDED;
    const canCloseOrder =
        isSeller &&
        ((isFreeOrder && !isTerminalOrder) || status === ORDER_STATUS_RELEASED);
    
    const activeStep = isFreeOrder ? 2 : (
        status == ORDER_STATUS_NEW ? 1 :
        status == ORDER_STATUS_DEPOSITED ? 2 :
            status == ORDER_STATUS_DELIVERED ? 3 :
                status == ORDER_STATUS_RECEIVED ? 4 :
                   ( status == ORDER_STATUS_RELEASED || status == ORDER_STATUS_CLOSED) ? 5 : 1
    );

    const { setLoading } = useLoading();
    const [confirmed, setConfirmed] = React.useState(false)
    const [balance, setBalance] = React.useState(0)
    const [reviewSubmitted, setReviewSubmitted] = React.useState(false)


    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setConfirmed(event.target.checked);
    };

    const loadOrder = () => {
        // console.log("reloading order")
        setLoading(true);
        escrow.getOrder(order.id).then(res=>{
            setLoading(false)
            // console.log(res[0]);
            if(res[0]){setComments(res[0].comments)}
 
        });
    };

    function fetchBalance() {
        setLoading(true);
        const currencyKey = Object.keys(order.currency)[0];
        // For ICRC-1 orders, use getOrderBalance which resolves the correct subaccount.
        const balancePromise = currencyKey === 'ICRC1'
            ? escrow.getOrderBalance(order.id)
            : escrow.accountBalance(order.account.id, order.currency);
        balancePromise.then(res => {
            const base = currencyBase(order.currency);
            if (res["e8s"] !== undefined) {
                setBalance(parseInt(res["e8s"]) / base);
            } else if (res["e6s"] !== undefined) {
                setBalance(parseInt(res["e6s"]) / base);
            } else {
                setBalance(0);
            }
            setLoading(false);
        });
    };
    const deposit = () => {
        setLoading(true)
        escrow.deposit(order.id).then(res => {
            if (res["ok"]) {
                toast.success("Deal updated");
                setStatus(ORDER_STATUS_DEPOSITED)
            } else {
                toast.error(res["err"])
            };
            setLoading(false);
        })
    };

    const deliver = () => {
        setLoading(true);
        escrow.deliver(order.id).then(res => {
            if (res["ok"]) {
                toast.success("Status has changed");
                setStatus(ORDER_STATUS_DELIVERED)
            } else {
                toast.error(res["err"])
            }
            setLoading(false);
        })
    };
    const receive = () => {
        setLoading(true);
        escrow.receive(order.id).then(res => {
            if (res["ok"]) {
                toast.success("Status has changed");
                setStatus(ORDER_STATUS_RECEIVED)
            } else {
                toast.error(res["err"])
            }
            setLoading(false);
        })
    };
    const release = () => {
        setLoading(true);
        escrow.release(order.id).then(res => {
            if (res["ok"]) {
                toast.success("Payment transfer completed");
                setStatus(ORDER_STATUS_RELEASED)
            } else {
                toast.error(res["err"])
            }
            setLoading(false);
        })
    };
    const refundOrder = () => {
        setLoading(true);
        escrow.refund(order.id).then(res => {
            if (res["ok"]) {
                toast.success("Refund sent to buyer");
                setStatus(ORDER_STATUS_REFUNDED)
            } else {
                toast.error(res["err"])
            }
            setLoading(false);
        })
    };

    const cancelOrder = async () => {
        setLoading(true);
        try {
            const res = await escrow.cancel(order.id);
            if (res["ok"]) {
                const refreshed = await escrow.getOrder(order.id);
                const current = refreshed?.[0];
                const nextStatus = current ? Object.getOwnPropertyNames(current.status)[0] : ORDER_STATUS_CANCELED;
                setStatus(nextStatus);
                toast.success(nextStatus === ORDER_STATUS_REFUNDED ? "Deal canceled and payment refunded" : "Deal canceled");
            } else {
                toast.error(res["err"])
            }
        } catch (error) {
            toast.error(error?.toString() ?? "Failed to cancel deal")
        } finally {
            setLoading(false);
        }
    };  

    const closeOrder = () => {
        setLoading(true);
        escrow.close(order.id).then(res => {
            if (res["ok"]) {
                toast.success("Deal archived");
                setStatus(ORDER_STATUS_CLOSED)
            } else {
                toast.error(res["err"])
            }
            setLoading(false);
        })
    };


    return (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-900"><span className="font-semibold text-slate-800">Created:</span> {moment.unix(parseInt(order.createtime) / 1000000000).format("YYYY-MM-DD hh:mm")}</div>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-900"><span className="font-semibold text-slate-800">Deal ID:</span> {parseInt(order.id)}</div>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-900"><span className="font-semibold text-slate-800">Amount:</span> {amountLabel}</div>
                {!isFreeOrder && <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-900 break-all"><span className="font-semibold text-slate-800">Protected payment account:</span> {order.account.id}</div>}
                <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-900 sm:col-span-2"><span className="font-semibold text-slate-800">Buyer {order.buyer.toString() == principal.toString() ? "(you)" : ""}:</span> <PrincipalName principal={order.buyer} /></div>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-900 sm:col-span-2"><span className="font-semibold text-slate-800">Seller {order.seller.toString() == principal.toString() ? "(you)" : ""}:</span> <PrincipalName principal={order.seller} /></div>
                {!isFreeOrder && (
                    <div className="rounded-md bg-slate-50 px-3 py-2 text-slate-900 sm:col-span-2">
                        <span className="font-semibold text-slate-800">Protected balance:</span> {balance}
                        <button
                            type="button"
                            onClick={fetchBalance}
                            className="ml-2 rounded-md border border-cyan-600 px-2 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
                        >
                            Check
                        </button>
                    </div>
                )}
            </div>

            <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Status</p>
                {isFreeOrder ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        <p className="font-semibold">Free Item Claim</p>
                        <p className="mt-1 text-xs">
                            {principal?.toString() === order.seller.toString() 
                                ? "Go back to the item to set status: Hold, Sold, or Relist."
                                : "Waiting for seller to set item status (Hold, Sold, or Relist)."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                            {[
                                { label: 'Agreement', step: 1 },
                                { label: 'Protected', step: 2 },
                                { label: 'Delivered', step: 3 },
                                { label: 'Received', step: 4 },
                                { label: 'Complete', step: 5 },
                            ].map((s) => (
                                <div
                                    key={s.step}
                                    className={`rounded-md px-3 py-2 text-center font-medium ${activeStep >= s.step ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                                >
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="space-y-2">
                {!isFreeOrder && (
                    <>
                        {status == ORDER_STATUS_NEW && principal.toString() == order.buyer.toString() && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Protect this deal by depositing [{amount} {currency}] into the escrow account {order.account.id}.</div>}
                        {status == ORDER_STATUS_NEW && principal.toString() == order.seller.toString() && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Waiting for the buyer to protect the payment [{amount} {currency}] in escrow. You can still cancel before payment is protected.</div>}
                        {status == ORDER_STATUS_DEPOSITED && principal.toString() == order.seller.toString() && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Payment is protected. Confirm after you have delivered {order.memo} to the buyer.</div>}
                        {status == ORDER_STATUS_DEPOSITED && principal.toString() == order.buyer.toString() && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Payment is protected. Waiting for the seller to deliver {order.memo}.</div>}
                        {status == ORDER_STATUS_DELIVERED && principal.toString() == order.buyer.toString() && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">Confirm only after you have received {order.memo}. This allows the seller to start payout; the transfer is verified separately on-chain.</div>}
                        {status == ORDER_STATUS_RECEIVED && principal.toString() == order.seller.toString() && <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">The buyer confirmed receipt. You can now receive payment. Vansday will submit the transfer and verify it on-chain; transaction fees may apply.</div>}

                        {((status == ORDER_STATUS_NEW && principal.toString() == order.buyer.toString()) ||
                            status == ORDER_STATUS_DEPOSITED && principal.toString() == order.seller.toString() ||
                            status == ORDER_STATUS_DELIVERED && principal.toString() == order.buyer.toString()) && (
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" onChange={handleChange} />
                                YES, I confirmed
                            </label>
                        )}
                    </>
                )}

                <div className="flex flex-wrap gap-2">
                    {!isFreeOrder && (
                        <>
                            {status == ORDER_STATUS_NEW && principal.toString() == order.buyer.toString() && <button type="button" disabled={!confirmed} onClick={deposit} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">Protect Payment</button>}
                            {status == ORDER_STATUS_DEPOSITED && principal.toString() == order.seller.toString() && <button type="button" disabled={!confirmed} onClick={deliver} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">Confirm Delivery</button>}
                            {status == ORDER_STATUS_DELIVERED && principal.toString() == order.buyer.toString() && <button type="button" disabled={!confirmed} onClick={receive} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">Confirm Receipt</button>}
                            {(status == ORDER_STATUS_CANCELED || status == ORDER_STATUS_REFUNDED) && (principal.toString() == order.buyer.toString() || principal.toString() == order.seller.toString()) && <button type="button" onClick={refundOrder} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700">Check & Refund Payment</button>}
                            {status == ORDER_STATUS_RECEIVED && principal.toString() == order.seller.toString() && <button type="button" onClick={release} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700">Receive Payment</button>}
                            {status == ORDER_STATUS_NEW && isLockHolder && <button type="button" onClick={cancelOrder} className="rounded-md border border-rose-500 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>}
                        </>
                    )}

                    {canCloseOrder && <button type="button" onClick={closeOrder} className="rounded-md border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Archive Deal</button>}

                    <CommentButton id={order.id} reload={loadOrder}/>
                </div>
            </div>

            <Comments comments={comments}/>

            {status === ORDER_STATUS_RELEASED && !isFreeOrder && principal?.toString() === order.buyer.toString() && !reviewSubmitted && (
                <ReviewForm orderId={order.id} onSubmitted={() => setReviewSubmitted(true)} />
            )}
        </div>

    )
}