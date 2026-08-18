import { describe, expect, it } from "vitest";
import { NOT_MEASURED } from "@/product/invariants";
import {
  audioBindFromEvents,
  audioShaLabel,
  bindAudioSha,
  bindStoredAsset,
  c2paLedgerLabel,
  isSha256Hex,
} from "./audioBind";

const HEX = "a".repeat(64);
const HEX_B = "b".repeat(64);

describe("audio SHA bind", () => {
  it("rejects anything that is not a 64-hex digest", () => {
    expect(isSha256Hex("not-a-hash")).toBe(false);
    expect(isSha256Hex("A".repeat(64))).toBe(false);
    expect(isSha256Hex(HEX)).toBe(true);
  });

  it("never upgrades a client hash to measured", () => {
    const declaredOnly = bindAudioSha({ declaredHex: HEX, declaredSource: "daw_pcm_client", declaredBytesHashed: 48 });
    expect(declaredOnly.kind).toBe("declared");
    expect(declaredOnly.source).toBe("daw_pcm_client");
    expect(declaredOnly.bytesHashed).toBe(48);
    expect(audioShaLabel(declaredOnly)).toContain("declared");
    expect(audioShaLabel(declaredOnly)).not.toMatch(/measured from stored/);

    const empty = bindAudioSha({});
    expect(empty.hex).toBeNull();
    expect(empty.kind).toBeNull();
    expect(audioShaLabel(empty)).toBe(NOT_MEASURED);
  });

  it("prefers a stored-bytes SHA and still labels it measured", () => {
    const both = bindAudioSha({ measuredHex: HEX_B, declaredHex: HEX });
    expect(both.kind).toBe("measured");
    expect(both.hex).toBe(HEX_B);
    expect(audioShaLabel(both)).toContain("measured from stored bytes");
  });

  it("reads only declared audioSha signals from the event chain", () => {
    const bind = audioBindFromEvents([
      { seq: 1, eventType: "signal", payload: { kind: "declared", pointer: true }, prevHash: "", rowHash: "", createdAt: "" },
      {
        seq: 2,
        eventType: "signal",
        payload: { kind: "declared", audioSha: HEX, source: "daw_pcm_client", bytesHashed: 12 },
        prevHash: "",
        rowHash: "",
        createdAt: "",
      },
    ]);
    expect(bind.kind).toBe("declared");
    expect(bind.hex).toBe(HEX);
    expect(bind.bytesHashed).toBe(12);
  });

  it("treats a stored asset SHA as measured and the session link as declared", () => {
    const stored = bindStoredAsset({ sha256: HEX.toUpperCase(), assetId: "asset-1", c2paLedgerEvents: 0 });
    expect(stored.hex).toBe(HEX);
    expect(stored.linkKind).toBe("declared");
    expect(stored.c2paLedgerEvents).toBe(0);
    expect(c2paLedgerLabel(0)).toContain("Not measured");
    expect(c2paLedgerLabel(null)).toBe(NOT_MEASURED);
    const audio = bindAudioSha({ measuredHex: stored.hex, declaredHex: HEX_B });
    expect(audio.kind).toBe("measured");
    expect(audio.hex).toBe(HEX);
  });
});
