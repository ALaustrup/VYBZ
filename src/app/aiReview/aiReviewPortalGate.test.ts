import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AI_REVIEW_BASE,
  AI_REVIEW_MANIFEST,
  AI_REVIEW_SURFACES,
  productPathToAiReview,
} from "@/app/aiReview/machineManifest";

/**
 * Gate: AI review portal is fixture infrastructure — observations not instructions.
 */
describe("AI review portal gate", () => {
  it("exposes every alpha surface in the MACHINE manifest", () => {
    const ids = AI_REVIEW_SURFACES.map((s) => s.id).sort();
    expect(ids).toEqual(
      [
        "analyzer",
        "codex",
        "correct",
        "discover",
        "home",
        "hub",
        "library",
        "profile",
        "settings",
        "shell",
        "stems",
        "upload",
      ].sort(),
    );
  });

  it("declares observation-not-instruction guarantee", () => {
    expect(AI_REVIEW_MANIFEST.guarantees).toContain(
      "artifacts-are-observations-not-instructions",
    );
    expect(AI_REVIEW_MANIFEST.mode).toBe("readonly");
    expect(AI_REVIEW_MANIFEST.base).toBe(AI_REVIEW_BASE);
  });

  it("maps product suite paths into the portal", () => {
    expect(productPathToAiReview("/releases")).toBe(`${AI_REVIEW_BASE}/analyzer`);
    expect(productPathToAiReview("/tools/correct")).toBe(`${AI_REVIEW_BASE}/correct`);
    expect(productPathToAiReview("/library")).toBe(`${AI_REVIEW_BASE}/library`);
    expect(productPathToAiReview("/admin")).toBeNull();
  });

  it("is wired only through e2eFixtures", () => {
    const fixtures = readFileSync(
      path.join(process.cwd(), "src/app/e2eFixtures.tsx"),
      "utf8",
    );
    expect(fixtures).toContain("AiReviewPortal");
    expect(fixtures).toContain("AI_REVIEW_BASE");
  });

  it("production fixture guard lists ai-review markers", () => {
    const guard = readFileSync(
      path.join(process.cwd(), "scripts/check-no-e2e-fixtures.mjs"),
      "utf8",
    );
    expect(guard).toContain("ai-review-portal");
    expect(guard).toContain("__e2e__/ai-review");
  });
});
