import { siteVisualUrl } from "@/lib/siteVisuals";
import { vdockVisual } from "@/lib/vdockVisualManifest";

/** Default film on the dock when the listener has not picked one. */
export const DEFAULT_VDOCK_VISUAL_ID = "synth-horizon";

/** Faded page atmosphere — a different loop so dock and backdrop are not twins. */
export const DEFAULT_BACKDROP_VISUAL_ID = "ember-drift";

export type ResolvedVdockVisual = {
  id: string;
  title: string;
  webm: string;
  mp4: string;
  poster: string;
};

/** Loops live on the site-visuals CDN in production; previews stay in the app. */
export function resolveVdockVisual(id: string | undefined | null): ResolvedVdockVisual | undefined {
  const v = vdockVisual(id);
  if (!v) return undefined;
  const local = import.meta.env.DEV || String(import.meta.env.VITE_SITE_VISUALS_BASE ?? "").toLowerCase() === "local";
  return {
    id: v.id,
    title: v.title,
    webm: local ? v.loopWebm : siteVisualUrl(v.loopWebm.replace(/^\//, "")),
    mp4: local ? v.loopMp4 : siteVisualUrl(v.loopMp4.replace(/^\//, "")),
    poster: v.previewUrl,
  };
}
