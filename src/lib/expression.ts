// ---------------------------------------------------------------------------
// Expression: how a confession's words are styled.
//
//  - Font styles are free typographic choices (family / weight / tracking).
//  - Text effects (shimmer, glow, …) and the 3D "gyroscopic" media view are
//    premium: free for Godmode, otherwise paid for with V¢ at post time.
//
// Helpers here turn the stored ids into class names so the renderers stay dumb.
// CSS for the effect classes lives in src/index.css (.fx-*).
// ---------------------------------------------------------------------------

import { priceFor } from "@/lib/economy";

export interface FontStyle {
  id: string;
  label: string;
  className: string;
}

/** Free typography choices shown under the confession text input. */
export const FONT_STYLES: FontStyle[] = [
  { id: "clean", label: "Clean", className: "font-display tracking-tightish" },
  { id: "serif", label: "Serif", className: "font-serif tracking-tight" },
  { id: "mono", label: "Typewriter", className: "font-mono tracking-tight" },
  { id: "wide", label: "Wide", className: "font-display uppercase tracking-[0.14em]" },
  { id: "light", label: "Whisper", className: "font-display font-light tracking-tightish" },
];

const FONT_MAP: Record<string, string> = Object.fromEntries(
  FONT_STYLES.map((f) => [f.id, f.className])
);

export const DEFAULT_FONT = "clean";

export function fontClassFor(id: string | undefined): string {
  return FONT_MAP[id ?? DEFAULT_FONT] ?? FONT_MAP[DEFAULT_FONT];
}

export interface TextFx {
  id: string;
  label: string;
  /** V¢ price; 0 = free. Always free for Godmode. */
  cost: number;
  /** Class applied to the confession <p>. Empty for "none". */
  className: string;
  hint: string;
}

/** Premium text effects (V¢ / Godmode). */
export const TEXT_FX: TextFx[] = [
  { id: "none", label: "None", cost: 0, className: "", hint: "Plain, legible text." },
  { id: "shimmer", label: "Shimmer", cost: 20, className: "fx-shimmer", hint: "A slow iridescent sweep." },
  { id: "glow", label: "Neon", cost: 20, className: "fx-glow", hint: "Soft violet halo." },
  { id: "flicker", label: "Flicker", cost: 25, className: "fx-flicker", hint: "An unstable, haunting pulse." },
  { id: "rise", label: "Rise", cost: 15, className: "fx-rise", hint: "Words drift up on reveal." },
];

const FX_MAP: Record<string, TextFx> = Object.fromEntries(
  TEXT_FX.map((f) => [f.id, f])
);

export const DEFAULT_FX = "none";

export function textFxClassFor(id: string | undefined): string {
  return FX_MAP[id ?? DEFAULT_FX]?.className ?? "";
}

export function textFxCost(id: string | undefined): number {
  return FX_MAP[id ?? DEFAULT_FX]?.cost ?? 0;
}

/** V¢ price for the 3D gyroscopic media view (free for Godmode). */
export const VIEW_3D_COST = 30;

/**
 * Total V¢ for the chosen premium expression. Everyone pays V¢; Godmode gets the
 * standing discount (never free — that would devalue V¢).
 */
export function expressionCost(
  fx: string | undefined,
  view3d: boolean | undefined,
  godmode: boolean
): number {
  const base = textFxCost(fx) + (view3d ? VIEW_3D_COST : 0);
  return priceFor(base, godmode);
}
