import React, { FC, useState } from 'react'
import { useNavigate } from "react-router-dom";
import vansdayLogo from '../assets/vansday.png'
import DarkModeToggle from './DarkModeToggle'

import { useEffect } from "react"

import { HttpAgent, Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { HOST } from "../lib/canisters";
import { MENU_ORDERS, MENU_PROFILE, MENU_HOME, MENU_FREE, MENU_MY_ITEMS } from "../lib/constants";

import { useSetAgent, useGlobalContext, useLoading, useMenu } from "../components/Store";

import LoginButton from "../components/LoginButton";
import NotificationBell from "../components/NotificationBell";
import PrincipalName from "../components/PrincipalName";

const Header: FC = () => {
  const setAgent = useSetAgent();

  const navigate = useNavigate();
  const { menu, setMenu } = useMenu()
  const { state: { isAuthed, principal } } = useGlobalContext();

  const { loading } = useLoading();

  const [authClient, setAuthClient] = useState<AuthClient>(null);

  const [openMenu, setOpenMenu] = React.useState(false);
  const handleClick = () => {
    setOpenMenu((prev) => !prev);
  };
  const handleClose = () => {
    setOpenMenu(false);
  };

  const openOrders = () => {
    handleClose();
    setMenu(MENU_ORDERS)
    navigate("/", { replace: true });
  }

  const openProfile = () => {
    handleClose();
    setMenu(MENU_PROFILE)
    navigate("/", { replace: true });
  }

  const openShop = () => {
    setMenu(MENU_HOME);
    navigate("/", { replace: true });
  }

  const openStore3D = () => {
    navigate("/store3d");
  }

  const openFreeItems = () => {
    setMenu(MENU_FREE);
    navigate("/", { replace: true });
  }

  const openMyItems = () => {
    handleClose();
    setMenu(MENU_MY_ITEMS);
    navigate("/", { replace: true });
  }
  useEffect(() => {
    if (!menu) setMenu(MENU_HOME);

    (async () => {
      const authClient = await AuthClient.create(
        {
          idleOptions: {
            disableIdle: true,
            disableDefaultIdleCallback: true
          }
        }
      );
      setAuthClient(authClient);

      if (await authClient.isAuthenticated()) {
        handleAuthenticated(authClient);

      }


    })();

  }, []);

  const handleAuthenticated = async (authClient: AuthClient) => {

    const identity: Identity = authClient.getIdentity();

    setAgent({
      agent: new HttpAgent({
        identity,
        host: HOST,
      }),
      isAuthed: true,

    });

  };

 
  const logout = async () => {
    handleClose();
    await authClient.logout();
    setAgent({ agent: null });
    navigate("/", { replace: true });
  };


  return (
    <>
      <header className="fade-in fixed left-0 right-0 top-0 z-40 px-4 pt-3 sm:px-6 lg:px-10">
        <div className="glass-panel mx-auto flex h-16 w-full max-w-7xl items-center gap-2 rounded-2xl px-3 sm:px-4">
          <button
            type="button"
            className="mr-2 flex items-center gap-2"
            onClick={openShop}
          >
            <img src={vansdayLogo} alt="Vansday" className="h-9 w-9 rounded-xl object-contain" />
            <span className="text-left">
              <span className="block text-base font-extrabold leading-none text-slate-900">Vansday</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Escrow</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 rounded-xl bg-slate-100/80 p-1 md:flex">
            <button
              type="button"
              onClick={openShop}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${menu == MENU_HOME ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Shop
            </button>
            <button
              type="button"
              onClick={openFreeItems}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${menu == MENU_FREE ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Free 
            </button>
            <button
              type="button"
              onClick={openStore3D}
              className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition text-slate-600 hover:text-slate-900"
            >
              🏪 3D Store
            </button>
            {isAuthed && (
              <>
                <button
                  type="button"
                  onClick={openOrders}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${menu == MENU_ORDERS ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Orders
                </button>
                <button
                  type="button"
                  onClick={openMyItems}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${menu == MENU_MY_ITEMS ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  My Items
                </button>
                <button
                  type="button"
                  onClick={openProfile}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${menu == MENU_PROFILE ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Profile
                </button>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <DarkModeToggle />
            <NotificationBell />

            {isAuthed && (
              <button
                type="button"
                onClick={handleClick}
                className="btn-modern-secondary rounded-full border border-slate-300/80 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
              >
                {principal ? <PrincipalName principal={principal} /> : 'Account'}
              </button>
            )}
            {!isAuthed && <LoginButton />}
          </div>

          {openMenu && (
            <div className="reveal-up absolute right-4 top-16 z-50 min-w-[210px] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
              <button
                type="button"
                onClick={openProfile}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={openOrders}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Orders
              </button>
              <button
                type="button"
                onClick={openMyItems}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                My Items
              </button>
              <button
                type="button"
                onClick={logout}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      {loading && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40" onClick={handleClose}>
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/40 border-t-white" />
        </div>
      )}
    </>
  )
}

export default Header
