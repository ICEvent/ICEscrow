import React from "react"

import {    MENU_ORDERS, MENU_PROFILE,MENU_HOME   } from "../lib/constants";

import OfferList from "../components/offers/OfferList";

import { useMenu } from "../components/Store";



import { ProfilePage } from "./Profile";
import OrderList from "../components/orders/OrderList";



const Home = () => {
  const { menu } = useMenu();

  return (
    <div className="mt-8">
        {!menu || menu == MENU_HOME && <OfferList  />}
        {menu == MENU_ORDERS && <OrderList />}
        {menu == MENU_PROFILE && <ProfilePage />}

    </div>
  )
}

export { Home }
