import { describe, expect, it } from "vitest";
import {
  ART_DIM_LUMA,
  ART_FILE_FAIL_BYTES,
  ART_FILE_WARN_BYTES,
  ART_STORE_MIN_PX,
  artFileSizeVerdict,
} from "./artCheck";

describe("artCheck constants", () => {
  it("documents store minimum and dim luma heuristic", () => {
    expect(ART_STORE_MIN_PX).toBe(3000);
    expect(ART_DIM_LUMA).toBeLessThan(0.5);
  });

  it("classifies measured file bytes against soft store caps", () => {
    expect(artFileSizeVerdict(1_000_000)).toBe("pass");
    expect(artFileSizeVerdict(ART_FILE_WARN_BYTES)).toBe("warn");
    expect(artFileSizeVerdict(ART_FILE_FAIL_BYTES)).toBe("fail");
  });
});
