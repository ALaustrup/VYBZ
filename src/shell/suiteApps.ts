/**
 * Suite app rail registry — Wave 1 tools + Correct + Translate + Pack Maker + Stem Maker.
 * Unfinished modules (full Master suite, Instrument Creator, OR-021–022) stay out.
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Home,
  ImagePlus,
  Layers,
  Library,
  Package,
  Piano,
  Radio,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Store,
  Tags,
  Waves,
} from "lucide-react";
import { FLAGS } from "@/lib/flags";

export type SuiteAppId =
  | "home"
  | "pack-pipeline"
  | "analyzer"
  | "metadata"
  | "art-check"
  | "midi-maker"
  | "media-converter"
  | "correct"
  | "translate"
  | "pack-maker"
  | "stem-maker"
  | "library"
  | "codex"
  | "store"
  | "settings";

export type SuiteAppDef = {
  id: SuiteAppId;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Match selected state for nested routes. */
  match: (pathname: string) => boolean;
  /** Hide when false. */
  visible?: () => boolean;
  /** Prefer overflow chip on narrow rails. */
  overflow?: boolean;
};

/**
 * Reachable by route and by the track context menu, not by browsing.
 *
 * A desk operates on one track. Listing desks in navigation invites you to open
 * an empty one and then go and find the file — which is the same tax the
 * uploader used to charge, one layer up. You reach a desk from the track it is
 * going to work on. Routes still resolve and every page still exists.
 */
const CONTEXT_MENU_ONLY = () => false;

export const SUITE_APPS: readonly SuiteAppDef[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    icon: Home,
    match: (p) => p === "/" || p.startsWith("/u/") || p.startsWith("/profile"),
  },
  {
    id: "pack-pipeline",
    label: "Make pack",
    path: "/make",
    icon: Package,
    match: (p) => p === "/make" || p.startsWith("/make/"),
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "analyzer",
    label: "Scan",
    path: "/releases",
    icon: Waves,
    match: (p) =>
      p.startsWith("/releases") ||
      p.startsWith("/release/") ||
      p.startsWith("/start"),
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "metadata",
    label: "Names",
    path: "/tools/metadata",
    icon: Tags,
    match: (p) => p.startsWith("/tools/metadata"),
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "art-check",
    label: "Cover",
    path: "/tools/art-check",
    icon: ImagePlus,
    match: (p) => p.startsWith("/tools/art-check"),
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "correct",
    label: "Fix",
    path: "/tools/correct",
    icon: SlidersHorizontal,
    match: (p) => p.startsWith("/tools/correct"),
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "translate",
    label: "Listen check",
    path: "/tools/translate",
    icon: Radio,
    match: (p) => p.startsWith("/tools/translate"),
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "midi-maker",
    label: "MIDI",
    path: "/tools/midi",
    icon: Piano,
    match: (p) => p.startsWith("/tools/midi"),
    overflow: true,
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "media-converter",
    label: "Convert",
    path: "/tools/convert",
    icon: RefreshCw,
    match: (p) => p.startsWith("/tools/convert"),
    overflow: true,
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "pack-maker",
    label: "Pack",
    path: "/tools/pack-maker",
    icon: Package,
    match: (p) => p.startsWith("/tools/pack-maker"),
    overflow: true,
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "stem-maker",
    label: "Stems",
    path: "/tools/stems",
    icon: Layers,
    match: (p) => p.startsWith("/tools/stems"),
    overflow: true,
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "library",
    label: "Library",
    path: "/library",
    icon: Library,
    match: (p) => p.startsWith("/library") || p.startsWith("/track/"),
  },
  {
    id: "codex",
    label: "Codex",
    path: "/codex",
    icon: BookOpen,
    match: (p) => p.startsWith("/codex") || p.startsWith("/legal"),
    visible: CONTEXT_MENU_ONLY,
  },
  {
    id: "store",
    label: "Store",
    path: "/market",
    icon: Store,
    match: (p) =>
      p === "/market" || p.startsWith("/tools/packs") || p.startsWith("/pack/"),
    visible: () => FLAGS.storefront,
  },
  {
    id: "settings",
    label: "Settings",
    path: "/profile/edit",
    icon: Settings,
    match: (p) => p.startsWith("/profile/edit"),
    overflow: true,
  },
] as const;

export function visibleSuiteApps(): SuiteAppDef[] {
  return SUITE_APPS.filter((a) => (a.visible ? a.visible() : true));
}

export function primarySuiteApps(): SuiteAppDef[] {
  return visibleSuiteApps().filter((a) => !a.overflow);
}

export function overflowSuiteApps(): SuiteAppDef[] {
  return visibleSuiteApps().filter((a) => a.overflow);
}

export function activeSuiteAppId(pathname: string): SuiteAppId | null {
  // Every app, not just the visible ones. Visibility decides what the launcher
  // offers; it must not decide whether the shell can name the desk you are
  // standing in. A context-menu-only desk still needs its own title.
  // Prefer the most specific match (longest path prefix among matches).
  let best: SuiteAppDef | null = null;
  for (const app of SUITE_APPS) {
    if (!app.match(pathname)) continue;
    if (!best || app.path.length > best.path.length) best = app;
  }
  // Home match is broad — prefer other apps when they match.
  if (best?.id === "home") {
    for (const app of SUITE_APPS) {
      if (app.id !== "home" && app.match(pathname)) return app.id;
    }
  }
  return best?.id ?? null;
}
