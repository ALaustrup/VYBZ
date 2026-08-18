/**
 * Listener-picked Vizualz film for the dock (and expanded player).
 * Separate from the meter mode (bars / wave / pulse). Empty string = meter only.
 */
import { vdockVisual } from "@/lib/vdockVisualManifest";
import { DEFAULT_VDOCK_VISUAL_ID } from "@/lib/vdockVisualResolve";

const KEY = "vybz.vdock.visualId";
const NONE = "";

let visualId: string = readStored();
const listeners = new Set<() => void>();

function readStored(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v === NONE) return NONE;
    if (v && vdockVisual(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_VDOCK_VISUAL_ID;
}

export function getVdockVisualId(): string {
  return visualId;
}

export function setVdockVisualId(next: string | null) {
  const resolved = next && vdockVisual(next) ? next : NONE;
  if (visualId === resolved) return;
  visualId = resolved;
  try {
    localStorage.setItem(KEY, resolved);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeVdockVisualId(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
