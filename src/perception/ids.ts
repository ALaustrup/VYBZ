/**
 * Deterministic, human-readable observation IDs — not finding-42.
 * Format: {surface}.{slug} (lowercase, dotted; slug kebab-case).
 */

const SURFACE_RE = /^[a-z][a-z0-9-]*$/;
const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const OBS_ID_RE = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

export function normalizeSegment(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_\s.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function mintObservationId(input: { surface: string; slug: string }): string {
  const surface = normalizeSegment(input.surface);
  const slug = normalizeSegment(input.slug);
  if (!SURFACE_RE.test(surface)) {
    throw new Error(`Invalid observation surface: ${input.surface}`);
  }
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Invalid observation slug: ${input.slug}`);
  }
  return `${surface}.${slug}`;
}

export function isObservationId(id: string): boolean {
  return OBS_ID_RE.test(id);
}

export function mintEdgeId(input: {
  from: string;
  to: string;
  relation: string;
}): string {
  const from = normalizeSegment(input.from.replace(/\./g, "-"));
  const to = normalizeSegment(input.to.replace(/\./g, "-"));
  const relation = normalizeSegment(input.relation);
  if (!from || !to || !relation) {
    throw new Error("Edge id requires from, to, and relation");
  }
  return `edge.${from}.${relation}.${to}`;
}
