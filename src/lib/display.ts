import { useSyncExternalStore } from "react";

// User-adjustable visual-effects preference. Combines the OS "reduce motion"
// setting with an in-app override so people on low-end devices (or who just want
// max battery/perf) can turn the heavy canvas visuals down.

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

// ── Audio-reactive intensity (listener) ─────────────────────────────────────
// Off / Soft / VYBZ Max — amplitude + chroma for Orb and living background.
// Accessibility reduce-FX still forces scale 0.

const FX_KEY = "vybz.fxIntensity";
export type FxIntensity = "off" | "soft" | "max";

export function getFxIntensityPref(): FxIntensity {
  try {
    const raw = localStorage.getItem(FX_KEY);
    if (raw === "off" || raw === "soft" || raw === "max") return raw;
    // Migrate legacy Subtle / Full
    if (raw === "full") return "max";
    if (raw === "subtle") return "soft";
    // Default Max — first visit should feel elite, not muted
    return "max";
  } catch {
    return "max";
  }
}

/** One-shot: lift older Soft defaults to Max after the Orb quality pass. */
export function ensureEliteFxDefault() {
  try {
    if (localStorage.getItem("vybz.fxEliteV1")) return;
    const raw = localStorage.getItem(FX_KEY);
    if (raw === null || raw === "soft") localStorage.setItem(FX_KEY, "max");
    localStorage.setItem("vybz.fxEliteV1", "1");
    listeners.forEach((l) => l());
  } catch { /* ignore */ }
}

/** Amplitude scalar for reactive canvases (0 when reduced or Off). */
export function getFxScale(): number {
  if (getReduceFx()) return 0;
  switch (getFxIntensityPref()) {
    case "off": return 0;
    case "max": return 1.85;
    case "soft":
    default: return 0.95;
  }
}

/** 0..1 chroma/brightness lift for Orb palette remaster (not glow). */
export function getChromaBoost(): number {
  if (getReduceFx()) return 0;
  switch (getFxIntensityPref()) {
    case "off": return 0;
    case "max": return 1;
    case "soft":
    default: return 0.55;
  }
}

export function setFxIntensity(v: FxIntensity) {
  try { localStorage.setItem(FX_KEY, v); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Reactive intensity preference (for the settings toggle). */
export function useFxIntensity(): FxIntensity {
  return useSyncExternalStore(subscribe, getFxIntensityPref, getFxIntensityPref);
}

/** Reactive amplitude scalar used by Orb / DynamicBackground. */
export function useFxScale(): number {
  return useSyncExternalStore(subscribe, getFxScale, getFxScale);
}

export function useChromaBoost(): number {
  return useSyncExternalStore(subscribe, getChromaBoost, getChromaBoost);
}
