/**
 * M6 / OR-026 — gentle spectral EQ assist (shelves only).
 * Law 1: mode from measureSpectralBalance (or explicit). Not creative mastering.
 */

import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";
import { computeSpectrum } from "./fft";
import {
  measureSpectralBalance,
  SPECTRAL_BASS_HEAVY_SHARE,
  SPECTRAL_BRIGHT_SHARE,
  SPECTRAL_THIN_LOW_MID_SHARE,
  type SpectralBalance,
} from "./spectralBalance";

export const SPECTRAL_EQ_VERSION = "m6.spectral-eq.1";

export type SpectralEqMode = "auto" | "cutBass" | "cutBright" | "boostLow";

export type SpectralEqResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  modeApplied: SpectralEqMode | "noop";
  balanceBefore: SpectralBalance | null;
  balanceAfter: SpectralBalance | null;
  correctionVersion: typeof SPECTRAL_EQ_VERSION;
};

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

function lowShelf(sampleRate: number, freqHz: number, gainDb: number): Biquad | null {
  if (freqHz <= 0 || freqHz >= sampleRate * 0.45) return null;
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freqHz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const S = 1;
  const alpha = (sin / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
  const twoSqrtAalpha = 2 * Math.sqrt(A) * alpha;
  const b0 = A * (A + 1 - (A - 1) * cos + twoSqrtAalpha);
  const b1 = 2 * A * (A - 1 - (A + 1) * cos);
  const b2 = A * (A + 1 - (A - 1) * cos - twoSqrtAalpha);
  const a0 = A + 1 + (A - 1) * cos + twoSqrtAalpha;
  const a1 = -2 * (A - 1 + (A + 1) * cos);
  const a2 = A + 1 + (A - 1) * cos - twoSqrtAalpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function highShelf(sampleRate: number, freqHz: number, gainDb: number): Biquad | null {
  if (freqHz <= 0 || freqHz >= sampleRate * 0.45) return null;
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * freqHz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const S = 1;
  const alpha = (sin / 2) * Math.sqrt((A + 1 / A) * (1 / S - 1) + 2);
  const twoSqrtAalpha = 2 * Math.sqrt(A) * alpha;
  const b0 = A * (A + 1 + (A - 1) * cos + twoSqrtAalpha);
  const b1 = -2 * A * (A - 1 + (A + 1) * cos);
  const b2 = A * (A + 1 + (A - 1) * cos - twoSqrtAalpha);
  const a0 = A + 1 - (A - 1) * cos + twoSqrtAalpha;
  const a1 = 2 * (A - 1 - (A + 1) * cos);
  const a2 = A + 1 - (A - 1) * cos - twoSqrtAalpha;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
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

function balanceOf(samples: Float32Array, sampleRate: number): SpectralBalance | null {
  if (samples.length < 2048) return null;
  const fftSize = samples.length >= 8192 ? 8192 : 4096;
  const { magnitudes, fftSize: size } = computeSpectrum(samples, fftSize);
  return measureSpectralBalance(magnitudes, size, sampleRate);
}

function chooseMode(bal: SpectralBalance | null): SpectralEqMode | "noop" {
  if (!bal) return "noop";
  if (bal.lowShare >= SPECTRAL_BASS_HEAVY_SHARE) return "cutBass";
  if (bal.highShare >= SPECTRAL_BRIGHT_SHARE) return "cutBright";
  if (bal.lowShare + bal.midShare <= SPECTRAL_THIN_LOW_MID_SHARE) return "boostLow";
  return "noop";
}

export function applySpectralEqAssist(
  channels: Float32Array[],
  sampleRate: number,
  opts?: { mode?: SpectralEqMode },
): SpectralEqResult {
  const before = snapshotLevels(channels);
  const mono = downmix(channels);
  const balanceBefore = balanceOf(mono, sampleRate);
  const requested = opts?.mode ?? "auto";
  const modeApplied =
    requested === "auto" ? chooseMode(balanceBefore) : requested;

  if (modeApplied === "noop" || !channels[0]?.length) {
    return {
      channels: channels.map((c) => {
        const copy = new Float32Array(c.length);
        copy.set(c);
        return copy;
      }),
      before,
      after: before,
      modeApplied: "noop",
      balanceBefore,
      balanceAfter: balanceBefore,
      correctionVersion: SPECTRAL_EQ_VERSION,
    };
  }

  let coeff: Biquad | null = null;
  if (modeApplied === "cutBass") coeff = lowShelf(sampleRate, 120, -3.5);
  else if (modeApplied === "cutBright") coeff = highShelf(sampleRate, 6000, -3.5);
  else coeff = lowShelf(sampleRate, 110, 2.5);

  if (!coeff) {
    return {
      channels: channels.map((c) => c.slice()),
      before,
      after: before,
      modeApplied: "noop",
      balanceBefore,
      balanceAfter: balanceBefore,
      correctionVersion: SPECTRAL_EQ_VERSION,
    };
  }

  const out = channels.map((ch) => applyBiquad(ch, coeff!));
  const balanceAfter = balanceOf(downmix(out), sampleRate);
  return {
    channels: out,
    before,
    after: snapshotLevels(out),
    modeApplied,
    balanceBefore,
    balanceAfter,
    correctionVersion: SPECTRAL_EQ_VERSION,
  };
}
