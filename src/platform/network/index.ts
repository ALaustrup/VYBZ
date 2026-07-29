import type { NetworkState } from "@/contracts";

export type NetworkListener = (state: NetworkState) => void;

export interface NetworkStateProvider {
  getState(): NetworkState;
  subscribe(listener: NetworkListener): () => void;
}

export function createBrowserNetworkProvider(): NetworkStateProvider {
  const listeners = new Set<NetworkListener>();

  const emit = () => {
    const state: NetworkState = navigator.onLine ? "online" : "offline";
    for (const l of listeners) l(state);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", emit);
    window.addEventListener("offline", emit);
  }

  return {
    getState() {
      if (typeof navigator === "undefined") return "unknown";
      return navigator.onLine ? "online" : "offline";
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
