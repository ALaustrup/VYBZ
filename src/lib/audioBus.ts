// ---------------------------------------------------------------------------
// AudioBus — the single, global audio engine for VYBZ (§6.5 architecture).
//
// Every audio surface on the platform (feed track cards, the global player, the
// profile hero, later live/rehearsal rooms) routes through ONE shared engine so
// that:
//   1. Only one track ever plays at a time (tapping play on card B pauses A).
//   2. There is exactly one AudioContext → AnalyserNode chain, so any component
//      can read live frequency data for audio-reactive visuals (the seeded track
//      visualizers here, and the platform-wide border FX in Phase 4) without
//      each spinning up its own context.
//   3. Playback uses the ORIGINAL file through an <audio> element, so the
//      browser decodes at full fidelity — we never downsample or re-encode. The
//      quality badge is derived from the source container (§8.4).
//
// Framework-agnostic singleton exposed to React via `usePlayer()`
// (useSyncExternalStore), mirroring lib/sound.ts.
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from "react";

export interface PlayerTrack {
  /** Stable id (the drop/asset id) — used to reconcile "is this one playing?". */
  id: string;
  /** Directly-playable source URL (object/data/signed URL). */
  url: string;
  title: string;
  artist: string;
  /** Precomputed peaks for the scrubber (0..1). */
  waveform?: number[];
  durationSec?: number;
  /** Quality label for the HD badge (e.g. "WAV · 48 kHz · Lossless"). */
  quality?: string;
  lossless?: boolean;
  /** Deterministic seed for the now-playing visualizer. */
  seed?: number;
  /** Curated accent hex for the player chrome. */
  accent?: string;
}

export interface PlayerSnapshot {
  track: PlayerTrack | null;
  playing: boolean;
  /** Seconds into the current track. */
  currentTime: number;
  /** Seconds total (from metadata; falls back to track.durationSec). */
  duration: number;
  /** 0..1 master volume. */
  volume: number;
  muted: boolean;
  /** True while the source is loading/seeking. */
  loading: boolean;
  /** Queue length + position (for prev/next affordances). */
  queueIndex: number;
  queueLength: number;
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
};

const VOL_KEY = "vybz.player.volume";

const listeners = new Set<() => void>();
let snapshot: PlayerSnapshot = { ...EMPTY, volume: loadVolume() };
let queue: PlayerTrack[] = [];

let audioEl: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let gain: GainNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let wired = false;

function loadVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOL_KEY) ?? "");
    if (!Number.isNaN(v)) return Math.min(1, Math.max(0, v));
  } catch {
    /* ignore */
  }
  return 0.9;
}

function emit() {
  listeners.forEach((l) => l());
}

/** Immutably replace the snapshot (so useSyncExternalStore re-renders). */
function set(patch: Partial<PlayerSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  emit();
}

function ensureEngine(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "metadata";
    // Allow the analyser to read remote (signed) media without tainting.
    audioEl.crossOrigin = "anonymous";
    audioEl.volume = snapshot.muted ? 0 : snapshot.volume;

    audioEl.addEventListener("timeupdate", () =>
      set({ currentTime: audioEl?.currentTime ?? 0 })
    );
    audioEl.addEventListener("durationchange", () => {
      const d = audioEl?.duration;
      if (d && Number.isFinite(d)) set({ duration: d });
    });
    audioEl.addEventListener("loadedmetadata", () => {
      const d = audioEl?.duration;
      if (d && Number.isFinite(d)) set({ duration: d });
    });
    audioEl.addEventListener("playing", () => set({ playing: true, loading: false }));
    audioEl.addEventListener("play", () => set({ playing: true }));
    audioEl.addEventListener("pause", () => set({ playing: false }));
    audioEl.addEventListener("waiting", () => set({ loading: true }));
    audioEl.addEventListener("canplay", () => set({ loading: false }));
    audioEl.addEventListener("ended", () => next());
  }
  return audioEl;
}

/**
 * Lazily build the Web Audio graph on the first real playback (a user gesture),
 * as browsers require. Once wired, the same analyser powers every visualizer.
 */
function ensureGraph() {
  if (wired || !audioEl) return;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return;
  try {
    ctx = new AC({ latencyHint: "playback" });
    sourceNode = ctx.createMediaElementSource(audioEl);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;
    gain = ctx.createGain();
    gain.gain.value = snapshot.muted ? 0 : snapshot.volume;
    sourceNode.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);
    wired = true;
  } catch {
    // If the graph can't be built (e.g. tainted cross-origin), fall back to the
    // element's own output so playback still works — visuals just stay idle.
    wired = true;
  }
}

/** Read live frequency magnitudes (0..255) for audio-reactive visuals. */
export function readFrequencies(out: Uint8Array): boolean {
  if (!analyser) return false;
  // Cast bridges the DOM lib's `Uint8Array<ArrayBuffer>` param generic.
  analyser.getByteFrequencyData(out as unknown as Uint8Array<ArrayBuffer>);
  return true;
}

/** FFT bin count for allocating a frequency buffer. */
export function frequencyBinCount(): number {
  return analyser?.frequencyBinCount ?? 512;
}

const _bandBuf = new Uint8Array(1024);
export interface Bands { bass: number; mid: number; high: number; level: number }
/**
 * Live, normalized (0..1) energy split into bass/mid/high plus an overall level.
 * The single source of truth for all audio-reactive visuals (track visualizers +
 * the platform-wide reactive frame), so everything pulses to the same signal.
 */
export function readBands(): Bands {
  if (!analyser) return { bass: 0, mid: 0, high: 0, level: 0 };
  const n = analyser.frequencyBinCount;
  analyser.getByteFrequencyData(_bandBuf as unknown as Uint8Array<ArrayBuffer>);
  const avg = (lo: number, hi: number) => {
    let s = 0, c = 0;
    for (let i = Math.floor(lo * n); i < Math.floor(hi * n) && i < n; i++) { s += _bandBuf[i]; c++; }
    return c ? s / (c * 255) : 0;
  };
  const bass = avg(0, 0.08), mid = avg(0.08, 0.35), high = avg(0.35, 0.8);
  const level = Math.min(1, (bass * 1.3 + mid + high * 0.7) / 3);
  return { bass, mid, high, level };
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): PlayerSnapshot {
  return snapshot;
}

/** Play a track (optionally as part of a queue). Toggles pause if it's current. */
export function playTrack(track: PlayerTrack, list?: PlayerTrack[]) {
  const el = ensureEngine();
  if (!el) return;

  if (list && list.length) {
    queue = list;
  } else if (!queue.some((t) => t.id === track.id)) {
    queue = [track];
  }
  const index = queue.findIndex((t) => t.id === track.id);

  // Same track already loaded → just toggle.
  if (snapshot.track?.id === track.id && el.src) {
    void toggle();
    return;
  }

  set({
    track,
    loading: true,
    currentTime: 0,
    duration: track.durationSec ?? 0,
    queueIndex: index,
    queueLength: queue.length,
  });
  el.src = track.url;
  el.volume = snapshot.muted ? 0 : snapshot.volume;
  ensureGraph();
  void ctx?.resume();
  void el.play().catch(() => set({ playing: false, loading: false }));
}

export async function toggle() {
  const el = ensureEngine();
  if (!el || !snapshot.track) return;
  if (el.paused) {
    ensureGraph();
    await ctx?.resume();
    await el.play().catch(() => set({ playing: false }));
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

/** Seek by fraction 0..1 of the current duration (waveform clicks). */
export function seekFraction(frac: number) {
  const dur = snapshot.duration || snapshot.track?.durationSec || 0;
  if (dur > 0) seek(frac * dur);
}

export function next() {
  if (queue.length && snapshot.queueIndex >= 0 && snapshot.queueIndex < queue.length - 1) {
    playTrack(queue[snapshot.queueIndex + 1]);
  } else {
    // End of queue: stop cleanly.
    if (audioEl) audioEl.pause();
    set({ playing: false, currentTime: snapshot.duration });
  }
}

export function prev() {
  // Restart if we're >3s in; otherwise step back.
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
  if (gain) gain.gain.value = vol;
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
  if (gain) gain.gain.value = muted ? 0 : snapshot.volume;
  set({ muted });
}

/** Stop and clear the player (e.g. when the source is removed). */
export function stop() {
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
  }
  queue = [];
  set({ ...EMPTY, volume: snapshot.volume });
}

/** Reactive React hook for the whole player state. */
export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
