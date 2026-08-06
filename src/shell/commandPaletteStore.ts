import { useSyncExternalStore } from "react";

/**
 * Open state for the command palette.
 *
 * A module store rather than context because three unrelated places open it —
 * the global shortcut, the app bar's search button, and the `CommandBar` slot —
 * and none of them should have to be nested under a provider to do so.
 */

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function openCommandPalette() {
  if (open) return;
  open = true;
  emit();
}

export function closeCommandPalette() {
  if (!open) return;
  open = false;
  emit();
}

export function toggleCommandPalette() {
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

export function useCommandPaletteOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test seam: reset module state between cases. */
export function resetCommandPalette() {
  open = false;
  listeners.clear();
}
