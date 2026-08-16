import { describe, expect, it } from "vitest";
import {
  activeSuiteAppId,
  SUITE_APPS,
  visibleSuiteApps,
} from "@/shell/suiteApps";

/** Desks that a track is sent to, rather than places you browse. */
const CONTEXT_MENU_DESKS = [
  "analyzer", "metadata", "art-check", "midi-maker", "media-converter",
  "correct", "translate", "pack-maker", "stem-maker", "codex",
];

describe("suiteApps", () => {
  it("keeps every desk registered even though none are browsable", () => {
    // They left navigation; they did not leave the app.
    const all = SUITE_APPS.map((a) => a.id);
    expect(all).toEqual(expect.arrayContaining(CONTEXT_MENU_DESKS));
  });

  it("offers only Library and Settings to browse", () => {
    // Store is here too, behind its own flag. Everything else is summoned from
    // a track, because a desk with no track loaded is an empty room.
    const ids = visibleSuiteApps().map((a) => a.id);
    for (const desk of CONTEXT_MENU_DESKS) {
      expect(ids, desk).not.toContain(desk);
    }
    expect(ids).toContain("library");
    expect(ids).toContain("settings");
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
