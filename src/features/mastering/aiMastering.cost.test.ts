import { beforeEach, describe, expect, it } from "vitest";
import {
  AI_MASTERING_FREE_SECONDS,
  masterWavBuffer,
} from "@vybz/processing/mastering";
import { applyKillSwitchLocal, isFeatureKillSwitched, resetEdgeFlagCache } from "@/platform/costs/edgeFlags";
import { listRecentCostEvents, recordCost, resetCostEventStore } from "@/platform/costs/recordCost";
import {
  creditAiSeconds,
  getAiCreditBalance,
  resetAiCreditStore,
} from "@/platform/costs/aiCredits";
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

  it("logs cost_event when job records 3 s", async () => {
    const result = await recordCost("ai_mastering", 3, 3 * 0.0004, {
      meta: { test: true },
    });
    expect(result.event.feature).toBe("ai_mastering");
    expect(result.event.units).toBe(3);
    const rows = await listRecentCostEvents();
    expect(rows.some((r) => r.feature === "ai_mastering" && r.units === 3)).toBe(true);
  });

  it("kill-switch fires when free-tier simulated for ai_mastering", async () => {
    await recordCost("ai_mastering", AI_MASTERING_FREE_SECONDS + 1, 0.1, {
      caps: {
        monthlyCapUsd: 0,
        freeTierUnits: AI_MASTERING_FREE_SECONDS,
        alertRatio: 0.9,
      },
    });
    expect(isFeatureKillSwitched("ai_mastering")).toBe(true);
  });

  it("runLocalMasterJob writes ai_mastering cost and completes", async () => {
    const wav = makeSineWav(1);
    const job = await runLocalMasterJob({
      projectId: "p1",
      file: wav,
      fileName: "clip.wav",
      fixtureMeta: true,
    });
    expect(job.status).toBe("completed");
    expect(job.metrics?.procVersion).toMatch(/^phase15/);
    const rows = await listRecentCostEvents();
    expect(rows.some((r) => r.feature === "ai_mastering")).toBe(true);
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

  it("hard-stop when free-tier and prepaid balance are exhausted", async () => {
    await recordCost("ai_mastering", AI_MASTERING_FREE_SECONDS, 0.1, {
      caps: { monthlyCapUsd: 0, freeTierUnits: 99999, alertRatio: 0.9 },
    });
    await expect(assertAiMasteringAllowed(1)).rejects.toThrow(/balance ≤ 0|exhausted/i);
  });

  it("prepaid pack allows mastering after free-tier is used", async () => {
    await recordCost("ai_mastering", AI_MASTERING_FREE_SECONDS, 0.1, {
      caps: { monthlyCapUsd: 0, freeTierUnits: 99999, alertRatio: 0.9 },
    });
    await creditAiSeconds(6000);
    await assertAiMasteringAllowed(30);
    const job = await runLocalMasterJob({
      file: makeSineWav(1),
      fileName: "paid.wav",
      fixtureMeta: true,
    });
    expect(job.status).toBe("completed");
    expect(await getAiCreditBalance()).toBeLessThan(6000);
  });
});

describe("masterWavBuffer smoke", () => {
  it("produces wav larger than header", () => {
    const out = masterWavBuffer(makeSineWav(0.5));
    expect(out.wav.byteLength).toBeGreaterThan(44);
  });
});
