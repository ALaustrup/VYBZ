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

  it("defaults BrandMark + AppBarWordmark to audio-reactive", () => {
    const brand = read("src/components/Brand.tsx");
    const word = read("src/components/shell/AppBarWordmark.tsx");
    expect(brand).toMatch(/reactive\s*=\s*true/);
    expect(word).toMatch(/reactive\s*=\s*true/);
    expect(read("src/components/AuthShell.tsx")).toContain("<BrandMark");
    expect(read("src/components/AuthShell.tsx")).toMatch(/reactive/);
    expect(read("src/components/landing/LandingLogo.tsx")).toMatch(/reactive/);
  });
});
