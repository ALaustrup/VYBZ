/**
 * M7 deepen — disclosed lossy-style codec translation preview.
 * Law 1: bandwidth + quantization simulation only — not a measured MP3/AAC/Opus encode.
 */

import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";
import { applyPeakSafety, PEAK_SAFETY_CEILING_LINEAR } from "./peakSafety";

export const CODEC_TRANSLATION_VERSION = "m7.codec-preview.1";

export type CodecPreviewMode = "lossy";

export type CodecTranslationResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  mode: CodecPreviewMode;
  /** Nominal cutoff used by the simulation (Hz). */
  bandwidthHz: number;
  correctionVersion: typeof CODEC_TRANSLATION_VERSION;
  disclosure: string;
};

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

function lowpass(fs: number, f0: number, Q = 0.707): Biquad {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: ((1 - cos) / 2) / a0,
    b1: (1 - cos) / a0,
    b2: ((1 - cos) / 2) / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
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

/** Soft 12-bit-ish quantization with tiny dither — approximates lossy grit, not a real codec. */
function quantizeSoft(input: Float32Array, levels = 4096): Float32Array {
  const out = new Float32Array(input.length);
  const scale = (levels - 1) / 2;
  for (let i = 0; i < input.length; i++) {
    const dither = ((i * 1103515245 + 12345) & 0xffff) / 0xffff - 0.5;
    const x = Math.max(-1, Math.min(1, input[i]! + dither * (1 / scale)));
    out[i] = Math.round(x * scale) / scale;
  }
  return out;
}

/**
 * Approximate lossy delivery (HF roll-off + mild quantization).
 * Not a measured MP3, AAC, Opus, or HE-AAC encode of any platform.
 */
export function applyCodecTranslationPreview(
  channels: Float32Array[],
  sampleRate: number,
  mode: CodecPreviewMode = "lossy",
): CodecTranslationResult {
  const before = snapshotLevels(channels);
  const bandwidthHz = 15000;
  const disclosure =
    "Lossy-style preview (≈15 kHz bandwidth + mild quantization). Approximate simulation — not a measured MP3/AAC/Opus encode of any platform.";

  if (!channels[0]?.length || sampleRate < 8000) {
    return {
      channels: channels.map((c) => c.slice()),
      before,
      after: before,
      mode,
      bandwidthHz,
      correctionVersion: CODEC_TRANSLATION_VERSION,
      disclosure,
    };
  }

  const cutoff = Math.min(bandwidthHz, sampleRate * 0.45);
  const lp = lowpass(sampleRate, cutoff);
  const processed = channels.map((ch) => quantizeSoft(applyBiquad(ch, lp)));
  const peaked = applyPeakSafety(processed, PEAK_SAFETY_CEILING_LINEAR);

  return {
    channels: peaked.channels,
    before,
    after: peaked.after,
    mode,
    bandwidthHz,
    correctionVersion: CODEC_TRANSLATION_VERSION,
    disclosure,
  };
}
