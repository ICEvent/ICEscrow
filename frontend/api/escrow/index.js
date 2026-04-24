import { Actor, HttpAgent } from "@dfinity/agent";

// Imports and re-exports candid interface
import { idlFactory } from "./service.did.js";
export { idlFactory } from "./service.did.js";

/* CANISTER_ID is replaced by webpack based on node environment
 * Note: canister environment variable will be standardized as
 * process.env.CANISTER_ID_<CANISTER_NAME_UPPERCASE>
 * beginning in dfx 0.15.0
 */
export const canisterId =
  process.env.CANISTER_ID_ESCROW;

export const createActor = (canisterId, options = {}) => {
  const agent = options.agent || new HttpAgent({ ...options.agentOptions });

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};

export const escrow = canisterId ? createActor(canisterId) : undefined;
