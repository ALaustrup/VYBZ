/**
 * Reads design token declarations out of the CSS so tests can assert that the
 * TypeScript mirror matches, and that no token is declared twice.
 *
 * Test-only helper. It parses text rather than a real CSSOM, which is enough for
 * the flat `--name: value;` declarations the token files use.
 */

export type TokenDeclaration = { name: string; value: string; file: string };

/** Custom property declarations, in source order. */
export function parseTokenDeclarations(css: string, file: string): TokenDeclaration[] {
  const out: TokenDeclaration[] = [];
  const re = /(--[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    out.push({ name: m[1]!, value: m[2]!.trim(), file });
  }
  return out;
}

/**
 * Token names declared in more than one file. A duplicate means whichever file
 * is emitted last silently wins, which is how the v2 shadow ramp was dead for
 * several releases.
 *
 * Declarations repeated inside one file are ignored: a media query legitimately
 * overrides a token for reduced motion or a wider viewport.
 */
export function findCrossFileDuplicates(
  declarations: TokenDeclaration[]
): Array<{ name: string; files: string[] }> {
  const byName = new Map<string, Set<string>>();
  for (const d of declarations) {
    const files = byName.get(d.name) ?? new Set<string>();
    files.add(d.file);
    byName.set(d.name, files);
  }
  return [...byName.entries()]
    .filter(([, files]) => files.size > 1)
    .map(([name, files]) => ({ name, files: [...files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** First declared value for a token, or null when it is not declared at all. */
export function tokenValue(declarations: TokenDeclaration[], name: string): string | null {
  return declarations.find((d) => d.name === name)?.value ?? null;
}

/** Parse a `120ms` / `0.24s` duration into milliseconds. */
export function durationToMs(value: string): number | null {
  const ms = /^([\d.]+)ms$/.exec(value.trim());
  if (ms) return Number(ms[1]);
  const s = /^([\d.]+)s$/.exec(value.trim());
  if (s) return Number(s[1]) * 1000;
  return null;
}

/** Every `var(--name)` reference inside a token mirror value. */
export function referencedVars(value: string): string[] {
  return [...value.matchAll(/var\((--[a-z0-9-]+)/gi)].map((m) => m[1]!);
}
