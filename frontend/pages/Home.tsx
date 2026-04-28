import React from "react"

import { MENU_ORDERS, MENU_PROFILE, MENU_HOME, MENU_FREE, MENU_MY_ITEMS } from "../lib/constants";

import OfferList from "../components/offers/OfferList";

import { useGlobalContext, useMenu } from "../components/Store";



import { ProfilePage } from "./Profile";
import OrderList from "../components/orders/OrderList";
import MyItems from "../components/items/MyItems";



const Home = () => {
  const { menu } = useMenu();
  const { state: { isAuthed } } = useGlobalContext();
  const showShop = !menu || menu == MENU_HOME || (!isAuthed && menu != MENU_FREE);
  const showFreeItems = menu == MENU_FREE;

  return (
    <div className="mt-3 space-y-5">       

        {showShop && <OfferList />}
        {showFreeItems && <OfferList freeOnly />}
        {isAuthed && menu == MENU_ORDERS && <OrderList />}
        {isAuthed && menu == MENU_PROFILE && <ProfilePage />}
        {isAuthed && menu == MENU_MY_ITEMS && <MyItems />}

    </div>
  )
}

export { Home }
