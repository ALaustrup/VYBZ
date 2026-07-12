import { useSyncExternalStore } from "react";

// User-adjustable visual-effects preference. Combines the OS "reduce motion"
// setting with an in-app override so people on low-end devices (or who just want
// max battery/perf) can turn the heavy canvas visuals down. Read by the living
// background, the reactive frame, and the track visualizers.

const KEY = "vybz.reduceFx";
const listeners = new Set<() => void>();

function osReduced(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** The in-app override, or null when unset (fall back to the OS setting). */
export function getReduceFxOverride(): boolean | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : v === "1";
  } catch {
    return null;
  }
}

/** Effective value: explicit override wins, else the OS preference. */
export function getReduceFx(): boolean {
  const o = getReduceFxOverride();
  return o === null ? osReduced() : o;
}

export function setReduceFx(v: boolean | null) {
  try {
    if (v === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v ? "1" : "0");
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : undefined;
  mq?.addEventListener?.("change", cb);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener?.("change", cb);
  };
}

/** Reactive effective "reduce effects" flag. */
export function useReduceFx(): boolean {
  return useSyncExternalStore(subscribe, getReduceFx, getReduceFx);
}

/** Reactive override state (for the settings toggle: true/false/null=auto). */
export function useReduceFxOverride(): boolean | null {
  return useSyncExternalStore(subscribe, getReduceFxOverride, getReduceFxOverride);
}
