import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALPHA_GUIDE_STEPS,
  ALPHA_WELCOME_VERSION,
  alphaWelcomeStorageKey,
  isValidUsername,
  withName,
} from "@/lib/alphaWelcome";
import { GATE_REGISTRY } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Alpha welcome + feedback gate", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("alphaWelcome");
  });

  it("welcomes first, then claims the name, then locks security, then tours the VYBZ", () => {
    expect(ALPHA_GUIDE_STEPS.length).toBe(5);
    expect(ALPHA_GUIDE_STEPS[0]!.title).toMatch(/Welcome to VYBZ/i);
    expect(ALPHA_GUIDE_STEPS[1]!.id).toBe("username");
    expect(ALPHA_GUIDE_STEPS[2]!.id).toBe("security");
    expect(ALPHA_GUIDE_STEPS[3]!.highlights?.length).toBeGreaterThan(2);
    expect(ALPHA_GUIDE_STEPS[3]!.title).toMatch(/vybz/i);
    expect(ALPHA_GUIDE_STEPS[4]!.id).toBe("feedback");
    expect(alphaWelcomeStorageKey("user-1")).toContain(ALPHA_WELCOME_VERSION);
  });

  it("refers to the chosen name after it is set, and never invents one before", () => {
    const later = ALPHA_GUIDE_STEPS.slice(2);
    expect(later.some((s) => s.title.includes("{name}"))).toBe(true);
    expect(withName("Hello {name}", "helix")).toBe("Hello helix");
    expect(withName("Hello {name}", null)).toBe("Hello you");
    expect(withName("Hello {name}", "   ")).toBe("Hello you");
  });

  it("keeps the username shape strict", () => {
    expect(isValidUsername("helix")).toBe(true);
    expect(isValidUsername("a.b_9")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("has space")).toBe(false);
    expect(isValidUsername("x".repeat(25))).toBe(false);
  });

  it("cannot be skipped past while the name is missing", () => {
    const tour = read("src/features/alpha/AlphaWelcomeTour.tsx");
    // Tour opens whenever the name is absent, regardless of local completion flag.
    expect(tour).toContain("needsUsername || !hasCompletedAlphaWelcome(userId)");
    // Skip and Next are withheld on the name and security steps.
    expect(tour).toContain("const blocked = (isUsernameStep && needsUsername) || (isSecurityStep && !securityDone)");
    expect(tour).toContain("alpha-security-step");
    expect(tour).toContain("setAccountPassword");
    expect(tour).toContain("registerPasskey");
    expect(tour).toContain("{blocked ? null : (");
    // finish() refuses to close over a missing name.
    expect(tour).toMatch(/if \(needsUsername\) \{[\s\S]*?return;/);
  });

  it("replaces the full-page username blocker without deleting it", () => {
    const app = read("src/App.tsx");
    expect(app).not.toContain("<UsernameSetup />");
    expect(app).toContain("username={profile?.username ?? null}");
    // Preservation: the old component stays in the tree, imported by nothing.
    expect(read("src/components/Onboarding.tsx")).toContain("export function UsernameSetup");
  });

  it("wires tour + FAB into the suite shell and screenshot into the report modal", () => {
    const app = read("src/App.tsx");
    const modal = read("src/components/ReportBugModal.tsx");
    const fab = read("src/features/alpha/AlphaFeedbackFab.tsx");
    expect(app).toMatch(/AlphaWelcomeTour/);
    expect(app).toMatch(/AlphaFeedbackFab/);
    expect(fab).toMatch(/alpha-feedback-fab/);
    expect(modal).toMatch(/compressImageForReport/);
    expect(modal).toMatch(/screenshotDataUrl/);
    expect(modal).toMatch(/Add screenshot/);
  });
});
