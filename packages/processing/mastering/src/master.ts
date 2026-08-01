import { decodeWavPcm, dbFromLinear } from "@vybz/processing/waveform";
import {
  PROC_VERSION_DSP,
  type MasteringMetrics,
  type MasteringOptions,
  type MasteringResult,
} from "./types";

function rmsLinear(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  return Math.sqrt(sum / samples.length);
}

function peakAbs(samples: Float32Array): number {
  let p = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]!);
    if (a > p) p = a;
  }
  return p;
}

/** Encode interleaved Float32 PCM (−1..1) as 16-bit PCM WAV. */
export function encodeWavPcm16(
  samples: Float32Array,
  sampleRate: number,
  channels: number
): ArrayBuffer {
  const frames = Math.floor(samples.length / channels);
  const dataSize = frames * channels * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < frames * channels; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return buffer;
}

/**
 * Loudness normalize (RMS target) + peak limit + optional mid/side width.
 * Deterministic; used by client, golden tests, and Edge DSP fallback when ONNX absent.
 */
export function masterPcm(
  monoOrInterleaved: Float32Array,
  sampleRate: number,
  channels: number,
  opts: MasteringOptions = {}
): { samples: Float32Array; metrics: Omit<MasteringMetrics, "procVersion"> } {
  const targetRmsDbfs = opts.targetRmsDbfs ?? -14;
  const peakCeiling = opts.peakCeiling ?? 0.95;
  const stereoWidth = opts.stereoWidth ?? 1;

  const frames = Math.floor(monoOrInterleaved.length / Math.max(1, channels));
  const work = new Float32Array(frames * channels);
  work.set(monoOrInterleaved.subarray(0, frames * channels));

  // Measure on mono mixdown
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) sum += work[i * channels + ch]!;
    mono[i] = sum / channels;
  }
  const inputRms = rmsLinear(mono);
  const inputPeak = peakAbs(work);
  const inputRmsDbfs = dbFromLinear(inputRms);
  const targetLinear = Math.pow(10, targetRmsDbfs / 20);
  let gain = inputRms > 1e-12 ? targetLinear / inputRms : 1;

  // Apply gain
  for (let i = 0; i < work.length; i++) work[i]! *= gain;

  // Stereo width via mid/side (no-op for mono)
  if (channels >= 2 && Math.abs(stereoWidth - 1) > 1e-6) {
    for (let i = 0; i < frames; i++) {
      const l = work[i * channels]!;
      const r = work[i * channels + 1]!;
      const mid = (l + r) * 0.5;
      const side = (l - r) * 0.5 * stereoWidth;
      work[i * channels] = mid + side;
      work[i * channels + 1] = mid - side;
    }
  }

  // Peak limiter (hard clip to ceiling after soft scale)
  let peak = peakAbs(work);
  if (peak > peakCeiling && peak > 1e-12) {
    const lim = peakCeiling / peak;
    for (let i = 0; i < work.length; i++) work[i]! *= lim;
    gain *= lim;
    peak = peakCeiling;
  }

  const outMono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) sum += work[i * channels + ch]!;
    outMono[i] = sum / channels;
  }
  const outputRms = rmsLinear(outMono);

  return {
    samples: work,
    metrics: {
      inputRmsDbfs,
      outputRmsDbfs: dbFromLinear(outputRms),
      inputPeak,
      outputPeak: peakAbs(work),
      gainDb: 20 * Math.log10(Math.max(gain, 1e-12)),
      durationSeconds: frames / sampleRate,
      sampleRate,
      channels,
    },
  };
}

/** Master a WAV ArrayBuffer → mastered WAV + metrics (DSP proc_version). */
export function masterWavBuffer(
  buffer: ArrayBuffer,
  opts: MasteringOptions = {}
): MasteringResult {
  const decoded = decodeWavPcm(buffer);
  // decodeWavPcm returns mono mix — re-decode interleaved for stereo width when possible
  const view = new DataView(buffer);
  let channels = decoded.channels;
  let sampleRate = decoded.sampleRate;
  let interleaved = decoded.samples;

  // If original was multi-channel, rebuild interleaved from WAV data chunk
  if (channels > 1) {
    const rebuilt = readInterleavedPcm16(view, channels, sampleRate);
    if (rebuilt) interleaved = rebuilt.samples;
  }

  const { samples, metrics } = masterPcm(interleaved, sampleRate, channels, opts);
  const wav = encodeWavPcm16(samples, sampleRate, channels);
  return {
    wav,
    metrics: { ...metrics, procVersion: PROC_VERSION_DSP },
  };
}

function readInterleavedPcm16(
  view: DataView,
  expectChannels: number,
  expectRate: number
): { samples: Float32Array } | null {
  if (view.byteLength < 44) return null;
  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let dataOffset = -1;
  let dataSize = 0;
  const ascii = (o: number, n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) s += String.fromCharCode(view.getUint8(o + i));
    return s;
  };
  while (offset + 8 <= view.byteLength) {
    const id = ascii(offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === "data") {
      dataOffset = body;
      dataSize = size;
      break;
    }
    offset = body + size + (size % 2);
  }
  if (dataOffset < 0 || bits !== 16 || channels !== expectChannels || sampleRate !== expectRate) {
    return null;
  }
  const frames = Math.floor(dataSize / (2 * channels));
  const samples = new Float32Array(frames * channels);
  for (let i = 0; i < frames * channels; i++) {
    samples[i] = view.getInt16(dataOffset + i * 2, true) / 32768;
  }
  return { samples };
}

/** Absolute RMS difference in dB between two WAV buffers (mono mix). */
export function rmsDiffDbfs(a: ArrayBuffer, b: ArrayBuffer): number {
  const da = decodeWavPcm(a);
  const db = decodeWavPcm(b);
  return Math.abs(da.samples.length ? dbFromLinear(rmsLinear(da.samples)) - dbFromLinear(rmsLinear(db.samples)) : 0);
}

export function measureRmsDbfs(buffer: ArrayBuffer): number {
  const d = decodeWavPcm(buffer);
  return dbFromLinear(rmsLinear(d.samples));
}
