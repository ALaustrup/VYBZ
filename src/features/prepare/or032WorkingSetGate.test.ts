/**
 * OR-032 Creative OS wedge 1 — song workspace working set.
 * Cites docs/architecture/creative-os-song-workspace-brief.md.
 * Intake order: workspace media → Library picker (later) → dropzone fallback.
 * Law 5: VDock contracts untouched (skin / reactive wordmark only).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-032 song workspace working set", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("or032WorkingSet");
  });

  it("defines a shared working-set module", () => {
    const ws = read("src/features/workspace/workingSet.ts");
    expect(ws).toContain("setWorkingTrack");
    expect(ws).toContain("getWorkingTrack");
    expect(ws).toContain("workingTrackAsFile");
    expect(ws).toContain('source: WorkingTrackSource');
  });

  it("seeds the working set from Analyzer pending stash", () => {
    const page = read("src/features/prepare/ReleasesPage.tsx");
    expect(page).toContain("setWorkingTrack");
    expect(page).toContain('source: "analyzer"');
    expect(page).toContain("stashPendingAudio");
  });

  it("preloads Correct, Translation Lab, and Metadata from the working set", () => {
    const correct = read("src/features/correction/CorrectPage.tsx");
    const translate = read("src/features/translation/TranslationLabPage.tsx");
    const metadata = read("src/features/tools/MetadataEditorPage.tsx");
    for (const src of [correct, translate, metadata]) {
      expect(src).toContain("useWorkingTrack");
      expect(src).toContain("workingTrackAsFile");
      expect(src).toContain('source: "tool-drop"');
    }
  });

  it("keeps the song workspace banner in the tree, hidden from default chrome", () => {
    expect(read("src/features/workspace/SongWorkspaceBanner.tsx")).toContain(
      "export function SongWorkspaceBanner",
    );
    expect(read("src/shell/SuiteShell.tsx")).not.toContain("<SongWorkspaceBanner");
  });

  it("keeps desk dropzones owned (data-no-library-drop + ForgeDropzone onDrop)", () => {
    const forge = read("src/components/ToolWorkbench.tsx");
    const analyzer = read("src/features/prepare/ReleasesPage.tsx");
    expect(forge).toContain("data-no-library-drop");
    expect(forge).toContain("onDrop");
    expect(analyzer).toContain("data-no-library-drop");
  });

  it("labels Translation Lab on the suite rail (OR-033)", () => {
    const apps = read("src/shell/suiteApps.ts");
    expect(apps).toMatch(/id:\s*"translate"[\s\S]{0,80}label:\s*"Listen check"/);
    expect(apps).not.toMatch(/id:\s*"translate"[\s\S]{0,80}label:\s*"Translate"/);
  });

  it("removes suite-app back arrows next to the wordmark", () => {
    const chrome = read("src/lib/appBarChrome.ts");
    expect(chrome).not.toMatch(/\/releases[\s\S]{0,80}showBack:\s*true/);
    expect(chrome).not.toMatch(/\/library[\s\S]{0,80}showBack:\s*true/);
    expect(chrome).not.toMatch(/\/tools\/metadata[\s\S]{0,80}showBack:\s*true/);
  });

  it("centers a container-free reactive brand mark on Home, not in the bar", () => {
    const bar = read("src/components/shell/ContextualAppBar.tsx");
    const home = read("src/pages/SocialHomePage.tsx");
    const word = read("src/components/shell/AppBarWordmark.tsx");
    expect(bar).not.toContain("suite-app-bar-mark");
    expect(bar).not.toContain("<BrandMark");
    expect(bar).not.toContain("<AppBarWordmark");
    expect(home).toContain("<BrandMark");
    expect(home).toContain("reactive");
    expect(home).toContain("orb");
    expect(word).toContain("readBands");
    expect(word).toContain("reactive");
  });
});
