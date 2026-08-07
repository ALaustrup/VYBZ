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

export const PROCESSING_VERSION = "m4.waveform.1";
