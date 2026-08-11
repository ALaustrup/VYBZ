/**
 * Pre-login featured Helix mini-player + guest audio-play allowlist.
 * Cites Suite UX / owner auth UX fix (Vibes Radio was covering login controls).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEATURED_SIGNIN_TRACK,
  GUEST_FEATURED_ASSET_PATHS,
} from "@/features/featured/featuredTracks";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("pre-login featured mini-player", () => {
  it("curates Helix with measured asset path for guest mint allowlist", () => {
    expect(FEATURED_SIGNIN_TRACK.title).toBe("Helix");
    expect(FEATURED_SIGNIN_TRACK.artist).toBe("CYB3RNOM4D");
    expect(FEATURED_SIGNIN_TRACK.assetPath).toContain("/drops/");
    expect(FEATURED_SIGNIN_TRACK.durationSec).toBeGreaterThan(500);
    expect(GUEST_FEATURED_ASSET_PATHS).toContain(FEATURED_SIGNIN_TRACK.assetPath);
  });

  it("audio-play edge allowlists the same guest featured path", () => {
    const edge = read("supabase/functions/audio-play/index.ts");
    expect(edge).toContain("guestFeatured");
    expect(edge).toContain(FEATURED_SIGNIN_TRACK.assetPath);
    expect(edge).toContain("GUEST_FEATURED_PATHS");
  });

  // The owner asked for the brand to stop reacting to audio (2026-08-11). The
  // capability stays in the tree behind an opt-in prop; nothing turns it on.
  it("keeps the VYBZ mark and wordmark still by default", () => {
    const brand = read("src/components/Brand.tsx");
    const word = read("src/components/shell/AppBarWordmark.tsx");
    expect(brand).toMatch(/reactive\s*=\s*false/);
    expect(word).toMatch(/reactive\s*=\s*false/);
    // No brand element may pass the opt-in prop.
    const optIn = /<(?:BrandMark|BrandLockup|AppBarWordmark)[^>]*\breactive\b/;
    for (const rel of [
      "src/components/AuthShell.tsx",
      "src/components/landing/LandingLogo.tsx",
      "src/components/shell/ContextualAppBar.tsx",
      "src/App.tsx",
      "src/pages/CodexPage.tsx",
      "src/features/prepare/PrepareLocalApp.tsx",
    ]) {
      expect(read(rel)).not.toMatch(optIn);
    }
  });
});
