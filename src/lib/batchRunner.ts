/**
 * Sequential batch executor with progress, cancellation and honest partial-success
 * reporting. Runs one item at a time so a bulk action cannot stampede the backend,
 * and never reports success for items it did not complete.
 */

export type BatchItemResult = {
  id: string;
  ok: boolean;
  /** Present when the item failed — surfaced to the user, not swallowed. */
  error?: string;
};

export type BatchProgress = {
  done: number;
  total: number;
  succeeded: number;
  failed: number;
  cancelled: boolean;
};

export type BatchOutcome = {
  results: BatchItemResult[];
  succeeded: string[];
  failed: BatchItemResult[];
  /** Items never attempted because the run was cancelled. */
  skipped: string[];
  cancelled: boolean;
};

export type BatchRunOptions = {
  onProgress?: (p: BatchProgress) => void;
  /** Polled between items; returning true stops before the next item starts. */
  shouldCancel?: () => boolean;
};

export async function runBatch(
  ids: string[],
  work: (id: string) => Promise<void>,
  opts: BatchRunOptions = {}
): Promise<BatchOutcome> {
  const results: BatchItemResult[] = [];
  let cancelled = false;

  const emit = (done: number) => {
    const succeeded = results.filter((r) => r.ok).length;
    opts.onProgress?.({
      done,
      total: ids.length,
      succeeded,
      failed: results.length - succeeded,
      cancelled,
    });
  };

  emit(0);

  for (let i = 0; i < ids.length; i++) {
    if (opts.shouldCancel?.()) {
      cancelled = true;
      break;
    }
    const id = ids[i]!;
    try {
      await work(id);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: err instanceof Error ? err.message : "Failed" });
    }
    emit(results.length);
  }

  const attempted = new Set(results.map((r) => r.id));
  return {
    results,
    succeeded: results.filter((r) => r.ok).map((r) => r.id),
    failed: results.filter((r) => !r.ok),
    skipped: ids.filter((id) => !attempted.has(id)),
    cancelled,
  };
}

/** One sentence a user can act on, covering every partial-success shape. */
export function describeOutcome(outcome: BatchOutcome, verb: string): string {
  const ok = outcome.succeeded.length;
  const bad = outcome.failed.length;
  const skipped = outcome.skipped.length;

  if (outcome.cancelled) {
    if (ok === 0) return `Cancelled — nothing was ${verb}.`;
    return `Cancelled after ${verb} ${ok} — ${skipped} left untouched${bad ? `, ${bad} failed` : ""}.`;
  }
  if (bad === 0) return `${ok} ${ok === 1 ? "item" : "items"} ${verb}.`;
  if (ok === 0) return `None ${verb} — all ${bad} failed.`;
  return `${ok} ${verb}, ${bad} failed.`;
}
