/**
 * Site-wide looping backdrop — encoded from `vizualz/backdrop/main.*`
 * via `npm run visuals:encode` → `public/backdrop/` (local) and the
 * public Supabase bucket `site-visuals` (production).
 */
import { siteVisualUrl } from "@/lib/siteVisuals";

export const SITE_BACKDROP = {
  webm: siteVisualUrl("backdrop/main.webm"),
  mp4: siteVisualUrl("backdrop/main.mp4"),
  poster: siteVisualUrl("backdrop/poster.webp"),
} as const;
