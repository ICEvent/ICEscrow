import React, { useState } from "react"
import { useEffect } from "react"
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent, Identity } from "@dfinity/agent";


import { HOST } from "../lib/canisters";
import { ONE_WEEK_NS, IDENTITY_PROVIDER_IC } from "../lib/constants";

import { useOneblock, useSetAgent, useGlobalContext, useEscrow } from "./Store";
import { Profile } from "../api/profile/profile.did";
import OrderList from "./orders/OrderList";
import DarkModeToggle from "../header/DarkModeToggle";

import LoginButton from "./LoginButton";

export default () => {

  const oneblock = useOneblock();
  const escrow = useEscrow();
  const setAgent = useSetAgent();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const [openProfile, setOpenProfile] = useState(false);

  const [profile, setProfile] = useState<Profile>();
  const [authClient, setAuthClient] = useState<AuthClient>(null);



  useEffect(() => {

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
        loadProfile();
      }


    })();

  }, []);

  const handleAuthenticated = async (authClient: AuthClient) => {

    const identity: Identity = authClient.getIdentity();
    setAgent({
      agent: await HttpAgent.create({
        identity,
        host: HOST,
      }),
      isAuthed: true,

    });

  };



  const logout = async () => {
    await authClient.logout();
    setAgent({ agent: null });
  };

  async function loadProfile() {
    if (principal) {
      oneblock.getMyProfile().then(res => {
        if (res[0]) {
          setProfile(res[0])
        }
      });
    }
  }



  return (
    <div className="mb-2 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" className="mr-2 h-8 w-8 rounded-md" aria-hidden="true" />
        <p className="flex-1 text-lg font-semibold text-slate-800">Vansday</p>
        {isAuthed && (
          <button
            type="button"
            onClick={() => setOpenProfile(true)}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-cyan-500 hover:text-cyan-700"
          >
            Profile
          </button>
        )}
        {!isAuthed && <LoginButton />}
        {principal && (
          <button
            type="button"
            title={principal.toString()}
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-rose-500 hover:text-rose-600"
          >
            {profile?.name || (principal.toString().slice(0, 5) + "..." + principal.toString().slice(-5))}
          </button>
        )}
        <DarkModeToggle />
      </div>

      {openProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpenProfile(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Orders</h3>
            <OrderList />
          </div>
        </div>
      )}
    </div>

  )
}
