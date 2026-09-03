import * as React from "react"
import { useNavigate } from "react-router-dom"
import ListItemForm from "./ListItemForm"
import { toast } from "react-toastify"
import { useEscrow, useLoading, useGlobalContext } from "../Store"
import ItemList from "../items/ItemList";

import { NewOrder, NewSellOrder } from "../../api/escrow/service.did"
import { Item } from "../../api/escrow/service.did"
import { ServiceInfo } from "../../api/escrow/serviceModels"
import { LIST_ITEM_MERCHANDISE } from "../../lib/constants"
import OrderForm from "../orders/OrderForm"
import { getCanisterErrorMessage, isCanisterOkResult } from "../../lib/canisterResult"

type OfferListProps = {
  freeOnly?: boolean;
}

const PAGE_SIZE = 20;

export default ({ freeOnly = false }: OfferListProps) => {
  const {
    state: { isAuthed },
  } = useGlobalContext()
  const escrow = useEscrow()
  const navigate = useNavigate()
  const { setLoading } = useLoading()
  const [openListForm, setOpenListForm] = React.useState(false)
  const [openOrderForm, setOpenOrderForm] = React.useState(false)

  const [offers, setOffers] = React.useState<Item[]>([])
  const [servicesById, setServicesById] = React.useState<Record<string, ServiceInfo>>({})
  const [page, setPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(true)

  React.useEffect(() => {
    setPage(1)
    loadOffers(1, true, { showError: false })
  }, [freeOnly])

  const saveList = async (data) => {
    setOpenListForm(false)
    setLoading(true)
    try {
      const res = await escrow.listItem(data)
      if (isCanisterOkResult(res)) {
        toast.success("Item has been listed")
        setPage(1)
        await loadOffers(1, true, { showError: false })
      } else {
        toast.error(getCanisterErrorMessage(res, "Failed to list item"))
      }
    } catch (err) {
      toast.error(err?.toString() ?? "Unable to list item")
    } finally {
      setLoading(false)
    }
  }

  const loadOffers = async (
    targetPage: number,
    replace = false,
    { showError = true }: { showError?: boolean } = {},
  ) => {
    setLoading(true)
    try {
      const res = await escrow.getItemsWithAssociations(BigInt(targetPage))
      const incomingItems = res.map((entry) => entry.item)
      const incomingServices = Object.fromEntries(
        res.flatMap((entry) => entry.service[0]
          ? [[entry.service[0].id.toString(), entry.service[0]]]
          : []),
      )

      setOffers((previous) => {
        if (replace) return incomingItems
        const byId = new Map(previous.map((item) => [item.id.toString(), item]))
        incomingItems.forEach((item) => byId.set(item.id.toString(), item))
        return Array.from(byId.values())
      })
      setServicesById((previous) => replace
        ? incomingServices
        : { ...previous, ...incomingServices })
      setHasMore(res.length === PAGE_SIZE)
      return res.length
    } catch (err) {
      if (showError) {
        toast.error(err?.toString() ?? "Unable to load offers")
      }
      console.error("Unable to load offers", err)
      return 0
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    const nextPage = page + 1
    const loaded = await loadOffers(nextPage, false)
    if (loaded > 0) {
      setPage(nextPage)
    }
  }

  function buy(newOrder: NewOrder) {
    setLoading(true)
    escrow.buy(newOrder)
      .then((res) => {
        if (isCanisterOkResult(res)) {
          toast.success("Order created. Continue in Orders.")
          navigate('/orders')
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
          toast.success("Order created. Continue in Orders.")
          navigate('/orders')
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
            <p className="mt-1 text-sm text-slate-600">{freeOnly ? 'Only zero-price listings. Claim in one click and complete delivery confirmation later.' : 'Browse items and services with escrow-first checkout protection.'}</p>
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

      <ItemList items={freeOnly ? offers.filter(o => o.price === BigInt(0)) : offers} servicesById={servicesById} defaultFilter='all' freeOnly={freeOnly} />

      {hasMore && (
        <div className="reveal-up reveal-delay-1 mt-4 flex items-center justify-center p-2">
          <button
            onClick={loadMore}
            className="btn-modern-secondary rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-orange-500 hover:text-orange-700"
          >
            Load More Listings
          </button>
        </div>
      )}

      {!hasMore && offers.length > 0 && (
        <p className="mt-4 text-center text-xs font-medium text-slate-500">You’ve reached the end of the current listings.</p>
      )}

      {openListForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setOpenListForm(false)}>
          <div className="reveal-up relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-white/40 bg-white/95 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpenListForm(false)}
              className="absolute right-3 top-3 h-8 w-8 rounded-full text-slate-500 transition hover:bg-slate-100"
              aria-label="Close listing form"
            >
              ×
            </button>
            <h3 className="mb-1 text-lg font-bold text-slate-900">{freeOnly ? 'Give Away an Item' : 'Create a Listing'}</h3>
            <p className="mb-4 text-sm text-slate-500">Add the essentials first. You can provide more detail when it helps buyers decide.</p>
            <ListItemForm submit={saveList} itype={LIST_ITEM_MERCHANDISE} freeOnly={freeOnly} />
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
              aria-label="Close escrow form"
            >
              ×
            </button>
            <h3 className="mb-1 text-lg font-bold text-slate-900">New Escrow Contract</h3>
            <p className="mb-4 text-sm text-slate-500">Create a direct escrow agreement with a buyer or seller.</p>
            <OrderForm buy={buy} sell={sell} />
          </div>
        </div>
      )}
    </React.Fragment>
  )
}
