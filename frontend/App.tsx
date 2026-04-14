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
        <div className="fade-in relative min-h-screen w-full overflow-x-hidden px-[3%] pb-[10vh] pt-20">
          <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <Header/>
          <ToastContainer />
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/item/:id" element={<Item />} />
            <Route path="/userid/:userId" element={<UserItems />} />
            <Route path="/" element={<Home />} />
          </Routes>
        </div>
      </Store>
    </BrowserRouter>


  )
}

