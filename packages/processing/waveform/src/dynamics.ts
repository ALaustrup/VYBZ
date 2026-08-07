/**
 * Crest factor from measured peak and RMS (dBFS).
 * Heuristic only — not a broadcast standard. Law 1: both inputs must be measured.
 */
export function measureCrestFactorDb(peakDbfs: number, rmsDbfs: number): number {
  if (!Number.isFinite(peakDbfs) || !Number.isFinite(rmsDbfs)) return 0;
  return peakDbfs - rmsDbfs;
}

/** VYBZ heuristic: masters with crest below this often sound over-limited. */
export const CREST_CRUSHED_THRESHOLD_DB = 6;

/**
 * Peak-to-loudness ratio: true peak (dBTP) − integrated LUFS.
 * Both inputs must be measured (Law 1). Streaming-competitive masters
 * often sit near 8–12 dB; values under ~6 dB usually mean heavy limiting.
 */
export function measurePlrDb(truePeakDbtp: number, integratedLufs: number): number {
  if (!Number.isFinite(truePeakDbtp) || !Number.isFinite(integratedLufs)) return 0;
  return truePeakDbtp - integratedLufs;
}

/** VYBZ heuristic: PLR below this often sounds crushed for streaming. */
export const PLR_LOW_THRESHOLD_DB = 6;
