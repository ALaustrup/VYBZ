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
   * Approximate integrated loudness (LUFS-like) from gated RMS windows.
   * Not a certified BS.1770 meter — suitable for Prepare gating only.
   */
  integratedLufsApprox: number;
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

export const PROCESSING_VERSION = "phase4.waveform.1";
