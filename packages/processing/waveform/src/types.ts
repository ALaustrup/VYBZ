/** Portable waveform / loudness / FFT contracts — no DOM, no network. */

export const PORTABLE_FFT_MAX_BYTES = 10 * 1024 * 1024;

export type WaveformPeaks = {
  peaks: number[];
  bucketCount: number;
  sampleRate: number;
  channels: number;
  durationSeconds: number;
};

export type LoudnessMetrics = {
  /** Peak sample level in dBFS (0 = full scale). */
  peakDbfs: number;
  /** RMS level in dBFS. */
  rmsDbfs: number;
  /**
   * Legacy gated-RMS LUFS-like estimate (pre-M4). Kept for parity/tests.
   * Prefer `integratedLufs` from BS.1770 when present.
   */
  integratedLufsApprox: number;
  /** BS.1770-4 integrated loudness when measured. */
  integratedLufs?: number;
  momentaryLufs?: number;
  shortTermLufs?: number;
  loudnessRangeLu?: number;
  /** True peak (oversampled), dBTP — never confuse with sample peak. */
  truePeakDbtp?: number;
  loudnessProvenance?: {
    standard: "BS.1770-4";
    meterVersion: string;
    sampleRate: number;
    channelCount: number;
    truePeakOversample: number;
    environment: string;
  };
  /** Peak − RMS (dB). Present when both levels were measured. */
  crestFactorDb?: number;
  /** L/R Pearson correlation (−1…+1). Null/absent for mono. */
  stereoCorrelation?: number | null;
  /** Power-weighted spectral band shares from mid-file FFT. */
  spectralBalance?: {
    lowShare: number;
    midShare: number;
    highShare: number;
  };
  /** Count of near-full-scale samples across channels. */
  clippedSamples?: number;
  /** Longest consecutive clipped run. */
  maxClipRun?: number;
  /** Leading digital silence (seconds). */
  silenceLeadInSeconds?: number;
  /** Trailing digital silence (seconds). */
  silenceLeadOutSeconds?: number;
};

export type SpectrumSnapshot = {
  /** Normalized 0..1 magnitudes (half spectrum). */
  magnitudes: number[];
  fftSize: number;
};

export type PortableAudioAnalysis = WaveformPeaks &
  LoudnessMetrics & {
    spectrum?: SpectrumSnapshot;
    engine: "portable" | "native";
    processingVersion: string;
  };

export const PROCESSING_VERSION = "m5.waveform.1";
