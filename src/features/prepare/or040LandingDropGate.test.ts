/**
 * OR-040 Landing drag-drop → song workspace gate.
 * Guest Landing stashes only (no unsigned upload); signed-in LibraryDropHost
 * seeds working set with source landing|library after measured createDrop.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-040 Landing drop → song workspace", () => {
  it("Landing stashes audio without creating Library rows unsigned-in", () => {
    const landing = read("src/pages/LandingPage.tsx");
    const stash = read("src/features/workspace/landingDropStash.ts");
    expect(landing).toContain("stashLandingDropFiles");
    expect(landing).toContain('data-testid="landing-drop-zone"');
    expect(landing).toMatch(/No upload until you sign in|no cloud upload while signed out/i);
    expect(landing).not.toContain("createDrop");
    expect(landing).not.toContain("uploadAudio");
    expect(stash).toContain("takeLandingDropFiles");
  });

  it("LibraryDropHost drains stash and seeds working set after ingest", () => {
    const host = read("src/components/LibraryDropHost.tsx");
    expect(host).toContain("takeLandingDropFiles");
    expect(host).toContain("seedWorkingTrackFromFile");
    expect(host).toContain('"landing"');
    expect(host).toContain("data-no-library-drop");
    expect(host).toMatch(/song workspace/i);
  });

  it("banner still labels landing source", () => {
    const banner = read("src/features/workspace/SongWorkspaceBanner.tsx");
    expect(banner).toContain("landing:");
    expect(banner).toContain('data-working-source={track.source}');
  });

  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("or040LandingDrop");
  });
});
