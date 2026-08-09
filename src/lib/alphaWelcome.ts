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

/** Brief tour copy — audio-suite focus (Law 3: no social growth pitch). */
export const ALPHA_GUIDE_STEPS = [
  {
    id: "welcome",
    title: "Welcome to VYBZ Alpha Test!",
    body: "Thanks for helping us pressure-test the release suite. This is a short tour of what is live today.",
  },
  {
    id: "suite",
    title: "What is available now",
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
    title: "Tell us what breaks",
    body: "When you’re done here, look for the glowing bug button. Tap it anytime to send feedback — screenshots welcome.",
  },
] as const;
