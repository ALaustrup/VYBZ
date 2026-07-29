import { computeSpectrum } from "./fft";
import { computeLoudness } from "./loudness";
import { decodeWavPcm } from "./pcm";
import { computePeaks } from "./peaks";
import {
  PORTABLE_FFT_MAX_BYTES,
  PROCESSING_VERSION,
  type PortableAudioAnalysis,
} from "./types";

export type AnalyzeOptions = {
  bucketCount?: number;
  includeSpectrum?: boolean;
  /** Enforce portable ≤10 MB gate when true (default). */
  enforcePortableLimit?: boolean;
  sizeBytes?: number;
  engine?: "portable" | "native";
};

export function analyzeWavBuffer(buffer: ArrayBuffer, opts: AnalyzeOptions = {}): PortableAudioAnalysis {
  const sizeBytes = opts.sizeBytes ?? buffer.byteLength;
  const enforce = opts.enforcePortableLimit !== false;
  const engine = opts.engine ?? "portable";
  if (enforce && engine === "portable" && sizeBytes > PORTABLE_FFT_MAX_BYTES) {
    throw new Error(`Portable FFT limited to ${PORTABLE_FFT_MAX_BYTES} bytes (got ${sizeBytes})`);
  }

  const pcm = decodeWavPcm(buffer);
  const peaks = computePeaks(pcm, opts.bucketCount ?? 800);
  const loudness = computeLoudness(pcm);
  const spectrum =
    opts.includeSpectrum === false ? undefined : computeSpectrum(pcm.samples, 1024);

  return {
    ...peaks,
    ...loudness,
    spectrum,
    engine,
    processingVersion: PROCESSING_VERSION,
  };
}
