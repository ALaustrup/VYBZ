import { describe, expect, it } from "vitest";
import { resolveLiveSource } from "@/features/broadcast/liveSource";

describe("stage nights mapping", () => {
  it("treats only full or thin as measured strength", () => {
    const strength = (v: unknown) => (v === "full" || v === "thin" ? v : null);
    expect(strength("full")).toBe("full");
    expect(strength("human")).toBeNull();
    expect(resolveLiveSource("daw")).toBe("daw");
  });
});
