/**
 * Suite app rail registry — Wave 1 tools + Correct + Translate + Pack Maker + Stem Maker.
 * Unfinished modules (full Master suite, Instrument Creator, OR-021–022) stay out.
 */

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Coins,
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
  | "credits"
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

export const SUITE_APPS: readonly SuiteAppDef[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    icon: Home,
    match: (p) => p === "/" || p.startsWith("/u/") || p.startsWith("/profile"),
  },
  {
    id: "analyzer",
    label: "Analyzer",
    path: "/releases",
    icon: Waves,
    match: (p) =>
      p.startsWith("/releases") ||
      p.startsWith("/release/") ||
      p.startsWith("/start"),
  },
  {
    id: "metadata",
    label: "Metadata",
    path: "/tools/metadata",
    icon: Tags,
    match: (p) => p.startsWith("/tools/metadata"),
  },
  {
    id: "art-check",
    label: "Art Check",
    path: "/tools/art-check",
    icon: ImagePlus,
    match: (p) => p.startsWith("/tools/art-check"),
  },
  {
    id: "correct",
    label: "Correct",
    path: "/tools/correct",
    icon: SlidersHorizontal,
    match: (p) => p.startsWith("/tools/correct"),
  },
  {
    id: "translate",
    label: "Translate",
    path: "/tools/translate",
    icon: Radio,
    match: (p) => p.startsWith("/tools/translate"),
  },
  {
    id: "midi-maker",
    label: "Midi Maker",
    path: "/tools/midi",
    icon: Piano,
    match: (p) => p.startsWith("/tools/midi"),
    overflow: true,
  },
  {
    id: "media-converter",
    label: "Converter",
    path: "/tools/convert",
    icon: RefreshCw,
    match: (p) => p.startsWith("/tools/convert"),
    overflow: true,
  },
  {
    id: "pack-maker",
    label: "Packs",
    path: "/tools/pack-maker",
    icon: Package,
    match: (p) => p.startsWith("/tools/pack-maker"),
    overflow: true,
  },
  {
    id: "stem-maker",
    label: "Stems",
    path: "/tools/stems",
    icon: Layers,
    match: (p) => p.startsWith("/tools/stems"),
    overflow: true,
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
  },
  {
    id: "store",
    label: "Store",
    path: "/tools/packs",
    icon: Store,
    match: (p) => p.startsWith("/tools/packs") || p.startsWith("/pack/"),
    visible: () => FLAGS.storefront,
  },
  {
    id: "credits",
    label: "V¢",
    path: "/settings/credits",
    icon: Coins,
    match: (p) => p.startsWith("/settings/credits") || p.startsWith("/settings/costs") || p.startsWith("/store"),
    overflow: true,
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
  // Prefer the most specific match (longest path prefix among matches).
  let best: SuiteAppDef | null = null;
  for (const app of visibleSuiteApps()) {
    if (!app.match(pathname)) continue;
    if (!best || app.path.length > best.path.length) best = app;
  }
  // Home match is broad — prefer other apps when they match.
  if (best?.id === "home") {
    for (const app of visibleSuiteApps()) {
      if (app.id !== "home" && app.match(pathname)) return app.id;
    }
  }
  return best?.id ?? null;
}
