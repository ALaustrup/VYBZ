/**
 * Intent Mix — soft pillar weights on one identity (Phase 6 / Concept F).
 * Never forks public personas; Focus only changes curation/chrome.
 */

import type { ProfileDetails } from "@/types";
import type { VDockLayout } from "@/lib/vdock/layout";

export type IntentPillar = "love" | "meetup" | "social" | "create";
export type FocusMode = "love" | "meetup" | "create" | "for_you";

export interface IntentMix {
  pillars: IntentPillar[];
  /** Normalized 0–1 weights; sum ≈ 1 when pillars non-empty. */
  weights: Record<IntentPillar, number>;
  focus: FocusMode;
  /** ISO timestamp when soft intake finished or was skipped. */
  completedAt?: string;
  /** User explicitly expanded Create facets in profile edit. */
  createExpanded?: boolean;
}

export const INTENT_PILLARS: { id: IntentPillar; label: string; blurb: string }[] = [
  { id: "create", label: "Music & create", blurb: "Upload, collab, share catalog" },
  { id: "social", label: "Fans & friends", blurb: "Chat, follow, listen together" },
];

export const FOCUS_OPTIONS: { id: FocusMode; label: string }[] = [
  { id: "for_you", label: "For you" },
  { id: "create", label: "Create" },
];

const EMPTY_WEIGHTS: Record<IntentPillar, number> = {
  love: 0, meetup: 0, social: 0, create: 0,
};

export function emptyIntentMix(): IntentMix {
  return {
    pillars: [],
    weights: { ...EMPTY_WEIGHTS },
    focus: "for_you",
  };
}

/** Build equal weights across selected pillars (or explore defaults). */
export function mixFromPillars(pillars: IntentPillar[], focus?: FocusMode): IntentMix {
  const unique = [...new Set(pillars)];
  const weights = { ...EMPTY_WEIGHTS };
  if (unique.length === 0) {
    // Soft explore: music-first — create + social (not dating-first).
    weights.create = 0.55;
    weights.social = 0.3;
    weights.meetup = 0.15;
    return {
      pillars: [],
      weights,
      focus: focus ?? "for_you",
      completedAt: new Date().toISOString(),
    };
  }
  const w = 1 / unique.length;
  for (const p of unique) weights[p] = w;
  const inferredFocus: FocusMode =
    focus ??
    (unique.includes("create") && unique.length === 1 ? "create"
      : unique.includes("meetup") && !unique.includes("love") && unique.length === 1 ? "meetup"
      : unique.includes("love") && unique.length === 1 ? "love"
        : "for_you");
  return {
    pillars: unique,
    weights,
    focus: inferredFocus,
    completedAt: new Date().toISOString(),
  };
}

export function resolveIntentMix(details?: ProfileDetails | null): IntentMix {
  const raw = details?.intentMix;
  if (raw?.completedAt && raw.weights) {
    return {
      pillars: raw.pillars ?? [],
      weights: { ...EMPTY_WEIGHTS, ...raw.weights },
      focus: raw.focus ?? "for_you",
      completedAt: raw.completedAt,
      createExpanded: !!raw.createExpanded,
    };
  }
  // Soft seed from existing lookingFor / meetup / create signals (existing users).
  const pillars: IntentPillar[] = [];
  const lf = (details?.lookingFor ?? []).map((s) => s.toLowerCase());
  if (lf.some((s) => s.includes("friend"))) pillars.push("social");
  if (
    (details?.genres?.length ?? 0) > 0
    || (details?.daws?.length ?? 0) > 0
    || details?.profession
    || (details?.intents?.length ?? 0) > 0
  ) {
    pillars.push("create");
  }
  if (pillars.length === 0 && (details?.role || details?.roleLabel)) {
    // Legacy craft onboarding — treat as create-leaning without locking them there.
    pillars.push("create", "social");
  }
  const mix = mixFromPillars(pillars);
  if (details?.role || details?.roleLabel) {
    mix.completedAt = mix.completedAt ?? new Date().toISOString();
  }
  return mix;
}

export function needsIntentMixIntake(details?: ProfileDetails | null): boolean {
  if (details?.intentMix?.completedAt) return false;
  // Legacy users with role already onboarded — skip forced intake.
  if (details?.role || details?.roleLabel) return false;
  // Music Hub: genres / DAWs already set ⇒ treat as onboarded (create-leaning).
  if ((details?.genres?.length ?? 0) > 0 || (details?.daws?.length ?? 0) > 0) return false;
  return true;
}

/** Show Create facets (DAWs, genres, plugins) when Create is in the mix or expanded. */
export function showCreateFacets(details?: ProfileDetails | null): boolean {
  const mix = resolveIntentMix(details);
  if (mix.createExpanded) return true;
  if (mix.pillars.includes("create")) return true;
  if ((mix.weights.create ?? 0) >= 0.2) return true;
  return false;
}

export function lookingForFromPillars(pillars: IntentPillar[]): string[] {
  const out: string[] = [];
  if (pillars.includes("social")) out.push("Friendship");
  if (pillars.includes("create")) out.push("Collaborator", "Creative collab");
  return [...new Set(out)].slice(0, 8);
}

/**
 * Minimal day-one dock from Intent Mix (≤5 items total).
 * Customize Dock remains available for power users.
 */
export function defaultLayoutForIntentMix(mix: IntentMix): VDockLayout {
  const createHeavy = (mix.weights.create ?? 0) >= 0.45 || (mix.pillars.length === 1 && mix.pillars[0] === "create");
  const left: VDockLayout["left"] = [
    { kind: "pin", id: "feed" },
    createHeavy ? { kind: "pin", id: "connect" } : { kind: "pin", id: "live" },
  ];
  if (createHeavy) {
    left.push({ kind: "pin", id: "collabs" });
  }
  const right: VDockLayout["right"] = [
    { kind: "pin", id: "messages" },
    { kind: "pin", id: "profile" },
  ];
  return { left, right };
}

const DOCK_SEED_KEY = "vybz.vdockIntentSeeded";

/** Seed dock once per browser when Intent Mix completes (won't clobber Customize). */
export function applyDockSeed(mix: IntentMix, setLayout: (l: VDockLayout) => void): void {
  try {
    if (localStorage.getItem(DOCK_SEED_KEY) === "1") return;
    const raw = localStorage.getItem("vybz.vdockLayout");
    if (raw) {
      const o = JSON.parse(raw) as { left?: unknown[]; right?: unknown[] };
      const n = (o.left?.length ?? 0) + (o.right?.length ?? 0);
      if (n > 5) {
        localStorage.setItem(DOCK_SEED_KEY, "1");
        return;
      }
    }
    setLayout(defaultLayoutForIntentMix(mix));
    localStorage.setItem(DOCK_SEED_KEY, "1");
  } catch { /* ignore */ }
}

export function dominantPillar(mix: IntentMix): IntentPillar | "mixed" {
  const entries = (Object.entries(mix.weights) as [IntentPillar, number][])
    .sort((a, b) => b[1] - a[1]);
  if (!entries[0] || entries[0][1] < 0.15) return "mixed";
  if (entries[1] && entries[1][1] >= entries[0][1] - 0.08) return "mixed";
  return entries[0][0];
}

/** Ensure Intent Mix (Focus/weights) never appears on public_profile. */
export function sealIntentMixPrivacy(details: ProfileDetails): ProfileDetails {
  const prev = details._hidden ?? [];
  if (prev.includes("intentMix")) return details;
  return { ...details, _hidden: [...prev, "intentMix"] };
}
