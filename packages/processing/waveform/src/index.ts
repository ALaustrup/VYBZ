export {
  PORTABLE_FFT_MAX_BYTES,
  PROCESSING_VERSION,
  type LoudnessMetrics,
  type PortableAudioAnalysis,
  type SpectrumSnapshot,
  type WaveformPeaks,
} from "./types";
export { decodeWavPcm, dbFromLinear } from "./pcm";
export { computePeaks } from "./peaks";
export { computeLoudness } from "./loudness";
export {
  BS1770_METER_VERSION,
  TRUE_PEAK_OVERSAMPLE,
  measureBs1770,
  measureBs1770Mono,
  measureTruePeakDbtp,
  synthesizeSinePeakDbfs,
  type Bs1770Metrics,
  type MeasurementProvenance,
} from "./bs1770";
export { measureCrestFactorDb, CREST_CRUSHED_THRESHOLD_DB } from "./dynamics";
export {
  measureStereoCorrelation,
  STEREO_NARROW_THRESHOLD,
  STEREO_OUT_OF_PHASE_THRESHOLD,
} from "./stereo";
export {
  measureSpectralBalance,
  SPECTRAL_BASS_HEAVY_SHARE,
  SPECTRAL_BRIGHT_SHARE,
  SPECTRAL_THIN_LOW_MID_SHARE,
  type SpectralBalance,
} from "./spectralBalance";
export {
  measureClipIntegrity,
  measureEdgeSilence,
  CLIP_SHARE_WARN,
  SILENCE_LEAD_IN_WARN_SEC,
  SILENCE_LEAD_OUT_WARN_SEC,
  type ClipIntegrity,
  type EdgeSilence,
} from "./integrity";
export {
  measureDcOffset,
  measureMonoCompat,
  DC_OFFSET_LINEAR_WARN,
  MONO_LOSS_WARN_DB,
  type DcOffsetResult,
  type MonoCompatResult,
} from "./monoCompat";
export {
  measureChannelBalance,
  CHANNEL_IMBALANCE_WARN_DB,
  type ChannelBalance,
} from "./channelBalance";
export { computeSpectrum } from "./fft";
export { analyzeWavBuffer, type AnalyzeOptions } from "./analyze";
