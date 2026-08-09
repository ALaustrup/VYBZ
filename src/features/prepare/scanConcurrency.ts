/** Analyzer batch limits + CPU-aware worker count (Law 1 — derived from measured cores). */

export const MAX_ANALYZER_BATCH = 20;

/** Loudness spread (LU) across a finished batch that triggers a consistency hint. */
export const BATCH_LOUDNESS_SPREAD_LU = 3;

/**
 * Concurrent decode/analyze workers from `navigator.hardwareConcurrency`.
 * Caps at 4 — AudioContext decode is memory-heavy.
 */
export function analyzerWorkerCount(cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 0): number {
  const n = Number(cores) || 0;
  if (n < 1) return 1;
  return Math.max(1, Math.min(4, Math.floor(n / 2)));
}

/** Run async work over items with a fixed concurrency pool. */
export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  work: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await work(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
}
