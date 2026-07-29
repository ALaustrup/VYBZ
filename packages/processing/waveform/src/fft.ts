import type { SpectrumSnapshot } from "./types";

/** In-place radix-2 Cooley–Tukey FFT (real → complex interleaved). */
function fftRadix2(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k]!;
        const uIm = im[i + k]!;
        const vRe = re[i + k + len / 2]! * wRe - im[i + k + len / 2]! * wIm;
        const vIm = re[i + k + len / 2]! * wIm + im[i + k + len / 2]! * wRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextWRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextWRe;
      }
    }
  }
}

/**
 * Spectrum snapshot from mono PCM using a Hann-windowed FFT at mid-file.
 * FFT size must be power of two (default 1024).
 */
export function computeSpectrum(samples: Float32Array, fftSize = 1024): SpectrumSnapshot {
  const size = Math.max(64, Math.min(8192, 1 << Math.round(Math.log2(fftSize))));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const start = Math.max(0, Math.floor(samples.length / 2) - Math.floor(size / 2));
  for (let i = 0; i < size; i++) {
    const s = samples[start + i] ?? 0;
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    re[i] = s * hann;
  }
  fftRadix2(re, im);
  const half = size / 2;
  const magnitudes = new Array<number>(half);
  let max = 1e-12;
  for (let i = 0; i < half; i++) {
    const mag = Math.hypot(re[i]!, im[i]!);
    magnitudes[i] = mag;
    if (mag > max) max = mag;
  }
  for (let i = 0; i < half; i++) magnitudes[i] = magnitudes[i]! / max;
  return { magnitudes, fftSize: size };
}
