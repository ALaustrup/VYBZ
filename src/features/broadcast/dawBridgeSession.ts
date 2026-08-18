/**
 * Process-wide DAW bridge so GoLiveSheet can hand the live AudioContext to
 * LiveWatchPage without tearing it down when the sheet unmounts.
 */

import { createDawBridgeClient, type DawBridgeClient } from "./dawBridge";

let client: DawBridgeClient | null = null;
let retained = false;

export function getDawBridge(): DawBridgeClient {
  if (!client) client = createDawBridgeClient();
  return client;
}

export function peekDawBridge(): DawBridgeClient | null {
  return client;
}

export function retainDawBridge(): void {
  retained = true;
}

export function isDawBridgeRetained(): boolean {
  return retained;
}

export function releaseDawBridge(): void {
  retained = false;
  if (client) {
    client.disconnect();
    client = null;
  }
}

/** Used by tests to drop process state between cases. */
export function resetDawBridgeSession(): void {
  retained = false;
  client = null;
}
