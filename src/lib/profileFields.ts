// ---------------------------------------------------------------------------
// Profile data points — the declarative catalog of "bits of info" a user can
// share. This is the single source of truth for BOTH the profile editor UI and
// the matchmaking engine, so every new signal we collect automatically becomes
// a personalization input and a compatibility input.
//
// Privacy is per top-level key (see ProfileDetails.hidden). Everything is
// public by default; a user can mark any section private. Private sections are
// stripped server-side from the public profile, yet still quietly improve the
// owner's own matches (the matcher runs SECURITY DEFINER and only emits the
// aggregate overlap, never the raw private value).
// ---------------------------------------------------------------------------

import type { ProfileDetails } from "@/types";

export interface ChoiceField {
  /** Top-level key in ProfileDetails (also the privacy unit). */
  key: keyof ProfileDetails & string;
  label: string;
  hint?: string;
  /** Whether this field accepts many values (chips) or a single choice. */
  multi: boolean;
  /** Whether overlap on this field feeds the compatibility score. */
  matchable: boolean;
  options: string[];
}

/**
 * INTERESTS — the strongest declared compatibility signal. Curated, broad, and
 * globally legible so overlap is meaningful across cultures.
 */
export const INTERESTS: string[] = [
  "Music", "Live shows", "Vinyl", "Producing", "Gaming", "Anime", "Film",
  "Photography", "Art", "Design", "Writing", "Poetry", "Reading", "Coffee",
  "Cooking", "Baking", "Foodie", "Travel", "Hiking", "Camping", "Climbing",
  "Running", "Gym", "Yoga", "Dance", "Skating", "Surfing", "Cycling",
  "Football", "Basketball", "Fashion", "Thrifting", "Makeup", "Tattoos",
  "Plants", "Pets", "Dogs", "Cats", "Astrology", "Spirituality", "Meditation",
  "Activism", "Volunteering", "Entrepreneurship", "Investing", "Crypto",
  "Coding", "AI", "Science", "Space", "History", "Philosophy", "Languages",
  "Board games", "Cars", "Motorcycles", "Festivals", "Nightlife", "Comedy",
];

/** Single-choice fields. Each is matchable so overlap nudges affinity. */
export const CHOICE_FIELDS: ChoiceField[] = [
  {
    key: "lookingFor",
    label: "Looking for",
    hint: "What brings you here — drives who you're shown.",
    multi: true,
    matchable: true,
    options: ["Friendship", "Dating", "A relationship", "Something casual", "Networking", "Just vibing"],
  },
  {
    key: "languages",
    label: "Languages",
    hint: "Helps surface people you can actually talk to.",
    multi: true,
    matchable: true,
    options: ["English", "Español", "Français", "Deutsch", "Português", "Italiano", "العربية", "中文", "日本語", "한국어", "हिन्दी", "Русский", "Türkçe", "Nederlands"],
  },
];

/** Free-text personality prompts — the human, unsearchable spark. */
export const PROMPTS: string[] = [
  "The way to win me over is…",
  "A secret I'm finally okay sharing…",
  "I'm weirdly passionate about…",
  "My most controversial (harmless) opinion…",
  "We'll get along if…",
  "Two truths and a lie…",
  "I geek out about…",
  "The last thing that made me laugh…",
];

/** Single-select lifestyle/personality traits (matchable, lightweight). */
export interface TraitField {
  key: string;
  label: string;
  options: string[];
}

export const TRAITS: TraitField[] = [
  { key: "energy", label: "Social energy", options: ["Introvert", "Ambivert", "Extrovert"] },
  { key: "schedule", label: "I'm most alive", options: ["Early bird", "Daytime", "Night owl"] },
  { key: "communication", label: "I text", options: ["Constantly", "When I can", "Rarely — call me"] },
  { key: "drinking", label: "Drinking", options: ["Never", "Socially", "Often"] },
  { key: "smoking", label: "Smoking", options: ["Never", "Sometimes", "Often"] },
];

export const MAX_INTERESTS = 12;
export const MAX_PROMPTS = 3;
export const MAX_BIO = 280;

/** Default empty details object. */
export const EMPTY_DETAILS: ProfileDetails = {};

/** Whether a top-level section is currently marked private. */
export function isHidden(details: ProfileDetails, key: string): boolean {
  return (details.hidden ?? []).includes(key);
}

/** Toggle a section's private flag, returning a new details object. */
export function toggleHidden(details: ProfileDetails, key: string): ProfileDetails {
  const hidden = new Set(details.hidden ?? []);
  if (hidden.has(key)) hidden.delete(key);
  else hidden.add(key);
  return { ...details, hidden: [...hidden] };
}

/** Count how many sections the user has filled in (drives the completeness meter). */
export function completeness(details: ProfileDetails): number {
  let filled = 0;
  const total = 7;
  if (details.bio?.trim()) filled++;
  if (details.interests?.length) filled++;
  if (details.lookingFor?.length) filled++;
  if (details.languages?.length) filled++;
  if (details.prompts?.some((p) => p.a.trim())) filled++;
  if (details.traits && Object.keys(details.traits).length) filled++;
  if (details.pronouns?.trim()) filled++;
  return Math.round((filled / total) * 100);
}

/** Local interest-overlap percentage between two users (for previews). */
export function interestMatch(a: string[] = [], b: string[] = []): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const shared = a.filter((x) => setB.has(x.toLowerCase())).length;
  const union = new Set([...a, ...b].map((x) => x.toLowerCase())).size;
  return union ? Math.round((shared / union) * 100) : 0;
}
