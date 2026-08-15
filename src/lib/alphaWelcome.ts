/** Persist Alpha welcome tour completion per account (local only). */
export const ALPHA_WELCOME_VERSION = "v1";

export function alphaWelcomeStorageKey(userId: string): string {
  return `vybz.alphaWelcome.${ALPHA_WELCOME_VERSION}:${userId}`;
}

export function hasCompletedAlphaWelcome(userId: string): boolean {
  try {
    return localStorage.getItem(alphaWelcomeStorageKey(userId)) === "1";
  } catch {
    return true; /* fail closed — don't trap users if storage blocked */
  }
}

export function markAlphaWelcomeComplete(userId: string): void {
  try {
    localStorage.setItem(alphaWelcomeStorageKey(userId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * Tour copy. `{name}` is replaced with the artist name chosen in step 2, or with
 * "you" before it is set.
 *
 * Step 2 collects the name and cannot be skipped — it is the first thing a new
 * account does, and every surface refers to that name from then on.
 */
export const ALPHA_GUIDE_STEPS = [
  {
    id: "welcome",
    title: "Welcome to VYBZ Alpha Test!",
    body: "Thanks for helping us pressure-test the release suite. This is a short tour of what is live today.",
  },
  {
    id: "username",
    kind: "username",
    title: "What should we call you?",
    body: "Pick your artist or producer name. It is how everyone on VYBZ sees you — on your page, in rooms, and on anything you release.",
  },
  {
    id: "suite",
    title: "What is available now, {name}",
    body: "Use the app rail to jump between tools. These are ready for Alpha:",
    highlights: [
      { label: "Analyzer", blurb: "Drop masters, triage readiness, Tier A auto-fix" },
      { label: "Correct", blurb: "DC, peak safety, balance, silence trim + A/B" },
      { label: "Library", blurb: "Your catalog after you add tracks from Analyzer" },
      { label: "Stems", blurb: "Assemble exported stems into a pack" },
      { label: "Tools", blurb: "Metadata, Art Check, MIDI, Converter" },
    ],
  },
  {
    id: "feedback",
    title: "Tell us what breaks, {name}",
    body: "When you’re done here, look for the glowing bug button. Tap it anytime to send feedback — screenshots welcome.",
  },
] as const;

/** Substitute the chosen artist name into tour copy. */
export function withName(copy: string, username: string | null | undefined): string {
  return copy.replace(/\{name\}/g, username?.trim() ? username.trim() : "you");
}

/** Usernames are the public identity, so keep the shape strict and predictable. */
export const USERNAME_RE = /^[a-zA-Z0-9_.]{3,24}$/;

export function isValidUsername(raw: string): boolean {
  return USERNAME_RE.test(raw.trim());
}
