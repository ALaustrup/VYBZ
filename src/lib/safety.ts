// Lightweight, on-device crisis detection. This is deliberately conservative —
// it surfaces a supportive help banner, it never blocks or reports a user. The
// goal is care, not surveillance.

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+(myself|me)\b/,
  /\bsuicid/,
  /\bwant(ing)?\s+to\s+die\b/,
  /\bend(ing)?\s+(it all|my life|myself)\b/,
  /\bself[-\s]?harm/,
  /\bcut(ting)?\s+myself\b/,
  /\bharm(ing)?\s+myself\b/,
  /\bno\s+reason\s+to\s+live\b/,
  /\bbetter\s+off\s+dead\b/,
  /\boverdose\b/,
  /\bdon'?t\s+want\s+to\s+(live|be here|exist)\b/,
];

export function detectsCrisis(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_PATTERNS.some((re) => re.test(t));
}

export const CRISIS_RESOURCES = {
  // US 988 Suicide & Crisis Lifeline (call or text).
  callHref: "tel:988",
  // International directory.
  findHelpHref: "https://findahelpline.com",
};
