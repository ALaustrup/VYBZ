import { describe, expect, it } from "vitest";
import {
  nextDeskForFinding,
  nextDeskStepsFromFindings,
} from "@/features/prepare/nextDeskFromFindings";

describe("nextDeskFromFindings (OR-035)", () => {
  it("maps ship audio codes to Correct with ?op=", () => {
    const steps = nextDeskStepsFromFindings([
      { code: "AUDIO_DC_OFFSET", severity: "blocking", status: "open" },
      { code: "AUDIO_STEREO_NARROW", severity: "warning", status: "open" },
    ]);
    expect(steps[0]?.desk).toBe("correct");
    expect(steps[0]?.href).toContain("/tools/correct?op=");
    expect(steps[0]?.href).toContain("dc");
    // Dedupe Correct desk — second audio ship does not add another Correct chip
    expect(steps.filter((s) => s.desk === "correct")).toHaveLength(1);
  });

  it("maps artwork and metadata codes to their desks", () => {
    const steps = nextDeskStepsFromFindings([
      { code: "ARTWORK_MISSING", severity: "blocking", status: "open" },
      { code: "METADATA_TITLE_MISSING", severity: "warning", status: "open" },
    ]);
    expect(steps.map((s) => s.desk)).toEqual(["art-check", "metadata"]);
    expect(steps[0]?.href).toBe("/tools/art-check");
    expect(steps[1]?.href).toBe("/tools/metadata");
  });

  it("adds Translation Lab companion for loudness ship codes", () => {
    const steps = nextDeskStepsFromFindings([
      { code: "AUDIO_LOUDNESS_QUIET", severity: "warning", status: "open" },
    ]);
    expect(steps.some((s) => s.desk === "correct")).toBe(true);
    expect(steps.some((s) => s.desk === "translate" && s.href === "/tools/translate")).toBe(true);
  });

  it("ignores resolved findings and ranks blocking first", () => {
    const steps = nextDeskStepsFromFindings([
      { code: "METADATA_TITLE_MISSING", severity: "info", status: "open" },
      { code: "AUDIO_PEAK_HOT", severity: "blocking", status: "open" },
      { code: "ARTWORK_MISSING", severity: "blocking", status: "resolved" },
    ]);
    expect(steps[0]?.code).toBe("AUDIO_PEAK_HOT");
    expect(steps.some((s) => s.code === "ARTWORK_MISSING")).toBe(false);
  });

  it("nextDeskForFinding returns a single CTA", () => {
    const step = nextDeskForFinding({
      code: "AUDIO_CLICK_POP",
      severity: "warning",
      status: "open",
    });
    expect(step?.desk).toBe("correct");
    expect(step?.href).toContain("click");
  });
});
