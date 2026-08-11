import { describe, expect, it } from "vitest";
import { isCorrectOp, resolveCorrectOpFromQuery } from "@/features/correction/correctOps";

describe("correctOps", () => {
  it("accepts Correct chip ids", () => {
    expect(isCorrectOp("width")).toBe(true);
    expect(isCorrectOp("widthWiden")).toBe(false);
  });

  it("resolves AutoFix query aliases", () => {
    expect(resolveCorrectOpFromQuery("widthWiden")).toBe("width");
    expect(resolveCorrectOpFromQuery("eqCutBright")).toBe("eq");
    expect(resolveCorrectOpFromQuery("level")).toBe("loudness");
  });
});
