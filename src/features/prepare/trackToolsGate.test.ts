/**
 * Track tools gate — a desk runs on a track you already have.
 *
 * The tax this removes: every desk used to ask you to drag in a file the system
 * was already holding. So desks leave navigation and are summoned from the
 * track instead, and the rules that keep that honest are: the desk works on the
 * master rather than a watermarked copy, every desk the menu offers can
 * actually receive a track, and nothing was deleted to achieve it.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import { SUITE_APPS, visibleSuiteApps } from "@/shell/suiteApps";
import { TRACK_TOOLS } from "@/lib/trackActions";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

/** Strip comments, so documenting a rule cannot break the test enforcing it. */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)(--|\/\/).*$/, ""))
    .join("\n");
}

/** Every desk page reachable from the track menu. */
const DESK_PAGES = [
  "src/features/correction/CorrectPage.tsx",
  "src/features/translation/TranslationLabPage.tsx",
  "src/features/tools/MetadataEditorPage.tsx",
  "src/features/tools/MediaConverterPage.tsx",
  "src/features/tools/MidiMakerPage.tsx",
  "src/features/stems/StemMakerPage.tsx",
];

/** Ids that left navigation. Their routes and files must survive. */
const HIDDEN_DESKS = [
  "analyzer", "metadata", "art-check", "correct", "translate",
  "midi-maker", "media-converter", "pack-maker", "stem-maker", "codex",
];

describe("trackTools", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("trackTools");
  });

  it("hands the desk the master, never a watermarked copy", () => {
    // downloadAsset can apply a forensic watermark. A correction or analysis
    // desk run on that would be measuring the watermark, and reporting the
    // result as the track's would be a fabricated measurement.
    const loader = code("src/features/workspace/loadLibraryTrack.ts");
    expect(loader).not.toMatch(/downloadAsset/);
  });

  it("marks where the audio came from, so a desk can tell", () => {
    expect(code("src/features/workspace/loadLibraryTrack.ts")).toMatch(/source: "library"/);
  });

  it("offers no desk that cannot receive a track", () => {
    expect(TRACK_TOOLS.length).toBeGreaterThan(0);
    for (const page of DESK_PAGES) {
      expect(code(page), page).toMatch(/useWorkingTrack/);
    }
  });

  it("points every menu entry at a route that exists", () => {
    const app = code("src/App.tsx");
    for (const tool of TRACK_TOOLS) {
      expect(app, tool.path).toContain(`path="${tool.path}"`);
    }
  });

  it("shows only Library, Store and Settings in navigation", () => {
    const visible = visibleSuiteApps().map((a) => a.id);
    for (const id of HIDDEN_DESKS) {
      expect(visible, id).not.toContain(id);
    }
    expect(visible).toContain("library");
    expect(visible).toContain("settings");
  });

  it("hid the desks without deleting them", () => {
    // Preservation: a surface leaves navigation, the route still resolves and
    // the page still compiles.
    for (const id of HIDDEN_DESKS) {
      const app = SUITE_APPS.find((a) => a.id === id);
      expect(app, id).toBeTruthy();
    }
    for (const page of DESK_PAGES) {
      expect(existsSync(path.join(ROOT, page)), page).toBe(true);
    }
    expect(existsSync(path.join(ROOT, "src/features/tools/ArtCheckPage.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/features/packs/PackMakerPage.tsx"))).toBe(true);
  });
});
