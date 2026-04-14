import React from "react"
import {
  BrowserRouter,
  Routes,
  Route,

} from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Store from "./components/Store";
import Header from './header';
// import Navbar from "./components/Navbar";
import { ProfilePage } from "./pages/Profile"
import { Home } from "./pages/Home";
import Item from "./pages/Item";
import UserItems from "./pages/UserItems";
import GiveAwayPage from "./pages/GiveAway";
declare global {
  interface Window {
    ic: {
      plug: {
        agent: any;
        isConnected: () => Promise<boolean>;
        createAgent: (args?: {
          whitelist: string[];
          host?: string;
        }) => Promise<undefined>;
        requestBalance: () => Promise<
          Array<{
            amount: number;
            canisterId: string | null;
            image: string;
            name: string;
            symbol: string;
            value: number | null;
          }>
        >;
        requestTransfer: (arg: {
          to: string;
          amount: number;
          opts?: {
            fee?: number;
            memo?: number;
            from_subaccount?: number;
            created_at_time?: {
              timestamp_nanos: number;
            };
          };
        }) => Promise<{ height: number }>;
      };
    };
  }
}

export default () => {
  return (
    <BrowserRouter>
      <Store>
        <div className="fade-in relative min-h-screen w-full overflow-x-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-10">
          <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-orange-200/45 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-teal-200/45 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[85%] -translate-x-1/2 rounded-[50%] bg-amber-100/40 blur-3xl" />
          <div className="hero-ring pointer-events-none left-6 top-32 h-32 w-32" />
          <div className="hero-ring pointer-events-none right-8 top-52 h-20 w-20" />

          <Header />
          <ToastContainer />

          <main className="relative mx-auto w-full max-w-7xl">
            <Routes>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/item/:id" element={<Item />} />
              <Route path="/userid/:userId" element={<UserItems />} />
              <Route path="/giveaway/:id" element={<GiveAwayPage />} />
              <Route path="/" element={<Home />} />
            </Routes>
          </main>
        </div>
      </Store>
    </BrowserRouter>


  )
}

