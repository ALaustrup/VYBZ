import { describe, expect, it } from "vitest";
import {
  seedCreditsFromMetadata,
  validateCreditDraft,
  validateSplitBudget,
  buildCredit,
} from "@vybz/domain/credits";

describe("credits validation", () => {
  it("requires display name and valid role", () => {
    expect(validateCreditDraft({ displayName: "", role: "primary_artist" }).some((i) => i.code === "NAME_REQUIRED")).toBe(
      true
    );
    expect(validateCreditDraft({ displayName: "Ada", role: "dj" }).some((i) => i.code === "ROLE_INVALID")).toBe(true);
  });

  it("rejects split over 100%", () => {
    const issues = validateSplitBudget([
      { splitBps: 6000, status: "draft" },
      { splitBps: 5000, status: "draft" },
    ]);
    expect(issues.some((i) => i.code === "SPLIT_OVER_100")).toBe(true);
  });

  it("seeds artist/composer only when missing", () => {
    const seeds = seedCreditsFromMetadata({
      releaseId: "r1",
      ownerId: "u1",
      artistName: "Ada",
      composerName: "Ada",
      existing: [],
    });
    expect(seeds).toHaveLength(2);
    expect(seeds[0]!.role).toBe("primary_artist");
    expect(seeds[1]!.role).toBe("composer");

    const again = seedCreditsFromMetadata({
      releaseId: "r1",
      ownerId: "u1",
      artistName: "Ada",
      composerName: "Ada",
      existing: [buildCredit(seeds[0]!), buildCredit(seeds[1]!)],
    });
    expect(again).toHaveLength(0);
  });
});
