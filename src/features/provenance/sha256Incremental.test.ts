import { describe, expect, it } from "vitest";
import { createSha256, sha256HexSync } from "./sha256Incremental";

const enc = new TextEncoder();

describe("incremental SHA-256", () => {
  it("matches empty and abc test vectors", () => {
    expect(sha256HexSync(new Uint8Array(0))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256HexSync(enc.encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("matches a split update to a single update", () => {
    const all = enc.encode("The quick brown fox jumps over the lazy dog");
    const once = sha256HexSync(all);
    const h = createSha256();
    h.update(all.subarray(0, 10));
    h.update(all.subarray(10));
    expect(h.hex()).toBe(once);
    expect(once).toBe("d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
  });
});
