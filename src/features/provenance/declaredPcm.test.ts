import { afterEach, describe, expect, it } from "vitest";
import {
  finishDeclaredPcmHash,
  peekDeclaredPcmBytes,
  pushDeclaredPcm,
  resetDeclaredPcmHash,
  startDeclaredPcmHash,
} from "./declaredPcm";
import { sha256HexSync } from "./sha256Incremental";

describe("declared PCM hasher", () => {
  afterEach(() => {
    resetDeclaredPcmHash();
  });

  it("returns null when no bytes were hashed", () => {
    startDeclaredPcmHash();
    expect(finishDeclaredPcmHash()).toBeNull();
  });

  it("matches a one-shot SHA of the same PCM bytes", () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([5, 6, 7, 8]);
    startDeclaredPcmHash();
    pushDeclaredPcm(a);
    pushDeclaredPcm(b);
    expect(peekDeclaredPcmBytes()).toBe(8);
    const out = finishDeclaredPcmHash();
    const all = new Uint8Array(8);
    all.set(a, 0);
    all.set(b, 4);
    expect(out?.hex).toBe(sha256HexSync(all));
    expect(out?.bytesHashed).toBe(8);
  });
});
