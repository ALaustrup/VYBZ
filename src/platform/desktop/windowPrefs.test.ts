import { describe, expect, it } from "vitest";
import { DEFAULT_WINDOW_PREFS, normalizeWindowPrefs, prefsEqual } from "./windowPrefs";

describe("window prefs restore", () => {
  it("applies defaults for empty input", () => {
    expect(normalizeWindowPrefs(null)).toEqual(DEFAULT_WINDOW_PREFS);
  });

  it("clamps absurd geometry", () => {
    const p = normalizeWindowPrefs({ width: 10, height: 99999, theme: "light" });
    expect(p.width).toBe(640);
    expect(p.height).toBe(4320);
    expect(p.theme).toBe("light");
  });

  it("detects equality after normalize", () => {
    const a = normalizeWindowPrefs({ width: 1280, height: 720, x: 1, y: 2, theme: "dark" });
    const b = normalizeWindowPrefs({ width: 1280, height: 720, x: 1, y: 2, theme: "dark" });
    expect(prefsEqual(a, b)).toBe(true);
  });
});
