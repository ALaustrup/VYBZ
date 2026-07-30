/** Phase 15 AI Mastering — DSP path (ONNX optional on Edge). */
export const PROC_VERSION_DSP = "phase15.dsp.1";
export const PROC_VERSION_ONNX = "phase15.onnx.1";

/** Free-tier AI mastering seconds per UTC month (soft limit). */
export const AI_MASTERING_FREE_SECONDS = 300;

/** Soft USD estimate per mastering second (telemetry only; Phase 16 bills). */
export const AI_MASTERING_USD_PER_SECOND = 0.0004;

export type MasteringOptions = {
  /** Target integrated loudness (approx dBFS RMS proxy). Default −14. */
  targetRmsDbfs?: number;
  /** Peak ceiling linear (0–1). Default 0.95 (−0.45 dBTP-ish). */
  peakCeiling?: number;
  /** Stereo width 0..2 (1 = unchanged). Mono inputs ignore. Default 1.05. */
  stereoWidth?: number;
};

export type MasteringMetrics = {
  inputRmsDbfs: number;
  outputRmsDbfs: number;
  inputPeak: number;
  outputPeak: number;
  gainDb: number;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  procVersion: string;
};

export type MasteringResult = {
  wav: ArrayBuffer;
  metrics: MasteringMetrics;
};
