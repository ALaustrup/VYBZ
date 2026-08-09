import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPendingAudio,
  peekPendingAudio,
  resetPendingAudio,
  stashPendingAudio,
  type PendingAudio,
} from "@/features/prepare/pendingUpload";

function entry(releaseId: string): PendingAudio {
  return {
    releaseId,
    blob: new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" }),
    fileName: `${releaseId}.wav`,
    mimeType: "audio/wav",
    sizeBytes: 3,
    title: "Track",
    artistName: "Ada",
  };
}

beforeEach(() => resetPendingAudio());

describe("pending audio store", () => {
  it("returns null when a scan stored nothing", () => {
    expect(peekPendingAudio("nope")).toBeNull();
  });

  it("hands back the exact audio stashed for a release", () => {
    stashPendingAudio(entry("r1"));
    expect(peekPendingAudio("r1")?.fileName).toBe("r1.wav");
  });

  it("keeps releases isolated from one another", () => {
    stashPendingAudio(entry("r1"));
    stashPendingAudio(entry("r2"));
    expect(peekPendingAudio("r1")?.fileName).toBe("r1.wav");
    expect(peekPendingAudio("r2")?.fileName).toBe("r2.wav");
  });

  it("peeking does not consume, so a failed publish can retry", () => {
    stashPendingAudio(entry("r1"));
    expect(peekPendingAudio("r1")).not.toBeNull();
    expect(peekPendingAudio("r1")).not.toBeNull();
  });

  it("clears only after an explicit call, so the offer disappears once published", () => {
    stashPendingAudio(entry("r1"));
    clearPendingAudio("r1");
    expect(peekPendingAudio("r1")).toBeNull();
  });

  it("evicts the oldest entry so a long session cannot grow without bound", () => {
    // Cap is 20 (Analyzer batch size) — the 21st evicts the oldest.
    for (let i = 1; i <= 21; i++) stashPendingAudio(entry(`r${i}`));
    expect(peekPendingAudio("r1")).toBeNull();
    expect(peekPendingAudio("r21")?.fileName).toBe("r21.wav");
    expect(peekPendingAudio("r2")?.fileName).toBe("r2.wav");
  });

  it("holds no persistent copy — a fresh module state has nothing", () => {
    stashPendingAudio(entry("r1"));
    resetPendingAudio();
    expect(peekPendingAudio("r1")).toBeNull();
  });
});
