/**
 * Shared reactive visual contract — one analyser → bands / onset / beat /
 * centroid for Orb, drop banners, Live tiles (avoids divergent visualizers).
 *
 * Music-led defaults; any creative drop’s audio still drives the same frame.
 */

import { frequencyBinCount, readBands, readFrequencies } from "@/lib/audioBus";

export interface ReactiveVisualFrame {
  /** Normalized 0..1 band energies */
  bass: number;
  mid: number;
  high: number;
  /** Lowest bins — kick / rumble */
  sub: number;
  /** Upper-mid “bite” */
  presence: number;
  /** Overall loudness proxy */
  level: number;
  /** Spectral brightness 0..1 */
  centroid: number;
  /** Spectral flux (change) 0..1 */
  flux: number;
  /** Transient impulse 0..1 (decays quickly) */
  onset: number;
  /** Soft beat envelope 0..1 (holds a touch longer than onset) */
  beat: number;
  /** Fresh FFT magnitudes 0..255 — length = frequencyBinCount() */
  spectrum: Uint8Array;
}

/** Extended contract for Orb / DropStage / Live tiles (same analyser, shared look). */
export interface ReactiveRenderContext {
  frame: ReactiveVisualFrame;
  seed: number;
  palette: string[];
  /** 0 sphere · 1 blob · 2 bars · 3 ring · 4 liquid */
  morphId: number;
  fxScale: number;
  liveBlend: number;
}

const EMPTY: Omit<ReactiveVisualFrame, "spectrum"> = {
  bass: 0,
  mid: 0,
  high: 0,
  sub: 0,
  presence: 0,
  level: 0,
  centroid: 0,
  flux: 0,
  onset: 0,
  beat: 0,
};

let spectrum = new Uint8Array(512);
let prevNorm: Float32Array | null = null;
let onsetEnv = 0;
let beatEnv = 0;
let bassEma = 0;
let levelEma = 0;
/** Same-rAF cache so Orb + joystick don't double-step envelopes. */
let cacheAt = -1;
let cacheActive = false;
let cacheFrame: ReactiveVisualFrame | null = null;

function ensureBuffers() {
  const n = frequencyBinCount();
  if (spectrum.length !== n) {
    spectrum = new Uint8Array(n);
    prevNorm = null;
  }
}

/**
 * Sample the live analyser into a ReactiveVisualFrame.
 * Safe to call from multiple consumers in one frame — envelopes advance once.
 */
export function sampleReactiveFrame(active: boolean): ReactiveVisualFrame {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (cacheFrame && cacheActive === active && now - cacheAt < 14) {
    return cacheFrame;
  }

  ensureBuffers();
  if (!active) {
    onsetEnv *= 0.85;
    beatEnv *= 0.9;
    bassEma *= 0.92;
    levelEma *= 0.92;
    spectrum.fill(0);
    const idle = { ...EMPTY, onset: onsetEnv, beat: beatEnv, spectrum };
    cacheAt = now;
    cacheActive = false;
    cacheFrame = idle;
    return idle;
  }

  const ok = readFrequencies(spectrum);
  if (!ok) {
    // Keep envelopes alive from band proxy (never freeze Orb / stage on miss).
    const bands = readBands();
    const n = spectrum.length;
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const env = f < 0.12 ? bands.bass : f < 0.45 ? bands.mid : bands.high;
      spectrum[i] = Math.round(env * 220);
    }
    if (bands.level <= 0.001) {
      const miss = { ...EMPTY, spectrum };
      cacheAt = now;
      cacheActive = true;
      cacheFrame = miss;
      return miss;
    }
  }

  const n = spectrum.length;
  const avg = (lo: number, hi: number) => {
    let s = 0;
    let c = 0;
    const a = Math.floor(lo * n);
    const b = Math.min(n, Math.floor(hi * n));
    for (let i = a; i < b; i++) {
      s += spectrum[i];
      c++;
    }
    return c ? s / (c * 255) : 0;
  };

  const sub = avg(0, 0.035);
  const bass = avg(0, 0.09);
  const mid = avg(0.09, 0.38);
  const presence = avg(0.38, 0.62);
  const high = avg(0.55, 0.92);
  const level = Math.min(1, sub * 0.9 + bass * 1.15 + mid * 0.95 + presence * 0.7 + high * 0.55) / 3.2;

  // Spectral centroid (brightness)
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const v = spectrum[i];
    weighted += v * i;
    total += v;
  }
  const centroid = total > 1e-3 ? Math.min(1, (weighted / total) / (n * 0.72)) : 0;

  // Normalize + spectral flux (onset proxy)
  if (!prevNorm || prevNorm.length !== n) prevNorm = new Float32Array(n);
  let flux = 0;
  for (let i = 0; i < n; i++) {
    const cur = spectrum[i] / 255;
    const d = cur - prevNorm[i];
    if (d > 0) flux += d;
    prevNorm[i] = cur;
  }
  flux = Math.min(1, flux / (n * 0.085));

  bassEma += (bass - bassEma) * 0.12;
  levelEma += (level - levelEma) * 0.1;
  const bassKick = Math.max(0, bass - bassEma * 1.12);
  const levelKick = Math.max(0, level - levelEma * 1.08);
  const rawOnset = Math.min(1, flux * 1.35 + bassKick * 1.8 + levelKick * 1.1);
  onsetEnv = Math.max(onsetEnv * 0.72, rawOnset);
  // Beat holds a little longer so the Orb “hits” read clearly
  beatEnv = Math.max(beatEnv * 0.88, rawOnset * (0.55 + bass * 0.55));

  const frame: ReactiveVisualFrame = {
    bass,
    mid,
    high,
    sub,
    presence,
    level: Math.min(1, level),
    centroid,
    flux,
    onset: Math.min(1, onsetEnv),
    beat: Math.min(1, beatEnv),
    spectrum,
  };
  cacheAt = now;
  cacheActive = true;
  cacheFrame = frame;
  return frame;
}

/** Convenience: idle / inactive frame without mutating beat state aggressively. */
export function idleReactiveFrame(): ReactiveVisualFrame {
  ensureBuffers();
  spectrum.fill(0);
  return { ...EMPTY, spectrum };
}
