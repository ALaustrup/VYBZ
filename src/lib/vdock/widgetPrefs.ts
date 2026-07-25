/** Shared V-Dock widget preferences + lightweight runtime state (local). */

import { useSyncExternalStore } from "react";

export type ShareLicense = "collab-only" | "credit-required" | "free";

export interface WidgetPrefs {
  bpm: number;
  keyRoot: string;
  keyMode: "major" | "minor";
  ideaScratch: string;
  clipboardStem: { title: string; bpm?: number; key?: string; license?: string; at: number } | null;
  license: ShareLicense;
  sceneTag: string;
  monitorCue: boolean;
  nightCraft: boolean;
  bridge: { watching: boolean; path: string; lastSync: number | null; conflict: boolean };
  handoffReady: boolean;
  watermarkAt: number | null;
  sessionSeconds: number;
  sessionRunning: boolean;
  earBreakSeconds: number;
  earBreakRunning: boolean;
  levelHot: boolean;
  listenHosting: boolean;
  voiceSlots: { green: string | null; yellow: string | null; pink: string | null };
  tipPulse: number;
  listingViews: number;
  openToWorkLocal: boolean | null;
}

const KEY = "vybz.vdockWidgetPrefs";
const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

const DEFAULT: WidgetPrefs = {
  bpm: 120,
  keyRoot: "A",
  keyMode: "minor",
  ideaScratch: "",
  clipboardStem: null,
  license: "credit-required",
  sceneTag: "",
  monitorCue: false,
  nightCraft: false,
  bridge: { watching: false, path: "", lastSync: null, conflict: false },
  handoffReady: false,
  watermarkAt: null,
  sessionSeconds: 0,
  sessionRunning: false,
  earBreakSeconds: 50 * 60,
  earBreakRunning: false,
  levelHot: false,
  listenHosting: false,
  voiceSlots: { green: null, yellow: null, pink: null },
  tipPulse: 0,
  listingViews: 0,
  openToWorkLocal: null,
};

const listeners = new Set<() => void>();
let cached: WidgetPrefs = { ...DEFAULT, bridge: { ...DEFAULT.bridge }, voiceSlots: { ...DEFAULT.voiceSlots } };
let ready = false;

function load(): WidgetPrefs {
  if (ready) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cached = { ...DEFAULT, ...JSON.parse(raw), bridge: { ...DEFAULT.bridge, ...(JSON.parse(raw).bridge ?? {}) }, voiceSlots: { ...DEFAULT.voiceSlots, ...(JSON.parse(raw).voiceSlots ?? {}) } };
  } catch { /* ignore */ }
  ready = true;
  return cached;
}

function save(next: WidgetPrefs) {
  cached = next;
  ready = true;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function getWidgetPrefs(): WidgetPrefs {
  return load();
}

export function patchWidgetPrefs(patch: Partial<WidgetPrefs>) {
  save({ ...load(), ...patch });
}

export function useWidgetPrefs(): WidgetPrefs {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getWidgetPrefs,
    getWidgetPrefs,
  );
}

export { KEYS as KEY_ROOTS };

// ── Metronome engine (singleton) ─────────────────────────────────────────────

let metroCtx: AudioContext | null = null;
let metroTimer: number | null = null;
let metroOn = false;
const metroListeners = new Set<() => void>();

export function isMetronomeOn(): boolean {
  return metroOn;
}

export function useMetronomeOn(): boolean {
  return useSyncExternalStore(
    (cb) => { metroListeners.add(cb); return () => { metroListeners.delete(cb); }; },
    isMetronomeOn,
    () => false,
  );
}

function click(ctx: AudioContext, accent: boolean) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.value = accent ? 1200 : 800;
  g.gain.value = accent ? 0.08 : 0.045;
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.stop(t + 0.06);
}

export function setMetronome(on: boolean) {
  if (on === metroOn) return;
  metroOn = on;
  if (metroTimer != null) {
    window.clearInterval(metroTimer);
    metroTimer = null;
  }
  if (!on) {
    metroListeners.forEach((l) => l());
    return;
  }
  void (async () => {
    metroCtx ??= new AudioContext();
    if (metroCtx.state === "suspended") await metroCtx.resume();
    let beat = 0;
    const tick = () => {
      if (!metroCtx || !metroOn) return;
      click(metroCtx, beat % 4 === 0);
      beat++;
    };
    tick();
    const bpm = getWidgetPrefs().bpm;
    metroTimer = window.setInterval(tick, Math.max(200, 60000 / bpm));
    metroListeners.forEach((l) => l());
  })();
}

export function retuneMetronome() {
  if (!metroOn) return;
  setMetronome(false);
  setMetronome(true);
}

/** Short A440 (or custom Hz) beep. */
export function playRefTone(hz = 440, ms = 900) {
  void (async () => {
    const ctx = metroCtx ?? new AudioContext();
    metroCtx = ctx;
    if (ctx.state === "suspended") await ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = hz;
    g.gain.value = 0.12;
    o.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime;
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.stop(t + ms / 1000 + 0.02);
  })();
}
