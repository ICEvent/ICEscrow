import React, { FC, useState } from 'react'
import { useNavigate } from "react-router-dom";
import DarkModeToggle from './DarkModeToggle'

import { useEffect } from "react"

import { HttpAgent, Identity } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { HOST } from "../lib/canisters";
import { MENU_ORDERS, MENU_PROFILE, MENU_HOME } from "../lib/constants";

import { useSetAgent, useGlobalContext, useLoading, useMenu } from "../components/Store";

import LoginButton from "../components/LoginButton";

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
  }

  const openProfile = () => {
    handleClose();
    setMenu(MENU_PROFILE)
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
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 items-center gap-2 px-4">
          <DarkModeToggle />
          <button
            type="button"
            className="mr-2 h-8 w-8 rounded-md"
            aria-hidden="true"
          />
          <button
            type="button"
            className="flex-1 text-left text-lg font-semibold text-slate-800"
            onClick={() => setMenu(MENU_HOME)}
          >
            BlockList
          </button>

          {isAuthed && (
            <button
              type="button"
              onClick={handleClick}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
            >
              Account
            </button>
          )}
          {!isAuthed && <LoginButton />}

          {openMenu && (
            <div className="absolute right-4 top-14 z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={openProfile}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={openOrders}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Orders
              </button>
              <button
                type="button"
                onClick={logout}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
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
