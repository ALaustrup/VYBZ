import { describe, expect, it } from "vitest";
import { inferSampleKind, packFolderForKind, PACK_MAKER_VERSION } from "@/features/packs/packManifest";

describe("packManifest", () => {
  it("versions and classifies sample kinds", () => {
    expect(PACK_MAKER_VERSION).toMatch(/^or020\./);
    expect(inferSampleKind("Kick_OneShot.wav")).toBe("oneshot");
    expect(inferSampleKind("melody_loop_120.wav")).toBe("loop");
    expect(packFolderForKind("loop")).toBe("loops");
  });
});
