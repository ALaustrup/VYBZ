import { describe, expect, it } from "vitest";
import {
  contentShaFromSampleHashes,
  inferSampleKind,
  packFolderForKind,
  PACK_MAKER_VERSION,
} from "@/features/packs/packManifest";

describe("packManifest", () => {
  it("versions and classifies sample kinds", () => {
    expect(PACK_MAKER_VERSION).toMatch(/^or020\./);
    expect(inferSampleKind("Kick_OneShot.wav")).toBe("oneshot");
    expect(inferSampleKind("melody_loop_120.wav")).toBe("loop");
    expect(packFolderForKind("loop")).toBe("loops");
  });

  it("content SHA is stable for the same sample hashes", async () => {
    const a = await contentShaFromSampleHashes(["bb", "aa"]);
    const b = await contentShaFromSampleHashes(["aa", "bb"]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
