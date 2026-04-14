import React from "react"
import {
  BrowserRouter,
  Routes,
  Route,

} from "react-router-dom";




import { makeStyles } from "@mui/material";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link, Slider, styled } from '@mui/material'

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


  const Root = styled('div')`
  padding: 1% 2% 10vh 2%;
  width: 100%;
  min-height: 95vh;
  display: flex;


  & a {
    text-decoration: none;
    color: ${({ theme: { palette } }) => palette.primary.main};
  }
`


  return (
    <BrowserRouter>
      <Store>
        <Root>
          <Header/>
          <ToastContainer />
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/item/:id" element={<Item />} />
            <Route path="/userid/:userId" element={<UserItems />} />
            <Route path="/" element={<Home />} />
          </Routes>
        </Root>
      </Store>
    </BrowserRouter>


  )
}

