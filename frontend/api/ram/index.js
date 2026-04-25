import { Actor, HttpAgent } from "@dfinity/agent";

// Imports and re-exports candid interface
import { idlFactory } from "./ram.did.js";
export { idlFactory } from "./ram.did.js";

export const canisterId = "pxu6k-jaaaa-aaaap-aaamq-cai";

export const createActor = (canisterId, options = {}) => {
  const agent = options.agent || new HttpAgent({ ...options.agentOptions });

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options.actorOptions,
  });
};

export const ram = canisterId ? createActor(canisterId) : undefined;
