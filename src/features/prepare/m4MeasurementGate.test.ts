import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BS1770_METER_VERSION,
  PROCESSING_VERSION,
  measureBs1770,
  synthesizeSinePeakDbfs,
} from "@vybz/processing/waveform";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * M4 exit gate — Masterplan §10 / AGENTS.md Measurement Integrity Foundation.
 *
 * Gate: Core meters defensible; test vectors pass within documented tolerances;
 * results consistent across environments or the difference is disclosed; no
 * placeholder measurement reaches users.
 */
describe("M4 measurement integrity exit gate", () => {
  it("cites the M4 gate and ships a versioned BS.1770 meter", () => {
    expect(BS1770_METER_VERSION).toMatch(/^m4\.bs1770/);
    expect(PROCESSING_VERSION).toMatch(/^m[45]\.waveform/);
  });

  it("publishes the stereo −23 dBFS vector within ±0.5 LU", () => {
    const channels = synthesizeSinePeakDbfs({
      sampleRate: 48000,
      seconds: 5,
      peakDbfs: -23,
      channels: 2,
    });
    const m = measureBs1770(channels, 48000, "portable");
    expect(m.integratedLufs).toBeGreaterThanOrEqual(-23.5);
    expect(m.integratedLufs).toBeLessThanOrEqual(-22.5);
    expect(m.truePeakDbtp).toBeGreaterThanOrEqual(m.samplePeakDbfs - 0.15);
    expect(m.provenance.standard).toBe("BS.1770-4");
  });

  it("discloses that native desktop analysis is approx-only (not BS.1770)", () => {
    const tauri = readFileSync(path.join(ROOT, "src/platform/bridge/tauriInvoke.ts"), "utf8");
    const panel = readFileSync(
      path.join(ROOT, "src/features/processing/DesktopBatchPanel.tsx"),
      "utf8"
    );
    const rust = readFileSync(
      path.join(ROOT, "apps/desktop/src-tauri/src/audio.rs"),
      "utf8"
    );

    expect(tauri).toMatch(/Never populate integratedLufs/);
    expect(tauri).toMatch(/native\.approx/);
    expect(panel).toMatch(/native BS\.1770 pending/);
    expect(rust).toMatch(/native\.approx\.1/);
    expect(rust).toMatch(/Not BS\.1770-4/);
  });

  it("does not present sample peak as true peak in readiness hot-peak copy", () => {
    const readiness = readFileSync(
      path.join(ROOT, "packages/domain/releases/src/readiness.ts"),
      "utf8"
    );
    expect(readiness).toMatch(/Sample peak/);
    expect(readiness).not.toMatch(/sample peak is a true peak/i);
    expect(readiness).toMatch(/truePeakDbtp/);
  });
});
