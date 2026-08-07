import { computeSpectrum } from "./fft";
import { computeLoudness } from "./loudness";
import { measureBs1770 } from "./bs1770";
import { measureCrestFactorDb } from "./dynamics";
import { measureClipIntegrity, measureEdgeSilence } from "./integrity";
import { measureDcOffset, measureMonoCompat } from "./monoCompat";
import { measureStereoCorrelation } from "./stereo";
import { measureSpectralBalance } from "./spectralBalance";
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
  const planar = pcm.planar ?? [pcm.samples];
  const peaks = computePeaks(pcm, opts.bucketCount ?? 800);
  const approx = computeLoudness(pcm);
  const bs = measureBs1770(
    planar,
    pcm.sampleRate,
    engine === "native" ? "native-pending" : "portable",
  );
  const spectrum =
    opts.includeSpectrum === false ? undefined : computeSpectrum(pcm.samples, 1024);
  const balance = spectrum
    ? measureSpectralBalance(spectrum.magnitudes, spectrum.fftSize, pcm.sampleRate)
    : null;
  const clips = measureClipIntegrity(planar);
  const edges = measureEdgeSilence(planar, pcm.sampleRate);
  const dc = measureDcOffset(planar);
  const mono = measureMonoCompat(planar);

  return {
    ...peaks,
    peakDbfs: bs.samplePeakDbfs,
    rmsDbfs: approx.rmsDbfs,
    integratedLufsApprox: approx.integratedLufsApprox,
    integratedLufs: bs.integratedLufs,
    momentaryLufs: bs.momentaryLufs,
    shortTermLufs: bs.shortTermLufs,
    loudnessRangeLu: bs.loudnessRangeLu,
    truePeakDbtp: bs.truePeakDbtp,
    loudnessProvenance: bs.provenance,
    crestFactorDb: measureCrestFactorDb(bs.samplePeakDbfs, approx.rmsDbfs),
    stereoCorrelation: measureStereoCorrelation(planar),
    spectralBalance: balance
      ? {
          lowShare: balance.lowShare,
          midShare: balance.midShare,
          highShare: balance.highShare,
        }
      : undefined,
    clippedSamples: clips.clippedSamples,
    maxClipRun: clips.maxClipRun,
    silenceLeadInSeconds: edges?.leadInSeconds,
    silenceLeadOutSeconds: edges?.leadOutSeconds,
    dcOffsetAbs: dc ? Math.abs(dc.mean) : undefined,
    dcOffsetDbfs: dc?.meanAbsDbfs,
    monoLossDb: mono?.monoLossDb,
    spectrum,
    engine,
    processingVersion: PROCESSING_VERSION,
  };
}
