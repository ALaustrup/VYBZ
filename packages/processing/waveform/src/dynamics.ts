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
