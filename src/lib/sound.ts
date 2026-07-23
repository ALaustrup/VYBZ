import { useSyncExternalStore } from "react";
import { SOUND_MANIFEST, type SoundName } from "./soundManifest";

/**
 * Lightweight Web Audio one-shot player for platform + game sound.
 *
 * - Lazily creates a single AudioContext on the first user gesture (browsers
 *   require a gesture before audio can start).
 * - Fetches + decodes each clip once and caches the AudioBuffer; misses are
 *   remembered so absent files never spam the network or throw.
 * - Master enable + volume persist in localStorage and are reactive via
 *   `useSoundSettings()`.
 */

const LS_KEY = "vybz.sound";

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0..1
}

function loadSettings(): SoundSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      return {
        enabled: raw.enabled ?? true,
        volume: typeof raw.volume === "number" ? clamp01(raw.volume) : 0.7,
      };
    }
  } catch {
    /* fall through to defaults */
  }
  return { enabled: true, volume: 0.7 };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

let settings: SoundSettings = loadSettings();
let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer | null>();
const inflight = new Map<SoundName, Promise<AudioBuffer | null>>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota/availability errors */
  }
  notify();
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

async function getBuffer(name: SoundName): Promise<AudioBuffer | null> {
  if (buffers.has(name)) return buffers.get(name) ?? null;
  if (inflight.has(name)) return inflight.get(name)!;
  const url = SOUND_MANIFEST[name];
  const ac = ensureCtx();
  if (!url || !ac) return null;

  const task = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`sound ${name}: ${res.status}`);
      const arr = await res.arrayBuffer();
      const buf = await ac.decodeAudioData(arr);
      buffers.set(name, buf);
      return buf;
    } catch {
      buffers.set(name, null); // remember the miss; never refetch
      return null;
    } finally {
      inflight.delete(name);
    }
  })();
  inflight.set(name, task);
  return task;
}

/** Play a one-shot. Safe to call anywhere; no-ops when muted or unavailable. */
export function playSound(
  name: SoundName,
  opts: { volume?: number; rate?: number } = {}
): void {
  if (!settings.enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  void getBuffer(name).then((buf) => {
    if (!buf || !settings.enabled || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (opts.rate) src.playbackRate.value = opts.rate;
    const gain = ctx.createGain();
    gain.gain.value = settings.volume * (opts.volume ?? 1);
    src.connect(gain).connect(ctx.destination);
    src.start();
  });
}

/** Unlock audio on the first user gesture (call once from a global listener). */
export function primeAudio(): void {
  ensureCtx();
}

export function getSoundSettings(): SoundSettings {
  return settings;
}

export function setSoundEnabled(enabled: boolean): void {
  settings = { ...settings, enabled };
  if (enabled) ensureCtx();
  persist();
}

export function setSoundVolume(volume: number): void {
  settings = { ...settings, volume: clamp01(volume) };
  persist();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive hook for settings UI. */
export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribe, getSoundSettings, getSoundSettings);
}
