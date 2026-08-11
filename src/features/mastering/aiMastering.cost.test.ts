import { beforeEach, describe, expect, it } from "vitest";
import { masterWavBuffer } from "@vybz/processing/mastering";
import { applyKillSwitchLocal, resetEdgeFlagCache } from "@/platform/costs/edgeFlags";
import { resetCostEventStore } from "@/platform/costs/recordCost";
import { resetAiCreditStore } from "@/platform/costs/aiCredits";
import {
  assertAiMasteringAllowed,
  resetAiJobStore,
  runLocalMasterJob,
  shouldUseRemoteAnalyze,
} from "@/features/mastering/aiMasterService";
import { PORTABLE_FFT_MAX_BYTES } from "@vybz/processing/waveform";

function makeSineWav(seconds = 1): ArrayBuffer {
  const sampleRate = 8000;
  const n = sampleRate * seconds;
  const dataSize = n * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < n; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.2;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  return buffer;
}

describe("AI mastering cost hooks", () => {
  beforeEach(() => {
    resetCostEventStore();
    resetEdgeFlagCache();
    resetAiJobStore();
    resetAiCreditStore();
  });

  it("runLocalMasterJob completes without prepaid debit", async () => {
    const wav = makeSineWav(1);
    const job = await runLocalMasterJob({
      projectId: "p1",
      file: wav,
      fileName: "clip.wav",
      fixtureMeta: true,
    });
    expect(job.status).toBe("completed");
    expect(job.metrics?.procVersion).toMatch(/^phase15/);
    expect(job.metadata?.genre).toBe("Electronic");
  });

  it("routes size > portable FFT to remote", () => {
    expect(shouldUseRemoteAnalyze(PORTABLE_FFT_MAX_BYTES)).toBe(false);
    expect(shouldUseRemoteAnalyze(PORTABLE_FFT_MAX_BYTES + 1)).toBe(true);
  });

  it("manual kill-switch blocks mastering", async () => {
    applyKillSwitchLocal("ai_mastering", "test");
    await expect(
      runLocalMasterJob({
        file: makeSineWav(0.25),
      })
    ).rejects.toThrow(/kill-switch/i);
  });

  it("assertAiMasteringAllowed ignores balance (kill-switch only)", async () => {
    await assertAiMasteringAllowed(1e9);
  });
});

describe("masterWavBuffer smoke", () => {
  it("produces wav larger than header", () => {
    const out = masterWavBuffer(makeSineWav(0.5));
    expect(out.wav.byteLength).toBeGreaterThan(44);
  });
});
