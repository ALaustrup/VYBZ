import { describe, expect, it } from "vitest";
import { summarizeReadiness } from "@/features/prepare/readinessScore";
import type { ReleaseFinding } from "@vybz/domain/releases";

function finding(severity: ReleaseFinding["severity"], code: string): ReleaseFinding {
  return {
    id: "1",
    releaseId: "r1",
    ownerId: "u1",
    assetId: null,
    code,
    severity,
    category: "audio",
    title: code,
    detail: "detail",
    status: "open",
    createdAt: "",
    updatedAt: "",
  };
}

describe("summarizeReadiness", () => {
  it("returns hold when blocking findings exist", () => {
    const s = summarizeReadiness([finding("blocking", "AUDIO_MISSING")], "blocked");
    expect(s.level).toBe("hold");
    expect(s.score).toBeLessThan(80);
  });

  it("returns ready when no open findings", () => {
    const s = summarizeReadiness([], "ready");
    expect(s.level).toBe("ready");
    expect(s.score).toBe(100);
  });
});
