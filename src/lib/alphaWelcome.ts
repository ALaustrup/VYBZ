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
 * Tour copy. `{name}` is replaced with the name chosen in step 2, or with
 * "you" before it is set.
 *
 * Step 2 collects the name and cannot be skipped. Step 3 is account security
 * (passkey or password) so a new key-generated account can get back in.
 */
export const ALPHA_GUIDE_STEPS = [
  {
    id: "welcome",
    title: "Welcome to VYBZ",
    body: "A short look at what's here.",
  },
  {
    id: "username",
    kind: "username",
    title: "What should we call you?",
    body: "This name shows on your stage and in the room.",
  },
  {
    id: "security",
    kind: "security",
    title: "How you get back in, {name}",
    body: "Set a passkey or a password now. This email is not checked — a typo means you cannot recover.",
  },
  {
    id: "suite",
    title: "Who's on, {name}",
    body: "Live is the front door. Listening is free.",
    highlights: [
      { label: "Live", blurb: "Who's on right now. Go live when you have Airtime." },
      { label: "Library", blurb: "Your files." },
      { label: "Make pack", blurb: "Build something from a session." },
      { label: "Scan", blurb: "Drop files. We measure them." },
    ],
  },
  {
    id: "feedback",
    title: "Tell us what breaks, {name}",
    body: "Hit the bug button. Screenshots help.",
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
