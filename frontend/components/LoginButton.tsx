import React, { useState, useEffect } from "react"
import { HttpAgent } from "@dfinity/agent"
import { AuthClient } from "@dfinity/auth-client"
import {
  WHITELIST,
  IDENTITY_PROVIDER_NFID,
  DERIVATION_ORIGION,
  APP_LOGO,
  ONE_WEEK_NS,
  IDENTITY_PROVIDER_IC,
} from "../lib/constants"

import { useGlobalContext, useSetAgent } from "../components/Store"
const HOST = "https://ic0.app"

const DropdownMenu: React.FC = () => {

  const setAgent = useSetAgent()
  const [authClient, setAuthClient] = useState<any>()
  const [openMenu, setOpenMenu] = useState(false)
  useEffect(() => {
    (async () => {
      const authClient = await AuthClient.create({
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true,
        },
      })
      setAuthClient(authClient)

      // if (await window?.ic?.plug?.isConnected()) {
      //   if (!window.ic.plug.agent) {
      //     await window.ic.plug.createAgent({
      //       whitelist: WHITELIST,
      //       host: HOST,
      //     });
      //   }
      //   handlePlugLogin();
      // } else {
      if (await authClient.isAuthenticated()) {
        handleAuthenticated(authClient)
      }
      // }
    })()
  }, [])
  const handleClick = () => {
    setOpenMenu((prev) => !prev)
  }

  const handleClose = () => {
    setOpenMenu(false)
  }
  const DfinityIcon = () => (
    <img
      src="/assets/dfinity.png"
      alt="Menu"
      style={{ width: 24, height: 24 }}
    />
  )
  const handleAuthenticated = async (authClient) => {
    // auth.signin(authClient,()=>{});
    const identity = authClient.getIdentity()

    setAgent({
      agent: new HttpAgent({
        identity,
        host: HOST,
      }),
      isAuthed: true,
    })
  }

  const [showIILogin, setShowIILogin] = useState(false)

  const APPLICATION_NAME = "ICEvent"
  const APPLICATION_LOGO_URL = APP_LOGO

  const AUTH_PATH =
    "/authenticate/?applicationName=" +
    APPLICATION_NAME +
    "&applicationLogo=" +
    APPLICATION_LOGO_URL +
    "#authorize"

  const handleNFIDLogin = async () => {
    authClient.login({
      identityProvider: IDENTITY_PROVIDER_NFID + AUTH_PATH,
      maxTimeToLive: ONE_WEEK_NS,
      derivationOrigin: DERIVATION_ORIGION,
      windowOpenerFeatures:
        `left=${window.screen.width / 2 - 525}, ` +
        `top=${window.screen.height / 2 - 705},` +
        `toolbar=0,location=0,menubar=0,width=525,height=705`,
      onSuccess: () => {handleLogin()},
    })
  }

  const handleIILogin = async () => {

    authClient.login({
      derivationOrigin: DERIVATION_ORIGION,
      identityProvider: IDENTITY_PROVIDER_IC,
      maxTimeToLive: ONE_WEEK_NS,
      onSuccess: () => {handleLogin()},
    })
  }
  const handlePlugLogin = async () => {

    setAgent({
      agent: await (window as any)?.ic?.plug?.agent,
      isAuthed: true,
    })
    // navigate('/profile', { replace: true })
    // closeModal();
  }

  const connectPlug = async () => {
    const plug = (window as any)?.ic?.plug;
    if (!plug) {
      console.warn("Plug wallet extension not found");
      return;
    }

    const connected = await plug.requestConnect({ whitelist: WHITELIST, host: HOST });
    if (connected && !plug.agent) {
      await plug.createAgent({ whitelist: WHITELIST, host: HOST });
    }
    if (connected) {
      await handlePlugLogin();
    }
  }

  async function handleLogin() {
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
    };
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-md border border-cyan-600 px-3 py-1 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
      >
        Login
      </button>
      {openMenu && (
        <div className="absolute right-0 top-10 z-50 min-w-[220px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={handleIILogin}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <DfinityIcon />
            Internet Identity
          </button>
          <button
            type="button"
            onClick={handleNFIDLogin}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <span aria-hidden="true">G</span>
            NFID - Gmail
          </button>
          <button
            type="button"
            onClick={connectPlug}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <span aria-hidden="true">P</span>
            Plug Wallet
          </button>
        </div>
      )}
    </div>
  )
}

export default DropdownMenu
