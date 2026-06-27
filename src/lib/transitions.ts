import type { Target, Transition } from "framer-motion";

// Page transition presets for routed views. The default is free; the more
// expressive ones are a Godmode personalization.

export interface PageTransition {
  id: string;
  label: string;
  premium: boolean;
  /** Base V¢ price (0 = free). Purchasable by anyone; Godmode discounted. */
  price: number;
  exclusive?: boolean;
  initial: Target;
  animate: Target;
  exit: Target;
  transition: Transition;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export const PAGE_TRANSITIONS: PageTransition[] = [
  {
    id: "fade",
    label: "Fade",
    premium: false,
    price: 0,
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.28, ease: EASE },
  },
  {
    id: "slide",
    label: "Slide",
    premium: true,
    price: 80,
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.32, ease: EASE },
  },
  {
    id: "zoom",
    label: "Zoom",
    premium: true,
    price: 80,
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.04 },
    transition: { duration: 0.3, ease: EASE },
  },
  {
    id: "veil",
    label: "Veil",
    premium: true,
    price: 80,
    initial: { opacity: 0, filter: "blur(14px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(14px)" },
    transition: { duration: 0.34, ease: EASE },
  },
];

export const DEFAULT_TRANSITION = "fade";

const MAP: Record<string, PageTransition> = Object.fromEntries(
  PAGE_TRANSITIONS.map((t) => [t.id, t])
);

export function pageTransition(id: string | undefined): PageTransition {
  return MAP[id ?? DEFAULT_TRANSITION] ?? MAP[DEFAULT_TRANSITION];
}
