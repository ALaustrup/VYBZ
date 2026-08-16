import { useSyncExternalStore } from "react";

/**
 * How many questions the current track is still asking you.
 *
 * The dock needs this, and the dock must not re-render on every clock tick, so
 * it lives in a tiny external store the same way the player snapshot does rather
 * than being threaded through React state.
 */
export type SparkStatus = {
  trackId: string | null;
  /** Sparks placed on this track. */
  total: number;
  /** Sparks this listener has answered in this session. */
  answered: number;
};

const EMPTY: SparkStatus = { trackId: null, total: 0, answered: 0 };

let status: SparkStatus = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setSparkStatus(next: SparkStatus) {
  if (
    status.trackId === next.trackId &&
    status.total === next.total &&
    status.answered === next.answered
  ) {
    return;
  }
  status = next;
  emit();
}

export function clearSparkStatus() {
  setSparkStatus(EMPTY);
}

export function getSparkStatus(): SparkStatus {
  return status;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSparkStatus(): SparkStatus {
  return useSyncExternalStore(subscribe, getSparkStatus, getSparkStatus);
}

/** Short label for the dock. Null when this track asks nothing. */
export function sparkStatusLabel(s: SparkStatus): string | null {
  if (!s.trackId || s.total <= 0) return null;
  const left = Math.max(0, s.total - s.answered);
  if (left === 0) return "Feedback sent";
  return `${left} question${left === 1 ? "" : "s"} coming`;
}
