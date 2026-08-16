import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_ANALYZER_BATCH } from "@/features/prepare/scanConcurrency";
import { isAnalyzerAudioReady } from "@/features/prepare/analyzerReady";
import { shipAutoFixForCode } from "@/features/prepare/autoFixMap";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * Analyzer intake desk gate — audio-only start, no cover required, batch + auto-fix map.
 */
describe("Analyzer intake desk gate", () => {
  it("cites the desk on ReleasesPage and redirects legacy new-scan", () => {
    const page = readFileSync(path.join(ROOT, "src/features/prepare/ReleasesPage.tsx"), "utf8");
    const neu = readFileSync(path.join(ROOT, "src/features/prepare/NewReleasePage.tsx"), "utf8");
    expect(page).toMatch(/Scan the audio/);
    expect(page).toMatch(/analyzer-desk/);
    expect(page).toMatch(/analyzer-dropzone/);
    expect(page).toMatch(/MAX_ANALYZER_BATCH/);
    expect(page).not.toMatch(/Finish what you scanned/);
    expect(page).not.toMatch(/No releases yet/);
    expect(page).not.toMatch(/prepare-new-release/);
    expect(neu).toMatch(/Navigate to="\/releases"/);
    expect(MAX_ANALYZER_BATCH).toBe(20);
  });

  it("Ready ignores artwork and ships Tier A auto-fixes only", () => {
    expect(
      isAnalyzerAudioReady([{ code: "ARTWORK_MISSING", severity: "blocking", status: "open" }]),
    ).toBe(true);
    expect(shipAutoFixForCode("AUDIO_DC_OFFSET")?.tier).toBe("ship");
    expect(shipAutoFixForCode("AUDIO_MAINS_HUM")?.op).toBe("hum");
    expect(shipAutoFixForCode("AUDIO_LOSSY_MASTER")).toBeNull();
  });
});
