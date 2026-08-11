/**
 * OR-041 DAW project folder link gate.
 * Optional local session link tied to the song workspace track — no Ableton sync claims.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dawHintLabel } from "@/features/workspace/dawFolderLink";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-041 DAW project folder link", () => {
  it("ships optional local folder link on workspace + track overview", () => {
    const link = read("src/features/workspace/dawFolderLink.ts");
    const ws = read("src/features/workspace/workingSet.ts");
    const banner = read("src/features/workspace/SongWorkspaceBanner.tsx");
    const track = read("src/pages/TrackDetailPage.tsx");
    expect(link).toContain("inspectDirectoryHandle");
    expect(link).toContain("detectDaw");
    expect(link).toMatch(/never claim Ableton sync|not Ableton sync/i);
    expect(ws).toContain("dawFolder");
    expect(ws).toContain("setWorkingTrackDawFolder");
    expect(banner).toContain('data-testid="song-workspace-daw-link"');
    expect(banner).toMatch(/not synced/i);
    expect(track).toContain('data-testid="track-daw-folder"');
    expect(track).toMatch(/Not available|not sync/i);
  });

  it("forbids sync / live-session / bit-perfect claims in OR-041 surfaces", () => {
    const banner = read("src/features/workspace/SongWorkspaceBanner.tsx");
    const link = read("src/features/workspace/dawFolderLink.ts");
    for (const src of [banner, link]) {
      expect(src).not.toMatch(/Ableton synced|live Ableton session|bit-perfect|auto-save from Live/i);
    }
    expect(dawHintLabel("ableton")).not.toMatch(/sync/i);
  });

  it("authorises OR-041 gate in AGENTS", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("OR-041");
    expect(agents).toContain("or041DawFolderLinkGate");
  });
});
