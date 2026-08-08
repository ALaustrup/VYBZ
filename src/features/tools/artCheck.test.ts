import { describe, expect, it } from "vitest";
import { ART_STORE_MIN_PX, ART_DIM_LUMA } from "./artCheck";

describe("artCheck constants", () => {
  it("documents store minimum and dim luma heuristic", () => {
    expect(ART_STORE_MIN_PX).toBe(3000);
    expect(ART_DIM_LUMA).toBeLessThan(0.5);
  });
});
