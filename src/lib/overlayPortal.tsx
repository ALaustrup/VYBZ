import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Mount overlays on `document.body` so they never clip inside `.vdock-shell`
 * (overflow-hidden + backdrop-filter creates a fixed containing block).
 *
 * Rule: tips, comments, source pickers, expanded player — anything taller than
 * the dock — MUST use this (or equivalent) so controls stay reachable above VDock.
 */
export function OverlayPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
