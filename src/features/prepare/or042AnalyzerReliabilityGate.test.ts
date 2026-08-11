/**
 * OR-042 Analyzer reliability gate — name Analyzer only (user-facing);
 * scan/drop ownership wins over LibraryDropHost (Law 1: no invented “always works” claims).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-042 Analyzer reliability", () => {
  it("Analyzer dropzone stopPropagation + desk ownership markers", () => {
    const page = read("src/features/prepare/ReleasesPage.tsx");
    const host = read("src/components/LibraryDropHost.tsx");
    expect(page).toContain('data-testid="analyzer-dropzone"');
    expect(page).toContain("data-no-library-drop");
    expect(page).toContain("data-analyzer-desk");
    expect(page).toMatch(/onDrop[\s\S]{0,80}stopPropagation/);
    expect(page).toMatch(/onDragOver[\s\S]{0,120}stopPropagation|function onDragOver[\s\S]{0,80}stopPropagation/);
    expect(page).toMatch(/Analyzer owns this drop/i);
    expect(host).toContain("data-analyzer-desk");
    expect(host).toContain("pointerOverDeskDrop");
    expect(host).toContain("data-no-library-drop");
  });

  it("user-facing nav labels say Analyzer not Releases", () => {
    const orb = read("src/components/taskbar/OrbFan.tsx");
    const home = read("src/components/home/ArtistHome.tsx");
    const dash = read("src/components/dashboard/CommandDashboard.tsx");
    const apps = read("src/shell/suiteApps.ts");
    expect(orb).toMatch(/id:\s*"releases"[\s\S]{0,40}label:\s*"Analyzer"/);
    expect(home).toMatch(/label:\s*"Analyzer"[\s\S]{0,40}to:\s*"\/releases"/);
    expect(dash).toMatch(/label:\s*"Analyzer"[\s\S]{0,40}to:\s*"\/releases"/);
    expect(apps).toMatch(/label:\s*"Analyzer"/);
    expect(orb).not.toMatch(/label:\s*"Releases"/);
  });

  it("does not invent guaranteed scan reliability copy", () => {
    const page = read("src/features/prepare/ReleasesPage.tsx");
    expect(page).not.toMatch(/100% reliable|always succeeds|guaranteed scan/i);
  });

  it("authorises OR-042 gate in AGENTS", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("OR-042");
    expect(agents).toContain("or042AnalyzerReliabilityGate");
  });
});
