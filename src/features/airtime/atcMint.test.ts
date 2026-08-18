import { describe, expect, it } from "vitest";
import { NOT_MEASURED } from "@/product/invariants";
import { isUnmeasuredMint, mayGrantBootstrap, mayMint, mintAmountFor } from "./atcMint";

describe("ATC mint lock", () => {
  it("refuses reception bonus and referral instead of inventing a rate", () => {
    expect(isUnmeasuredMint("reception_bonus")).toBe(true);
    expect(isUnmeasuredMint("referral")).toBe(true);
    expect(mintAmountFor("reception_bonus")).toBe(NOT_MEASURED);
    expect(mintAmountFor("referral")).toBe(NOT_MEASURED);
    expect(mayMint("reception_bonus")).toBe(false);
    expect(mayMint("referral")).toBe(false);
  });

  it("keeps already-declared daily and bootstrap amounts", () => {
    expect(mintAmountFor("daily_grant")).toBe(7200);
    expect(mintAmountFor("bootstrap")).toBe(3600);
    expect(mayMint("daily_grant")).toBe(true);
  });

  it("grants bootstrap only inside the declared 7-day window and only once", () => {
    const now = Date.parse("2026-08-18T00:00:00Z");
    expect(mayGrantBootstrap({
      accountCreatedAt: now - 3 * 24 * 60 * 60 * 1000,
      now,
      alreadyGranted: false,
    })).toBe(true);
    expect(mayGrantBootstrap({
      accountCreatedAt: now - 8 * 24 * 60 * 60 * 1000,
      now,
      alreadyGranted: false,
    })).toBe(false);
    expect(mayGrantBootstrap({
      accountCreatedAt: now,
      now,
      alreadyGranted: true,
    })).toBe(false);
  });
});
