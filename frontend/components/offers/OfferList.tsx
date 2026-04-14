import * as React from "react"

import ListItemForm from "./ListItemForm"
import { toast } from "react-toastify"
import { useEscrow, useLoading, useGlobalContext } from "../Store"
import ItemList from "../items/ItemList";

import { NewOrder, NewSellOrder } from "../../api/escrow/escrow.did"
import { Item } from "../../api/escrow/escrow.did"
import {
  LIST_ITEM_NFT,
} from "../../lib/constants"
import OrderForm from "../orders/OrderForm"

export default () => {
  const {
    state: { isAuthed },
  } = useGlobalContext()
  const escrow = useEscrow()
  const { setLoading } = useLoading()
  const [openListForm, setOpenListForm] = React.useState(false)
  const [openOrderForm, setOpenOrderForm] = React.useState(false)

  const [itemType] = React.useState(LIST_ITEM_NFT)
  const [offers, setOffers] = React.useState<Item[]>([])
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {

    loadOffers()

  }, [page])


  const saveList = (data) => {
    setOpenListForm(false)
    setLoading(true)
    escrow.listItem(data).then((res) => {
      if (res["ok"]) {
        toast.success("Item has been listed")
        loadOffers()
      } else {
        toast.error(res["err"])
      }

      setLoading(false)
    })
  }
  const loadOffers = () => {
    setLoading(true)
    escrow.getItems(BigInt(page)).then((res) => {

      setLoading(false)
      setOffers(res)
    })
  }

  function buy(newOrder: NewOrder) {
    try {
      setLoading(true)
      escrow.buy(newOrder).then((res) => {
        setLoading(false)
        if (res["ok"]) {
          toast.success("your order has created!")
        } else {
          toast.error(res["err"].toString())
        }
      })
      setOpenOrderForm(false)
    } catch (err) {
      toast.error(err.toString())
    }
  }

  function sell(newOrder: NewSellOrder) {
    try {
      setLoading(true)
      escrow.sell(newOrder).then((res) => {
        setLoading(false)
        if (res["ok"]) {
          toast.success("your order has created!")
        } else {
          toast.error(res["err"].toString())
        }
      })
      setOpenOrderForm(false)
    } catch (err) {
      toast.error(err.toString())
    }
  }

  return (
    <React.Fragment>
      <section className="reveal-up glass-panel rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Featured Catalog</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Explore Live Listings</h2>
            <p className="mt-1 text-sm text-slate-600">Handpicked offers with escrow-first checkout protection.</p>
          </div>

          {isAuthed && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOpenListForm(true)}
                className="btn-modern-primary commerce-gradient min-w-[170px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                List New Product
              </button>
              <button
                onClick={() => setOpenOrderForm(true)}
                className="btn-modern-secondary min-w-[170px] rounded-xl border border-teal-600/60 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-sm"
              >
                Start Escrow Order
              </button>
            </div>
          )}
        </div>
      </section>

      <ItemList items={offers} />

      <div className="reveal-up reveal-delay-1 mt-4 flex items-center justify-center gap-3 p-2">
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={page === 1}
          className="btn-modern-secondary rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-500 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          Page {page}
        </p>
        <button
          onClick={() => setPage(p => p + 1)}
          className="btn-modern-secondary rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-500 hover:text-orange-700"
        >
          Next
        </button>
      </div>

      {openListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setOpenListForm(false)}>
          <div className="reveal-up relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-white/40 bg-white/95 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenListForm(false)}
              className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100"
            >
              x
            </button>
            <h3 className="mb-4 text-lg font-bold text-slate-900">Input Item Information</h3>
            <ListItemForm submit={saveList} itype={itemType} />
          </div>
        </div>
      )}

      {openOrderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setOpenOrderForm(false)}>
          <div className="reveal-up relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-white/40 bg-white/95 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenOrderForm(false)}
              className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100"
            >
              x
            </button>
            <h3 className="mb-4 text-lg font-bold text-slate-900">New Escrow Contract</h3>
            <OrderForm buy={buy} sell={sell} />
          </div>
        </div>
      )}
    </React.Fragment>
  )
}
