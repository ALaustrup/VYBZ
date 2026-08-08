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
  /** Absolute DC mean of the downmix (linear). */
  dcOffsetAbs?: number;
  /** DC mean as dBFS-like when measurable. */
  dcOffsetDbfs?: number;
  /** Mono fold-down level vs stereo RMS (dB); negative = quieter in mono. */
  monoLossDb?: number;
  /** Left RMS − right RMS (dB). */
  channelBalanceDb?: number;
  leftRmsDbfs?: number;
  rightRmsDbfs?: number;
  /** True peak (dBTP) − integrated LUFS when both measured. */
  plrDb?: number;
  /** Mid-channel RMS (dBFS) from L/R mid/side. */
  midRmsDbfs?: number;
  /** Side-channel RMS (dBFS) from L/R mid/side. */
  sideRmsDbfs?: number;
  /** sideRms − midRms (dB). */
  sideToMidDb?: number;
  /** True peak − sample peak (dB). */
  ispOvershootDb?: number;
  /** Stronger mains-hum candidate (50 or 60 Hz). */
  mainsHumHz?: 50 | 60;
  /** Prominence of mains-hum candidate vs local spectrum (dB). */
  mainsHumProminenceDb?: number;
  /** Distinct click/pop candidates (time-domain heuristic). */
  clickPopCount?: number;
  /** Strongest click prominence vs local RMS (dB). */
  clickPopProminenceDb?: number;
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
