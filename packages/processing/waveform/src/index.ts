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
export {
  measureCrestFactorDb,
  measureIspOvershootDb,
  measurePlrDb,
  CREST_CRUSHED_THRESHOLD_DB,
  ISP_OVERSHOOT_WARN_DB,
  PLR_LOW_THRESHOLD_DB,
} from "./dynamics";
export {
  measureMainsHum,
  MAINS_HUM_PROMINENCE_WARN_DB,
  type MainsHumResult,
} from "./mainsHum";
export {
  applyMainsHumReduce,
  MAINS_HUM_CORRECT_VERSION,
  type MainsHumCorrectResult,
} from "./mainsHumCorrect";
export {
  applyStereoWidth,
  STEREO_WIDTH_VERSION,
  type StereoWidthResult,
  type StereoWidthMode,
} from "./stereoWidthCorrect";
export {
  applySpectralEqAssist,
  SPECTRAL_EQ_VERSION,
  type SpectralEqResult,
  type SpectralEqMode,
} from "./spectralEqCorrect";
export {
  measureClickPop,
  CLICK_POP_COUNT_WARN,
  CLICK_POP_PROMINENCE_WARN_DB,
  type ClickPopResult,
} from "./clickPop";
export {
  removeDcOffset,
  CORRECTION_VERSION,
  type DcRemoveResult,
  type LevelSnapshot,
} from "./dcRemove";
export {
  applyPeakSafety,
  PEAK_SAFETY_VERSION,
  PEAK_SAFETY_CEILING_DBFS,
  PEAK_SAFETY_CEILING_LINEAR,
  type PeakSafetyResult,
} from "./peakSafety";
export {
  applyChannelBalance,
  CHANNEL_BALANCE_VERSION,
  type ChannelBalanceCorrectResult,
} from "./channelBalanceCorrect";
export {
  applySilenceTrim,
  SILENCE_TRIM_VERSION,
  SILENCE_TRIM_PAD_SEC,
  type SilenceTrimResult,
} from "./silenceTrim";
export { snapshotLevels } from "./correctionLevels";
export {
  measureStereoCorrelation,
  STEREO_NARROW_THRESHOLD,
  STEREO_OUT_OF_PHASE_THRESHOLD,
} from "./stereo";
export {
  measureMidSide,
  SIDE_HEAVY_WARN_DB,
  type MidSideBalance,
} from "./midSide";
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
