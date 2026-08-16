/**
 * Tempo and key out of a filename.
 *
 * Sample packs put them there — `CS BASSLOOP 01 F 174`, `OPTCL MORPHBASS 170` —
 * and the convention is far more reliable than analysing a five-second loop.
 * Measured on a 43-file pack: detection got the tempo wrong on every single
 * loop labelled 174, returning values from 77 to 156. The filename was right
 * every time.
 *
 * Nothing here infers. A name that does not say something yields null.
 */

/** Below this, a bare number is a track index; above it, nobody counts in BPM. */
const MIN_BPM = 60;
const MAX_BPM = 200;

/** Canonical root spellings → the label used in `MUSICAL_KEYS`. */
const ROOTS: Record<string, string> = {
  C: "C", "B#": "C",
  "C#": "C# / Db", DB: "C# / Db",
  D: "D",
  "D#": "D# / Eb", EB: "D# / Eb",
  E: "E", FB: "E",
  F: "F", "E#": "F",
  "F#": "F# / Gb", GB: "F# / Gb",
  G: "G",
  "G#": "G# / Ab", AB: "G# / Ab",
  A: "A",
  "A#": "A# / Bb", BB: "A# / Bb",
  B: "B", CB: "B",
};

export interface FilenameHints {
  bpm: number | null;
  /** A `MUSICAL_KEYS` label, or null when the name did not state a mode. */
  musicalKey: string | null;
}

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, "");
}

/**
 * The tempo, when the name states one.
 *
 * Takes the last standalone number in range: packs put the tempo at the end,
 * after indices like `01`. A number welded to letters (`X64`, `REPRO-1`) is a
 * product name, not a tempo, so only whole tokens count.
 */
export function bpmFromFilename(name: string): number | null {
  const base = stripExtension(name);
  const re = /(?:^|[\s\-_[\]()])(\d{2,3})(?=$|[\s\-_[\]()])/g;
  let found: number | null = null;
  for (const m of base.matchAll(re)) {
    const n = Number(m[1]);
    if (n >= MIN_BPM && n <= MAX_BPM) found = n;
  }
  return found;
}

/**
 * The key, when the name states root *and* mode.
 *
 * A bare root is deliberately not enough. Every key this app can store carries
 * a mode, so turning `F` into "F major" would be inventing the half of the
 * answer the filename never gave. Two different roots in one name is likewise
 * an unanswered question rather than a reason to pick one.
 */
export function keyFromFilename(name: string): string | null {
  const base = stripExtension(name);
  const re = /(?:^|[\s\-_[\]()])([A-Ga-g])([#b]?)(maj|major|min|minor|m)?(?=$|[\s\-_[\]()0-9])/g;
  const hits: Array<{ root: string; mode: "major" | "minor" | null }> = [];
  for (const m of base.matchAll(re)) {
    const rootKey = (m[1] + (m[2] ?? "")).toUpperCase();
    const root = ROOTS[rootKey];
    if (!root) continue;
    const raw = (m[3] ?? "").toLowerCase();
    const mode = raw.startsWith("maj") ? "major" : raw ? "minor" : null;
    hits.push({ root, mode });
  }
  if (!hits.length) return null;

  // Prefer a hit that stated its mode; that is the only kind we can use.
  const stated = hits.filter((h) => h.mode);
  if (!stated.length) return null;
  const roots = new Set(stated.map((h) => `${h.root} ${h.mode}`));
  if (roots.size !== 1) return null;
  return [...roots][0]!;
}

export function hintsFromFilename(name: string): FilenameHints {
  return { bpm: bpmFromFilename(name), musicalKey: keyFromFilename(name) };
}
