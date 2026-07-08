import * as React from "react"

import ListItemForm from "./ListItemForm"
import { toast } from "react-toastify"
import { useEscrow, useLoading, useGlobalContext } from "../Store"
import ItemList from "../items/ItemList";

import { NewOrder, NewSellOrder } from "../../api/escrow/service.did"
import { Item } from "../../api/escrow/service.did"
import {
  LIST_ITEM_NFT,
} from "../../lib/constants"
import OrderForm from "../orders/OrderForm"
import { getCanisterErrorMessage, isCanisterOkResult } from "../../lib/canisterResult"

type OfferListProps = {
  freeOnly?: boolean;
}

export default ({ freeOnly = false }: OfferListProps) => {
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
    loadOffers({ showError: false })
  }, [page])


  const saveList = async (data) => {
    setOpenListForm(false)
    setLoading(true)
    try {
      const res = await escrow.listItem(data)
      if (isCanisterOkResult(res)) {
        toast.success("Item has been listed")
        await loadOffers({ showError: false })
      } else {
        toast.error(getCanisterErrorMessage(res, "Failed to list item"))
      }
    } catch (err) {
      toast.error(err?.toString() ?? "Unable to list item")
    } finally {
      setLoading(false)
    }
  }

  const loadOffers = async ({ showError = true }: { showError?: boolean } = {}) => {
    setLoading(true)
    try {
      const res = await escrow.getItems(BigInt(page))
      setOffers(res)
    } catch (err) {
      if (showError) {
        toast.error(err?.toString() ?? "Unable to load offers")
      }
      console.error("Unable to load offers", err)
    } finally {
      setLoading(false)
    }
  }

  function buy(newOrder: NewOrder) {
    setLoading(true)
    escrow.buy(newOrder)
      .then((res) => {
        if (isCanisterOkResult(res)) {
          toast.success("your order has created!")
        } else {
          toast.error(getCanisterErrorMessage(res, "Failed to create order"))
        }
      })
      .catch((err) => {
        toast.error(err?.toString() ?? "Unable to create order")
      })
      .finally(() => {
        setLoading(false)
      })
    setOpenOrderForm(false)
  }

  function sell(newOrder: NewSellOrder) {
    setLoading(true)
    escrow.sell(newOrder)
      .then((res) => {
        if (isCanisterOkResult(res)) {
          toast.success("your order has created!")
        } else {
          toast.error(getCanisterErrorMessage(res, "Failed to create order"))
        }
      })
      .catch((err) => {
        toast.error(err?.toString() ?? "Unable to create order")
      })
      .finally(() => {
        setLoading(false)
      })
    setOpenOrderForm(false)
  }

  return (
    <React.Fragment>
      <section className="reveal-up glass-panel rounded-3xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">{freeOnly ? 'Free Item Menu' : 'Featured Catalog'}</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{freeOnly ? 'Claim Free Items' : 'Explore Live Listings'}</h2>
            <p className="mt-1 text-sm text-slate-600">{freeOnly ? 'Only zero-price listings. Claim in one click and complete delivery confirmation later.' : 'Handpicked offers with escrow-first checkout protection.'}</p>
          </div>

          {isAuthed && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOpenListForm(true)}
                className="btn-modern-primary commerce-gradient min-w-[170px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md"
              >
                {freeOnly ? 'Give Away Item' : 'List Item'}
              </button>
              {!freeOnly && (
                <button
                  onClick={() => setOpenOrderForm(true)}
                  className="btn-modern-secondary min-w-[170px] rounded-xl border border-teal-600/60 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-sm"
                >
                  Start Escrow Order
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <ItemList items={freeOnly ? offers.filter(o => o.price === BigInt(0)) : offers} defaultFilter='all' freeOnly={freeOnly} />

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
            <ListItemForm submit={saveList} itype={itemType} freeOnly={freeOnly} />
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
