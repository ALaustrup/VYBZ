// ---------------------------------------------------------------------------
// AudioBus — the single, global audio engine for VYBZ (M9 / Law 5).
//
// HARD RULE: the play element always owns speaker output — dry HTMLAudioElement.
// We do NOT call createMediaElementSource or captureStream on it — both have
// muted Bunny/CDN playback in Chromium (especially after ambient blob wiring).
// We never attach BiquadFilter / DynamicsCompressor / OfflineAudioContext to the
// play path. Visualizers fall back to time-based motion (disclosed reactivity).
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from "react";
import type { PlaybackCustomization } from "@/lib/playbackCustomization";
import {
  resolveTrackSignal,
  type PlaybackSignal,
} from "@/lib/vdock/playbackSignal";

export type { PlaybackSignal } from "@/lib/vdock/playbackSignal";

export interface PlayerTrack {
  id: string;
  authorId?: string;
  artistUsername?: string;
  earnEligible?: boolean;
  url: string;
  title: string;
  artist: string;
  waveform?: number[];
  durationSec?: number;
  quality?: string;
  lossless?: boolean;
  seed?: number;
  accent?: string;
  fx?: string;
  playback?: PlaybackCustomization;
  /** M9 playback signal — ambient/simulation must disclose. */
  signal?: PlaybackSignal;
}

export interface PlayerSnapshot {
  track: PlayerTrack | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  loading: boolean;
  queueIndex: number;
  queueLength: number;
  lastError: number | null;
  /** Resolved from track.signal (or heuristics). Null when idle. */
  signal: PlaybackSignal | null;
}

const EMPTY: PlayerSnapshot = {
  track: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 0.9,
  muted: false,
  loading: false,
  queueIndex: -1,
  queueLength: 0,
  lastError: null,
  signal: null,
};

const VOL_KEY = "vybz.player.volume";

const listeners = new Set<() => void>();
let snapshot: PlayerSnapshot = { ...EMPTY, volume: loadVolume() };
let queue: PlayerTrack[] = [];
let audioEl: HTMLAudioElement | null = null;

function loadVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOL_KEY) ?? "");
    // A stuck 0 in localStorage presents as "all site audio is broken".
    if (!Number.isNaN(v) && v > 0) return Math.min(1, v);
  } catch {
    /* ignore */
  }
  return 0.9;
}

function emit() {
  listeners.forEach((l) => l());
}

function set(patch: Partial<PlayerSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  emit();
}

export function isPlayableMediaUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /^(https?:|blob:|data:)/i.test(url);
}

function ensureEngine(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.volume = snapshot.muted ? 0 : snapshot.volume;

    audioEl.addEventListener("timeupdate", () =>
      set({ currentTime: audioEl?.currentTime ?? 0 }),
    );
    audioEl.addEventListener("durationchange", () => {
      const d = audioEl?.duration;
      if (d && Number.isFinite(d)) set({ duration: d });
    });
    audioEl.addEventListener("loadedmetadata", () => {
      const d = audioEl?.duration;
      if (d && Number.isFinite(d)) set({ duration: d });
    });
    audioEl.addEventListener("playing", () =>
      set({ playing: true, loading: false, lastError: null }),
    );
    audioEl.addEventListener("play", () => set({ playing: true, lastError: null }));
    audioEl.addEventListener("pause", () => set({ playing: false }));
    audioEl.addEventListener("waiting", () => set({ loading: true }));
    audioEl.addEventListener("canplay", () => set({ loading: false }));
    audioEl.addEventListener("ended", () => next());
    audioEl.addEventListener("error", () => {
      set({ playing: false, loading: false, lastError: audioEl?.error?.code ?? 1 });
    });
  }
  return audioEl;
}

function armPlaybackUnlock(el: HTMLAudioElement) {
  const unlock = () => {
    void el.play().catch(() => undefined);
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

async function startPlayback(el: HTMLAudioElement) {
  // Apply volume every start — survives muted/zero edge cases after HMR.
  el.volume = snapshot.muted ? 0 : Math.max(0.05, snapshot.volume || 0.9);
  try {
    await el.play();
  } catch {
    set({ playing: false, loading: false });
    armPlaybackUnlock(el);
  }
}

/**
 * Fill a spectrum buffer without hijacking the play element (MediaElementSource
 * mutes Bunny/CDN output in Chromium). Prefer uploaded waveform peaks at the
 * playhead; otherwise synthesize from `readBands()` so Orb / dock stay reactive.
 */
export function readFrequencies(out: Uint8Array): boolean {
  if (!snapshot.playing || !out.length) return false;
  const peaks = snapshot.track?.waveform;
  const dur = snapshot.duration || snapshot.track?.durationSec || 0;
  const t = snapshot.currentTime;
  const n = out.length;

  if (peaks && peaks.length > 4 && dur > 0) {
    const pos = Math.min(0.999, Math.max(0, t / dur));
    const center = pos * (peaks.length - 1);
    for (let i = 0; i < n; i++) {
      const spread = (i / n) * 0.55;
      const idx = Math.min(peaks.length - 1, Math.max(0, Math.floor(center + (spread - 0.12) * peaks.length * 0.08)));
      const neighbor = peaks[Math.min(peaks.length - 1, idx + 1)] ?? peaks[idx];
      const frac = center - Math.floor(center);
      const amp = peaks[idx] * (1 - frac) + neighbor * frac;
      // Shape toward bass-left / high-right so bars feel spectral.
      const tilt = 0.55 + 0.45 * (1 - i / n);
      const wobble = 0.85 + 0.15 * Math.sin(t * 18 + i * 0.21);
      out[i] = Math.max(8, Math.min(255, Math.round(amp * 255 * tilt * wobble)));
    }
    return true;
  }

  const bands = readBands();
  for (let i = 0; i < n; i++) {
    const f = i / n;
    const env =
      f < 0.12 ? bands.bass :
      f < 0.45 ? bands.mid :
      bands.high;
    const pulse = 0.7 + 0.3 * Math.sin(t * (9 + f * 14) + i * 0.17);
    out[i] = Math.max(6, Math.min(255, Math.round(env * 255 * pulse)));
  }
  return true;
}

export function frequencyBinCount(): number {
  return 512;
}

export interface Bands { bass: number; mid: number; high: number; level: number }

export function readBands(): Bands {
  if (!snapshot.playing) return { bass: 0, mid: 0, high: 0, level: 0 };
  const peaks = snapshot.track?.waveform;
  const dur = snapshot.duration || snapshot.track?.durationSec || 0;
  const t = snapshot.currentTime;
  if (peaks && peaks.length > 4 && dur > 0) {
    const pos = Math.min(0.999, Math.max(0, t / dur));
    const i = Math.floor(pos * (peaks.length - 1));
    const window = 6;
    let sum = 0;
    let c = 0;
    for (let k = Math.max(0, i - window); k <= Math.min(peaks.length - 1, i + window); k++) {
      sum += peaks[k];
      c++;
    }
    const level = c ? sum / c : 0.2;
    const bass = Math.min(1, level * 1.15 + 0.08 * Math.sin(t * 6.2));
    const mid = Math.min(1, level * 0.95 + 0.1 * Math.sin(t * 9.4 + 1));
    const high = Math.min(1, level * 0.75 + 0.12 * Math.sin(t * 14.1 + 2));
    return { bass, mid, high, level: Math.min(1, (bass + mid + high) / 2.6) };
  }
  // Soft procedural pulse when no waveform peaks yet.
  const bass = 0.35 + 0.35 * Math.sin(t * 4.2);
  const mid = 0.25 + 0.3 * Math.sin(t * 7.1 + 1);
  const high = 0.15 + 0.25 * Math.sin(t * 11.3 + 2);
  const level = Math.min(1, (bass + mid + high) / 2.4);
  return { bass, mid, high, level };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): PlayerSnapshot {
  return snapshot;
}

export function enqueueTracks(tracks: PlayerTrack[], opts?: { playFirst?: boolean }) {
  if (!tracks.length) return;
  if (!ensureEngine()) return;
  const existing = new Set(queue.map((t) => t.id));
  const added = tracks.filter((t) => isPlayableMediaUrl(t.url) && !existing.has(t.id));
  if (!added.length) {
    if (opts?.playFirst !== false && isPlayableMediaUrl(tracks[0]?.url)) playTrack(tracks[0]);
    return;
  }
  const startIdx = queue.length;
  queue = [...queue, ...added];
  if (!snapshot.track) {
    loadQueue(queue, { autoplay: opts?.playFirst !== false });
    return;
  }
  set({ queueLength: queue.length });
  if (opts?.playFirst !== false) playTrack(queue[startIdx], queue);
}

export function loadQueue(
  list: PlayerTrack[],
  opts?: { startIndex?: number; autoplay?: boolean; loop?: boolean },
) {
  const el = ensureEngine();
  if (!el || !list.length) return;
  const playable = list.filter((t) => isPlayableMediaUrl(t.url));
  if (!playable.length) return;
  queue = playable;
  const index = Math.max(0, Math.min(opts?.startIndex ?? 0, playable.length - 1));
  const track = playable[index];
  el.loop = !!opts?.loop && playable.length === 1;
  set({
    track,
    loading: true,
    currentTime: 0,
    duration: track.durationSec ?? 0,
    queueIndex: index,
    queueLength: queue.length,
    playing: false,
    lastError: null,
    signal: resolveTrackSignal(track),
  });
  el.src = track.url;
  el.volume = snapshot.muted ? 0 : snapshot.volume;
  if (opts?.autoplay !== false) void startPlayback(el);
  else set({ loading: false });
}

export function playTrack(track: PlayerTrack, list?: PlayerTrack[]) {
  const el = ensureEngine();
  if (!el) return;
  if (!isPlayableMediaUrl(track.url)) {
    set({ playing: false, loading: false, lastError: 4 });
    return;
  }

  if (list && list.length) {
    queue = list.filter((t) => isPlayableMediaUrl(t.url));
    if (!queue.some((t) => t.id === track.id)) queue = [track, ...queue];
  } else if (!queue.some((t) => t.id === track.id)) {
    queue = [track];
  }
  const index = queue.findIndex((t) => t.id === track.id);
  el.loop = false;

  if (snapshot.track?.id === track.id && (el.currentSrc || el.src)) {
    void toggle();
    return;
  }

  set({
    track,
    loading: true,
    currentTime: 0,
    duration: track.durationSec ?? 0,
    queueIndex: index >= 0 ? index : 0,
    queueLength: queue.length,
    playing: false,
    lastError: null,
    signal: resolveTrackSignal(track),
  });
  el.src = track.url;
  el.volume = snapshot.muted ? 0 : snapshot.volume;
  void startPlayback(el);
}

export function patchCurrentTrack(patch: Partial<PlayerTrack>) {
  if (!snapshot.track) return;
  const track = { ...snapshot.track, ...patch };
  queue = queue.map((t) => (t.id === track.id ? { ...t, ...patch } : t));
  set({ track, signal: resolveTrackSignal(track) });
}

export async function toggle() {
  const el = ensureEngine();
  if (!el || !snapshot.track) return;
  if (el.paused) {
    if (!isPlayableMediaUrl(snapshot.track.url) && !(el.currentSrc || el.src)) return;
    await startPlayback(el);
  } else {
    el.pause();
  }
}

export function pause() {
  audioEl?.pause();
}

export function seek(seconds: number) {
  if (audioEl && Number.isFinite(seconds)) {
    audioEl.currentTime = Math.max(0, seconds);
    set({ currentTime: audioEl.currentTime });
  }
}

export function seekFraction(frac: number) {
  const dur = snapshot.duration || snapshot.track?.durationSec || 0;
  if (dur > 0) seek(frac * dur);
}

export function next() {
  if (queue.length && snapshot.queueIndex >= 0 && snapshot.queueIndex < queue.length - 1) {
    playTrack(queue[snapshot.queueIndex + 1]);
  } else {
    if (audioEl) audioEl.pause();
    set({ playing: false, currentTime: snapshot.duration });
  }
}

export function prev() {
  if (snapshot.currentTime > 3 || snapshot.queueIndex <= 0) {
    seek(0);
    return;
  }
  playTrack(queue[snapshot.queueIndex - 1]);
}

export function setVolume(v: number) {
  const vol = Math.min(1, Math.max(0, v));
  const muted = vol === 0;
  if (audioEl) audioEl.volume = vol;
  try {
    localStorage.setItem(VOL_KEY, String(vol));
  } catch {
    /* ignore */
  }
  set({ volume: vol, muted });
}

export function toggleMute() {
  const muted = !snapshot.muted;
  if (audioEl) audioEl.volume = muted ? 0 : snapshot.volume;
  set({ muted });
}

export function stop() {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
  }
  queue = [];
  set({ ...EMPTY, volume: snapshot.volume });
}

export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Dock / chrome subscription — stable across `currentTime` ticks so transport
 * chrome does not re-render on every `timeupdate`. Progress bars should read
 * the clock via RAF + `getSnapshot()` instead.
 */
export type PlayerShellSnapshot = Omit<PlayerSnapshot, "currentTime">;

let shellCache: PlayerShellSnapshot | null = null;

function getShellSnapshot(): PlayerShellSnapshot {
  const s = snapshot;
  if (
    shellCache &&
    shellCache.track === s.track &&
    shellCache.playing === s.playing &&
    shellCache.duration === s.duration &&
    shellCache.volume === s.volume &&
    shellCache.muted === s.muted &&
    shellCache.loading === s.loading &&
    shellCache.queueIndex === s.queueIndex &&
    shellCache.queueLength === s.queueLength &&
    shellCache.lastError === s.lastError &&
    shellCache.signal === s.signal
  ) {
    return shellCache;
  }
  shellCache = {
    track: s.track,
    playing: s.playing,
    duration: s.duration,
    volume: s.volume,
    muted: s.muted,
    loading: s.loading,
    queueIndex: s.queueIndex,
    queueLength: s.queueLength,
    lastError: s.lastError,
    signal: s.signal,
  };
  return shellCache;
}

export function usePlayerShell(): PlayerShellSnapshot {
  return useSyncExternalStore(subscribe, getShellSnapshot, getShellSnapshot);
}

/** Instant clock read for ref-driven progress (no React subscription). */
export function getPlaybackProgress(): { currentTime: number; duration: number; fraction: number } {
  const dur = snapshot.duration || snapshot.track?.durationSec || 0;
  const t = audioEl?.currentTime ?? snapshot.currentTime;
  return {
    currentTime: t,
    duration: dur,
    fraction: dur > 0 ? Math.max(0, Math.min(1, t / dur)) : 0,
  };
}
