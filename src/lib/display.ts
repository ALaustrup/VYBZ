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

// ── Audio-reactive intensity ────────────────────────────────────────────────
// Independent of reduce-motion: even with effects on, creators can keep the
// reactive frame + living background *subtle* (the default) or turn them Full.
// A single 0..1 scalar the reactive canvases multiply their amplitude by.

const FX_KEY = "vybz.fxIntensity";
export type FxIntensity = "subtle" | "full";

export function getFxIntensityPref(): FxIntensity {
  try {
    return localStorage.getItem(FX_KEY) === "full" ? "full" : "subtle";
  } catch {
    return "subtle";
  }
}

/** Amplitude scalar for the reactive canvases (0 when effects are reduced). */
export function getFxScale(): number {
  if (getReduceFx()) return 0;
  return getFxIntensityPref() === "full" ? 1 : 0.6;
}

export function setFxIntensity(v: FxIntensity) {
  try { localStorage.setItem(FX_KEY, v); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Reactive intensity preference (for the settings toggle). */
export function useFxIntensity(): FxIntensity {
  return useSyncExternalStore(subscribe, getFxIntensityPref, getFxIntensityPref);
}

/** Reactive amplitude scalar used by ReactiveFrame / DynamicBackground. */
export function useFxScale(): number {
  return useSyncExternalStore(subscribe, getFxScale, getFxScale);
}
