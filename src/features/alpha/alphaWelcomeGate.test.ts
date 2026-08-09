import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALPHA_GUIDE_STEPS,
  ALPHA_WELCOME_VERSION,
  alphaWelcomeStorageKey,
} from "@/lib/alphaWelcome";

const ROOT = path.resolve(__dirname, "../../..");

describe("Alpha welcome + feedback gate", () => {
  it("ships a three-step welcome ending on the glowing feedback FAB", () => {
    expect(ALPHA_GUIDE_STEPS.length).toBe(3);
    expect(ALPHA_GUIDE_STEPS[0]!.title).toMatch(/Welcome to VYBZ Alpha Test/i);
    expect(ALPHA_GUIDE_STEPS[1]!.highlights?.length).toBeGreaterThan(2);
    expect(ALPHA_GUIDE_STEPS[2]!.id).toBe("feedback");
    expect(alphaWelcomeStorageKey("user-1")).toContain(ALPHA_WELCOME_VERSION);
  });

  it("wires tour + FAB into the suite shell and screenshot into the report modal", () => {
    const app = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");
    const modal = readFileSync(path.join(ROOT, "src/components/ReportBugModal.tsx"), "utf8");
    const fab = readFileSync(path.join(ROOT, "src/features/alpha/AlphaFeedbackFab.tsx"), "utf8");
    expect(app).toMatch(/AlphaWelcomeTour/);
    expect(app).toMatch(/AlphaFeedbackFab/);
    expect(fab).toMatch(/alpha-feedback-fab/);
    expect(modal).toMatch(/compressImageForReport/);
    expect(modal).toMatch(/screenshotDataUrl/);
    expect(modal).toMatch(/Add screenshot/);
  });
});
