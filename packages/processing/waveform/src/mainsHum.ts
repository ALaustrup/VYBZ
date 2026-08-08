/**
 * Mains-hum heuristic from a mid-file FFT (Law 1 — measured spectrum only).
 * Compares 50 Hz and 60 Hz bin power to a local neighborhood.
 * Not a notch-filter detector — labelled as a VYBZ heuristic in findings.
 */

import { computeSpectrum } from "./fft";

export type MainsHumResult = {
  /** Stronger candidate between 50 and 60 Hz. */
  frequencyHz: 50 | 60;
  /** Peak vs neighborhood median, dB (20·log10). */
  prominenceDb: number;
  binHz: number;
};

/** Warn when the fundamental stands this many dB above local median. */
export const MAINS_HUM_PROMINENCE_WARN_DB = 12;

function binPower(magnitudes: number[], bin: number): number {
  const m = magnitudes[bin] ?? 0;
  return m * m;
}

function neighborhoodMedian(magnitudes: number[], center: number): number {
  const powers: number[] = [];
  for (let d = 3; d <= 10; d++) {
    const lo = center - d;
    const hi = center + d;
    if (lo >= 1) powers.push(binPower(magnitudes, lo));
    if (hi < magnitudes.length) powers.push(binPower(magnitudes, hi));
  }
  if (!powers.length) return 0;
  powers.sort((a, b) => a - b);
  const mid = Math.floor(powers.length / 2);
  return powers.length % 2 === 0
    ? (powers[mid - 1]! + powers[mid]!) / 2
    : powers[mid]!;
}

function prominenceAtHz(
  magnitudes: number[],
  fftSize: number,
  sampleRate: number,
  hz: 50 | 60
): number | null {
  const binHz = sampleRate / fftSize;
  const bin = Math.round(hz / binHz);
  if (bin < 1 || bin >= magnitudes.length - 1) return null;
  const peak = binPower(magnitudes, bin);
  const neigh = neighborhoodMedian(magnitudes, bin);
  if (peak <= 1e-20) return null;
  if (neigh <= 1e-20) return 60; // isolated tone in near-silence neighborhood
  return 10 * Math.log10(peak / neigh);
}

/**
 * Measure 50/60 Hz prominence on a mono (or downmixed) PCM buffer.
 * Uses an 8192-point mid-file FFT when enough samples exist.
 */
export function measureMainsHum(
  samples: Float32Array,
  sampleRate: number
): MainsHumResult | null {
  if (samples.length < 2048 || sampleRate < 8000) return null;
  const fftSize = samples.length >= 8192 ? 8192 : 4096;
  const { magnitudes, fftSize: size } = computeSpectrum(samples, fftSize);
  const p50 = prominenceAtHz(magnitudes, size, sampleRate, 50);
  const p60 = prominenceAtHz(magnitudes, size, sampleRate, 60);
  if (p50 == null && p60 == null) return null;
  const use60 = (p60 ?? -Infinity) >= (p50 ?? -Infinity);
  const prominenceDb = use60 ? p60! : p50!;
  return {
    frequencyHz: use60 ? 60 : 50,
    prominenceDb,
    binHz: sampleRate / size,
  };
}
