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

        {showShop && <OfferList />}
        {isAuthed && menu == MENU_ORDERS && <OrderList />}
        {isAuthed && menu == MENU_PROFILE && <ProfilePage />}

    </div>
  )
}

export { Home }
