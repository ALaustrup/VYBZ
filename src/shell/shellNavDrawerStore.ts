import { useSyncExternalStore } from "react";

/** Open state for the mobile/tablet shell navigation drawer. */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function openShellNavDrawer() {
  if (open) return;
  open = true;
  emit();
}

export function closeShellNavDrawer() {
  if (!open) return;
  open = false;
  emit();
}

export function toggleShellNavDrawer() {
  open = !open;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return open;
}

export function useShellNavDrawerOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test seam: reset module state between cases. */
export function resetShellNavDrawer() {
  open = false;
  listeners.clear();
}
