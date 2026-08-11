/**
 * OR-040 — in-memory stash for guest Landing drops until sign-in.
 * Session-only Blobs; refresh loses them (disclosed in UI). Never uploads unsigned-in.
 */

let stashed: File[] = [];

export function stashLandingDropFiles(files: File[]): void {
  if (!files.length) return;
  stashed = [...stashed, ...files];
}

export function peekLandingDropFiles(): readonly File[] {
  return stashed;
}

export function takeLandingDropFiles(): File[] {
  const out = stashed;
  stashed = [];
  return out;
}

/** Test seam. */
export function resetLandingDropStash(): void {
  stashed = [];
}
