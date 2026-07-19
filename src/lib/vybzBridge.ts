/**
 * VYBZ Bridge companion protocol (K/H5 MVP).
 * Localhost WebSocket at 127.0.0.1:17355 — optional native/Node companion.
 * Messages: { type: "hello" | "midi" | "file" | "pong", ... }
 */

export const BRIDGE_DEFAULT_URL = "ws://127.0.0.1:17355";

export type BridgeMsg =
  | { type: "hello"; client: "vybz-web"; version: number }
  | { type: "pong"; ok: boolean }
  | { type: "midi"; notes: { midi: number; time: number; duration: number; velocity: number }[]; title?: string }
  | { type: "file"; name: string; mime?: string; size?: number };

let socket: WebSocket | null = null;
let present = false;
const listeners = new Set<(ok: boolean) => void>();

function notify() {
  for (const l of listeners) l(present);
}

export function onBridgePresence(cb: (ok: boolean) => void): () => void {
  listeners.add(cb);
  cb(present);
  return () => { listeners.delete(cb); };
}

export function isBridgePresent(): boolean {
  return present;
}

/** Probe / keep a lightweight connection to the companion. */
export function connectBridge(url = BRIDGE_DEFAULT_URL): void {
  if (typeof window === "undefined") return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  try {
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => {
      present = true;
      notify();
      sendBridge({ type: "hello", client: "vybz-web", version: 1 });
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as BridgeMsg;
        if (msg.type === "pong") {
          present = !!msg.ok;
          notify();
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => {
      present = false;
      socket = null;
      notify();
    };
    ws.onerror = () => {
      try { ws.close(); } catch { /* ignore */ }
    };
  } catch {
    present = false;
    notify();
  }
}

export function disconnectBridge() {
  try { socket?.close(); } catch { /* ignore */ }
  socket = null;
  present = false;
  notify();
}

export function sendBridge(msg: BridgeMsg): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(msg));
  return true;
}

/** Stream MIDI notes to the companion (and optionally keep Web MIDI path separate). */
export function sendMidiToBridge(
  notes: { midi: number; time: number; duration: number; velocity: number }[],
  title?: string,
): boolean {
  connectBridge();
  return sendBridge({ type: "midi", notes, title });
}
