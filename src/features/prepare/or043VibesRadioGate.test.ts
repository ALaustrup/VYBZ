/**
 * OR-043 Vibes Radio gate — synchronized global broadcast.
 * Audio beds from public/CDN only; edge function is logic-only (&lt;1 MB).
 * Guests never scheduled track 1 (greeting); landing hosts guest audience.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-043 Vibes Radio sync", () => {
  it("ships measured station beds under public/audio (not in the edge bundle)", () => {
    const beds = read("src/features/radio/stationBeds.ts");
    expect(beds).toContain('path: "/audio/1.wav"');
    expect(beds).toContain('path: "/audio/2.wav"');
    expect(beds).toContain("durationSec: 9.125");
    expect(beds).toContain("durationSec: 7.875");
    expect(beds).toContain("You're what's next");
    expect(beds).toContain("Hear something new");

    const one = path.join(ROOT, "public/audio/1.wav");
    const two = path.join(ROOT, "public/audio/2.wav");
    expect(existsSync(one)).toBe(true);
    expect(existsSync(two)).toBe(true);
    // Sanity: WAV masters present and non-trivial; not embedded in edge.
    expect(statSync(one).size).toBeGreaterThan(100_000);
    expect(statSync(two).size).toBeGreaterThan(100_000);

    const edge = read("supabase/functions/vibes-radio/index.ts");
    expect(edge).toContain("/audio/1.wav");
    expect(edge).toContain("/audio/2.wav");
    expect(edge).not.toMatch(/RIFF|Uint8Array\(\s*\d{5,}/);
    expect(statSync(path.join(ROOT, "supabase/functions/vibes-radio/index.ts")).size).toBeLessThan(1_000_000);
  });

  it("adds vibes_radio migration with broadcast clock + queue + pool", () => {
    const up = read("supabase/migrations/20260811_0093_vibes_radio.sql");
    expect(up).toContain("vibes_radio_broadcast");
    expect(up).toContain("started_at");
    expect(up).toContain("vibes_radio_queue");
    expect(up).toContain("vibes_radio_pool");
    expect(existsSync(path.join(ROOT, "supabase/migrations/20260811_0093_vibes_radio.down.sql"))).toBe(
      true,
    );
  });

  it("keeps Vibes Radio member host in suite; pre-login uses featured mini-player instead", () => {
    const landing = read("src/pages/LandingPage.tsx");
    const auth = read("src/components/AuthShell.tsx");
    const app = read("src/App.tsx");
    const featured = read("src/features/featured/featuredTracks.ts");
    // Pre-login: no Vibes Radio overlay on invite / auth controls.
    expect(landing).not.toContain("VibesRadioHost");
    expect(landing).not.toContain("VibesRadioNowPlaying");
    expect(landing).toContain("FeaturedMiniPlayer");
    expect(auth).not.toContain("VibesRadioHost");
    expect(auth).not.toContain("VibesRadioNowPlaying");
    expect(auth).toContain("FeaturedMiniPlayer");
    expect(featured).toContain("Helix");
    expect(featured).toContain("CYB3RNOM4D");
    // Signed-in suite still hosts synchronized Vibes Radio.
    expect(app).toContain("VibesRadioHost");
    expect(app).toContain('audience="member"');
    expect(app).not.toContain("AmbientRadioHost");
  });

  it("exposes Add to Vibes Radio in track actions", () => {
    const actions = read("src/lib/trackActions.ts");
    const menu = read("src/components/TrackActionMenu.tsx");
    expect(actions).toContain("Add to Vibes Radio");
    expect(actions).toContain("addToVibesRadio");
    expect(menu).toContain("optInToVibesRadio");
  });

  it("interstitial is only a bumper before queued tracks — never empty-queue filler", () => {
    const edge = read("supabase/functions/vibes-radio/index.ts");
    expect(edge).toContain("enqueueUserTrackWithInterstitial");
    expect(edge).toContain("Do not loop \"Hear something new\"");
    expect(edge).toContain("never pad with interstitial-only rows");
    // Old filler: enqueue INTERSTITIAL when pool is empty / as sole advance fallback.
    expect(edge).not.toMatch(/if \(!next\) \{\s*const bed = await enqueue\(\{ \.\.\.INTERSTITIAL/);
    expect(edge).toContain("hasFollowingTrack");
  });

  it("authorises OR-043 in AGENTS", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("OR-043");
    expect(agents).toContain("vibes-radio");
  });
});
