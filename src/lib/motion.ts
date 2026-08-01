/**
 * Shared Framer Motion language for VYBZ — one spring/stagger vocabulary so
 * sheets, drawers, Orb focus, and route enters feel authored (not random).
 *
 * Respect reduced motion at call sites via `useReduceFx()` / `preferReduce`.
 */

import type { Transition, Variants } from "framer-motion";

/** Snappy UI chrome — Orb ring, chips, dock micro-interactions. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.85,
};

/** Soft sheets / drawers — Compose, Go Live, settings. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 0.95,
};

/** Heavier orchestral entrances — splash, expanded player, signature reveals. */
export const springOrchestral: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 28,
  mass: 1.05,
};

/** Drawer slide (More) — slightly snappier than soft sheets. */
export const springDrawer: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 36,
  mass: 0.9,
};

/** Fade / short tween when springs feel wrong (route fades, overlays). */
export const easeOutExpo: Transition = {
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
};

export const easeOutQuick: Transition = {
  duration: 0.12,
  ease: "easeOut",
};

/** Instant when user prefers reduced motion. */
export const reduceMotion: Transition = { duration: 0.01 };

export function withReduce(reduce: boolean, transition: Transition): Transition {
  return reduce ? reduceMotion : transition;
}

/** Duration presets aligned with MOTION_V2 (ms → s for Framer). */
export const durationFast = 0.12;
export const durationNormal = 0.24;

/** Route stage enter — used by App shell. */
export const pageEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { ...easeOutExpo, duration: durationNormal } satisfies Transition,
};

/** Geometric diagonal reveal — signature page transition for the suite shell. */
export const geometricPageVariants: Variants = {
  initial: {
    opacity: 0,
    clipPath: "polygon(0 0, 100% 0, 100% 0, 0 12%)",
    y: 10,
  },
  animate: {
    opacity: 1,
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
    y: 0,
  },
  exit: {
    opacity: 0,
    clipPath: "polygon(0 88%, 100% 100%, 100% 100%, 0 100%)",
    y: -6,
  },
};

export const geometricPageTransition: Transition = {
  duration: 0.38,
  ease: [0.22, 1, 0.28, 1],
};

/** Bottom sheet (Compose / Go Live / Bulk). */
export const sheetVariants: Variants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
  exit: { y: "100%" },
};

/** Right drawer (More). */
export const drawerVariants: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0 },
  exit: { x: "100%" },
};

/** Dim overlay fade. */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Stagger children for signature lists (Orb ring / tutorial steps). */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springSnappy,
  },
};
