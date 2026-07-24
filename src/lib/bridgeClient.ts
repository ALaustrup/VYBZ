/**
 * Thin client for VYBZ Bridge (localhost folder watch).
 * No-op when Bridge is not running.
 */

export type BridgeMessage = {
  type: string;
  path?: string;
  projectId?: string | null;
  message?: string;
  at?: number;
  error?: string;
  [key: string]: unknown;
};

const DEFAULT_URL = "ws://127.0.0.1:17355";

export function connectBridge(opts?: {
  url?: string;
  onMessage?: (msg: BridgeMessage) => void;
  onClose?: () => void;
}): { ws: WebSocket | null; send: (msg: object) => void; close: () => void } {
  if (typeof WebSocket === "undefined") {
    return { ws: null, send: () => {}, close: () => {} };
  }
  let ws: WebSocket | null = null;
  try {
    ws = new WebSocket(opts?.url ?? DEFAULT_URL);
  } catch {
    return { ws: null, send: () => {}, close: () => {} };
  }

  ws.addEventListener("open", () => {
    ws?.send(JSON.stringify({ type: "hello", client: "vybz-web", version: "0.2.0" }));
  });
  ws.addEventListener("message", (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as BridgeMessage;
      opts?.onMessage?.(msg);
    } catch { /* ignore */ }
  });
  ws.addEventListener("close", () => opts?.onClose?.());
  ws.addEventListener("error", () => { /* Bridge offline is fine */ });

  return {
    ws,
    send: (msg) => {
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    },
    close: () => ws?.close(),
  };
}

/** Ask Bridge to watch a local absolute path linked to a repo. */
export function watchRepoFolder(
  send: (msg: object) => void,
  path: string,
  projectId: string,
  autoCommit = true,
) {
  send({
    type: "watch",
    path,
    projectId,
    autoCommit,
    debounceMs: 2500,
  });
}
