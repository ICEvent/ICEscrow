import React from "react"

import {    MENU_ORDERS, MENU_PROFILE,MENU_HOME   } from "../lib/constants";

import OfferList from "../components/offers/OfferList";

import { useGlobalContext, useMenu } from "../components/Store";



import { ProfilePage } from "./Profile";
import OrderList from "../components/orders/OrderList";



const Home = () => {
  const { menu } = useMenu();
  const { state: { isAuthed } } = useGlobalContext();
  const showShop = !menu || menu == MENU_HOME || !isAuthed;

  return (
    <div className="mt-3 space-y-5">
        {showShop && (
          <section className="reveal-up glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rounded-full bg-orange-200/50 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-36 w-36 rounded-full bg-teal-200/40 blur-2xl" />

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">Secure Digital Commerce</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
              Buy, Sell, and Settle with Escrow Confidence
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Discover verified listings, create protected escrow orders, and manage fulfillment in one modern marketplace experience.
            </p>

            <div className="mt-5 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['24/7', 'Availability'],
                ['On-chain', 'Settlement'],
                ['Secure', 'Escrow Flow'],
                ['Fast', 'Order Setup'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-center shadow-sm">
                  <p className="text-base font-extrabold text-slate-900">{value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {showShop && <OfferList />}
        {isAuthed && menu == MENU_ORDERS && <OrderList />}
        {isAuthed && menu == MENU_PROFILE && <ProfilePage />}

    </div>
  )
}

export { Home }
