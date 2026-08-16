/**
 * Per–suite-app accent channels for M10 Wave R0 redesign.
 * Cool spectrum only — no purple / magenta SaaS takeover.
 * Values are "r g b" for `rgb(var(--app-accent-rgb) / a)`.
 */

import type { SuiteAppId } from "@/shell/suiteApps";

export const SUITE_APP_ACCENT_RGB: Record<SuiteAppId, string> = {
  home: "0 194 255", // command cyan
  "pack-pipeline": "20 184 166", // pack teal
  analyzer: "125 211 252", // ice / scan
  metadata: "56 189 248", // tool sky
  "art-check": "94 234 212", // mint check
  "midi-maker": "34 211 238", // note cyan
  "media-converter": "103 232 249", // convert ice
  correct: "45 212 191", // tool energy teal
  translate: "14 165 233", // steel cyan
  "pack-maker": "20 184 166", // pack teal
  "stem-maker": "6 182 212", // stem cyan
  library: "45 212 191", // catalog teal
  codex: "148 163 184", // quiet fog
  store: "34 211 238", // market cool (not purple)
  settings: "148 163 184", // quiet utility
};

export function suiteAppAccentRgb(id: SuiteAppId | null | undefined): string {
  if (!id) return SUITE_APP_ACCENT_RGB.home;
  return SUITE_APP_ACCENT_RGB[id] ?? SUITE_APP_ACCENT_RGB.home;
}
