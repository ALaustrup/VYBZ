// Username identity helpers. Usernames are 1–3 words, letters only, single
// spaces between words, case-insensitive-unique. Guests get a generated
// "Color Animal" name they can't change; members claim their own.

const COLORS = [
  "Green", "Blue", "Violet", "Teal", "Amber", "Crimson", "Indigo", "Coral",
  "Jade", "Scarlet", "Azure", "Golden", "Silver", "Cobalt", "Ruby", "Mint",
  "Onyx", "Pearl", "Rose", "Aqua", "Lunar", "Solar", "Neon", "Frost",
];
const ANIMALS = [
  "Panda", "Falcon", "Otter", "Fox", "Wolf", "Lynx", "Heron", "Raven",
  "Tiger", "Cobra", "Gecko", "Bison", "Moth", "Koala", "Hawk", "Orca",
  "Lemur", "Badger", "Stag", "Owl", "Crane", "Viper", "Puma", "Finch",
  "Comet", "Prism", "Nimbus", "Echo", "Cipher", "Pixel",
];

/** A friendly random "Color Animal" username (e.g., "Green Panda"). */
export function randomUsername(): string {
  const c = COLORS[Math.floor(Math.random() * COLORS.length)];
  const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${c} ${a}`;
}

const USERNAME_RE = /^[A-Za-z]+(?: [A-Za-z]+){0,2}$/;

/** Validate a chosen username: 1–3 words, letters only, ≤24 chars. */
export function isValidUsername(name: string): boolean {
  const n = name.trim();
  return n.length >= 2 && n.length <= 24 && USERNAME_RE.test(n);
}

/** Collapse internal whitespace; trim. */
export function normalizeUsername(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
