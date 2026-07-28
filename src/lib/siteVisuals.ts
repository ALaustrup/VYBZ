/**
 * Encoded site visuals (backdrop + VDock loops).
 * Served from the public Supabase bucket `site-visuals` after
 * `npm run visuals:upload`. Override with `VITE_SITE_VISUALS_BASE`:
 *   - omit / empty → Storage CDN (production default)
 *   - `local` → `/public` paths (offline encode loop)
 *   - any https URL → custom CDN base
 */

const STORAGE_BASE =
  "https://xixmneooyufbeftdfpcm.supabase.co/storage/v1/object/public/site-visuals";

function visualsBase(): string | null {
  const raw = (import.meta.env.VITE_SITE_VISUALS_BASE as string | undefined)?.trim();
  if (raw === "local" || raw === "/") return null;
  if (raw) return raw.replace(/\/$/, "");
  return STORAGE_BASE;
}

/** Resolve a path like `backdrop/main.webm` or `vdock/visuals/.../loop.webm`. */
export function siteVisualUrl(path: string): string {
  const rel = path.replace(/^\//, "");
  const base = visualsBase();
  if (!base) return `/${rel}`;
  return `${base}/${rel}`;
}

export const SITE_VISUALS_STORAGE_BASE = STORAGE_BASE;
