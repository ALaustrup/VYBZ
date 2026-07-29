/** Slug helpers for storefront packs. */

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "pack";
}

export function uniqueSlug(title: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slugifyTitle(title)}-${suffix}`;
}
