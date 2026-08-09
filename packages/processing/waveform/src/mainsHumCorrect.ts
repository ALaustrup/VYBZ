/**
 * M6 / OR-026 — reversible mains-hum reduce (narrow peaking cuts at f + harmonics).
 * Law 1: frequency from measureMainsHum (or explicit 50/60). Not a creative EQ.
 * Non-destructive: caller keeps the original buffer.
 */

import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";
import { measureMainsHum, type MainsHumResult } from "./mainsHum";
import { computeSpectrum } from "./fft";

export const MAINS_HUM_CORRECT_VERSION = "m6.mains-hum.1";

export type MainsHumCorrectResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  frequencyHz: 50 | 60;
  /** Absolute bin power ratio after/before at fundamental (linear). */
  binPowerRatio: number | null;
  prominenceDbBefore: number | null;
  prominenceDbAfter: number | null;
  harmonicsNotched: number;
  correctionVersion: typeof MAINS_HUM_CORRECT_VERSION;
  measured: MainsHumResult | null;
};

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

/** Peaking EQ (Audio EQ Cookbook) — negative gainDb cuts. */
function peakingCoeffs(sampleRate: number, freqHz: number, q: number, gainDb: number): Biquad | null {
  if (freqHz <= 0 || freqHz >= sampleRate * 0.45) return null;
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freqHz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.max(0.5, q));
  const b0 = 1 + alpha * A;
  const b1 = -2 * cos;
  const b2 = 1 - alpha * A;
  const a0 = 1 + alpha / A;
  const a1 = -2 * cos;
  const a2 = 1 - alpha / A;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function applyBiquad(input: Float32Array, c: Biquad): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i]!;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

function downmix(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]!;
  const n = channels[0]?.length ?? 0;
  const out = new Float32Array(n);
  const inv = 1 / channels.length;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const ch of channels) s += ch[i] ?? 0;
    out[i] = s * inv;
  }
  return out;
}

function binPowerAtHz(samples: Float32Array, sampleRate: number, hz: number): number | null {
  if (samples.length < 2048) return null;
  const fftSize = samples.length >= 8192 ? 8192 : 4096;
  const { magnitudes, fftSize: size } = computeSpectrum(samples, fftSize);
  const bin = Math.round(hz / (sampleRate / size));
  if (bin < 1 || bin >= magnitudes.length) return null;
  const m = magnitudes[bin] ?? 0;
  return m * m;
}

/**
 * Apply narrow peaking cuts at measured (or forced) mains fundamental + 2f/3f.
 */
export function applyMainsHumReduce(
  channels: Float32Array[],
  sampleRate: number,
  opts?: { frequencyHz?: 50 | 60 },
): MainsHumCorrectResult {
  const before = snapshotLevels(channels);
  const mono = downmix(channels);
  const measured = measureMainsHum(mono, sampleRate);
  const frequencyHz: 50 | 60 = opts?.frequencyHz ?? measured?.frequencyHz ?? 60;
  const prominenceDbBefore =
    measured?.frequencyHz === frequencyHz ? measured.prominenceDb : measured?.prominenceDb ?? null;

  const targets: { hz: number; q: number; gainDb: number }[] = [
    { hz: frequencyHz, q: 18, gainDb: -24 },
    { hz: frequencyHz * 2, q: 22, gainDb: -14 },
    { hz: frequencyHz * 3, q: 26, gainDb: -10 },
  ];
  const coeffs: Biquad[] = [];
  for (const t of targets) {
    const c = peakingCoeffs(sampleRate, t.hz, t.q, t.gainDb);
    if (c) coeffs.push(c);
  }

  const powerBefore = binPowerAtHz(mono, sampleRate, frequencyHz);
  let out: Float32Array[] = channels.map((ch) => {
    const copy = new Float32Array(ch.length);
    copy.set(ch);
    return copy;
  });
  for (const c of coeffs) {
    out = out.map((ch) => applyBiquad(ch, c));
  }

  const afterMono = downmix(out);
  const afterMeasure = measureMainsHum(afterMono, sampleRate);
  const prominenceDbAfter =
    afterMeasure?.frequencyHz === frequencyHz
      ? afterMeasure.prominenceDb
      : afterMeasure?.prominenceDb ?? null;
  const powerAfter = binPowerAtHz(afterMono, sampleRate, frequencyHz);
  const binPowerRatio =
    powerBefore != null && powerAfter != null && powerBefore > 1e-20
      ? powerAfter / powerBefore
      : null;

  return {
    channels: out,
    before,
    after: snapshotLevels(out),
    frequencyHz,
    binPowerRatio,
    prominenceDbBefore,
    prominenceDbAfter,
    harmonicsNotched: Math.max(0, coeffs.length - 1),
    correctionVersion: MAINS_HUM_CORRECT_VERSION,
    measured,
  };
}
