import { describe, expect, it } from "vitest";
import {
  activeSuiteAppId,
  overflowSuiteApps,
  primarySuiteApps,
  visibleSuiteApps,
} from "@/shell/suiteApps";

describe("suiteApps", () => {
  it("exposes Wave 1 tools including Analyzer and Metadata", () => {
    const ids = visibleSuiteApps().map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "analyzer",
        "metadata",
        "art-check",
        "midi-maker",
        "media-converter",
        "correct",
        "translate",
        "pack-maker",
        "stem-maker",
        "library",
        "codex",
      ])
    );
  });

  it("promotes Correct and Translate onto the primary rail", () => {
    const primary = primarySuiteApps().map((a) => a.id);
    const overflow = overflowSuiteApps().map((a) => a.id);
    expect(primary).toEqual(expect.arrayContaining(["correct", "translate"]));
    expect(overflow).not.toContain("correct");
    expect(overflow).not.toContain("translate");
    expect(overflow).toEqual(expect.arrayContaining(["pack-maker", "stem-maker"]));
  });

  it("selects Analyzer for release routes", () => {
    expect(activeSuiteAppId("/releases")).toBe("analyzer");
    expect(activeSuiteAppId("/release/abc")).toBe("analyzer");
  });

  it("selects tool apps by path", () => {
    expect(activeSuiteAppId("/tools/metadata")).toBe("metadata");
    expect(activeSuiteAppId("/tools/midi")).toBe("midi-maker");
    expect(activeSuiteAppId("/tools/convert")).toBe("media-converter");
    expect(activeSuiteAppId("/tools/correct")).toBe("correct");
    expect(activeSuiteAppId("/tools/translate")).toBe("translate");
    expect(activeSuiteAppId("/tools/pack-maker")).toBe("pack-maker");
    expect(activeSuiteAppId("/tools/stems")).toBe("stem-maker");
    expect(activeSuiteAppId("/market")).toBe("store");
    expect(activeSuiteAppId("/tools/packs")).toBe("store");
  });
});
