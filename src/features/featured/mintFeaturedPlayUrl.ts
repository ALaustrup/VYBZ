import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

/**
 * Mint a guest-safe stream URL for a curated featured asset (no session).
 * Requires `audio-play` edge with `guestFeatured` allowlist deployed.
 */
export async function mintFeaturedPlayUrl(assetPath: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !assetPath) return null;
  if (/^(https?:|blob:|data:)/i.test(assetPath)) return assetPath;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/audio-play`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({ paths: [assetPath], guestFeatured: true }),
  });
  if (!res.ok) {
    console.warn("[featured] mint failed", res.status);
    return null;
  }
  const j = (await res.json().catch(() => null)) as { urls?: Record<string, string> } | null;
  const url = j?.urls?.[assetPath];
  return typeof url === "string" && url ? url : null;
}
