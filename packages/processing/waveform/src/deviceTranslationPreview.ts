/**
 * M7 deepen — disclosed device-context EQ previews (phone / car).
 * Law 1: not exact device emulation; labelled simulation only.
 */

import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";
import { applyPeakSafety, PEAK_SAFETY_CEILING_LINEAR } from "./peakSafety";

export const DEVICE_TRANSLATION_VERSION = "m7.device-preview.1";

export type DevicePreviewMode = "phone" | "car";

export type DeviceTranslationResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  mode: DevicePreviewMode;
  correctionVersion: typeof DEVICE_TRANSLATION_VERSION;
  disclosure: string;
};

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

function peaking(fs: number, f0: number, Q: number, gainDb: number): Biquad {
  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha / A;
  return {
    b0: (1 + alpha * A) / a0,
    b1: (-2 * Math.cos(w0)) / a0,
    b2: (1 - alpha * A) / a0,
    a1: (-2 * Math.cos(w0)) / a0,
    a2: (1 - alpha / A) / a0,
  };
}

function highpass(fs: number, f0: number, Q = 0.707): Biquad {
  const w0 = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w0) / (2 * Q);
  const cos = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: ((1 + cos) / 2) / a0,
    b1: (-(1 + cos)) / a0,
    b2: ((1 + cos) / 2) / a0,
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

function chain(ch: Float32Array, filters: Biquad[]): Float32Array {
  let cur = ch;
  for (const f of filters) cur = applyBiquad(cur, f);
  return cur;
}

/**
 * Approximate phone / car listening EQ. Not a measured device transfer function.
 */
export function applyDeviceTranslationPreview(
  channels: Float32Array[],
  sampleRate: number,
  mode: DevicePreviewMode,
): DeviceTranslationResult {
  const before = snapshotLevels(channels);
  const disclosure =
    mode === "phone"
      ? "Phone-style preview (high-pass + reduced bass). Approximate simulation — not a measured phone speaker."
      : "Car-style preview (bass lift + mid scoop). Approximate simulation — not a measured cabin response.";

  if (!channels[0]?.length || sampleRate < 8000) {
    return {
      channels: channels.map((c) => c.slice()),
      before,
      after: before,
      mode,
      correctionVersion: DEVICE_TRANSLATION_VERSION,
      disclosure,
    };
  }

  const filters: Biquad[] =
    mode === "phone"
      ? [highpass(sampleRate, 180), peaking(sampleRate, 120, 0.8, -6), peaking(sampleRate, 3500, 1.2, 2)]
      : [peaking(sampleRate, 70, 0.9, 5), peaking(sampleRate, 400, 1.0, -3), peaking(sampleRate, 2500, 1.1, 1.5)];

  const processed = channels.map((ch) => chain(ch, filters));
  const peaked = applyPeakSafety(processed, PEAK_SAFETY_CEILING_LINEAR);

  return {
    channels: peaked.channels,
    before,
    after: peaked.after,
    mode,
    correctionVersion: DEVICE_TRANSLATION_VERSION,
    disclosure,
  };
}
