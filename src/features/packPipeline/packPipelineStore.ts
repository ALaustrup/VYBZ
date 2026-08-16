/**
 * Pipeline progress — complete and skipped are different.
 *
 * Skip never marks a stage complete. Later stages stay reachable either way.
 * Persisted in sessionStorage (ids only — no audio).
 */
import { useSyncExternalStore } from "react";
import type { PackStageId } from "./stages";

const KEY = "vybz.packPipeline.v1";

export type PackPipelineSnapshot = {
  completed: readonly PackStageId[];
  skipped: readonly PackStageId[];
};

const EMPTY: PackPipelineSnapshot = { completed: [], skipped: [] };

let snapshot: PackPipelineSnapshot = load();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function load(): PackPipelineSnapshot {
  if (typeof sessionStorage === "undefined") return EMPTY;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as { completed?: number[]; skipped?: number[] };
    return {
      completed: (parsed.completed ?? []).filter(isStageId),
      skipped: (parsed.skipped ?? []).filter(isStageId),
    };
  } catch {
    return EMPTY;
  }
}

function persist() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(snapshot));
}

function isStageId(n: number): n is PackStageId {
  return Number.isInteger(n) && n >= 0 && n <= 8;
}

function setSnapshot(next: PackPipelineSnapshot) {
  snapshot = next;
  persist();
  emit();
}

export function getPackPipeline(): PackPipelineSnapshot {
  return snapshot;
}

export function markStageComplete(id: PackStageId) {
  const completed = snapshot.completed.includes(id)
    ? snapshot.completed
    : [...snapshot.completed, id];
  const skipped = snapshot.skipped.filter((s) => s !== id);
  setSnapshot({ completed, skipped });
}

/** Skip visits the next stage without claiming this one is done. */
export function markStageSkipped(id: PackStageId) {
  if (snapshot.completed.includes(id)) return;
  const skipped = snapshot.skipped.includes(id) ? snapshot.skipped : [...snapshot.skipped, id];
  setSnapshot({ ...snapshot, skipped });
}

export function isStageComplete(id: PackStageId, snap: PackPipelineSnapshot = snapshot): boolean {
  return snap.completed.includes(id);
}

export function isStageSkipped(id: PackStageId, snap: PackPipelineSnapshot = snapshot): boolean {
  return snap.skipped.includes(id) && !snap.completed.includes(id);
}

export function resetPackPipeline() {
  setSnapshot(EMPTY);
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(KEY);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePackPipeline(): PackPipelineSnapshot {
  return useSyncExternalStore(subscribe, getPackPipeline, getPackPipeline);
}
