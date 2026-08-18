import { describe, expect, it } from "vitest";
import { ATC_POLICY } from "@/product/invariants";
import { leftoverPlaySeconds, planAfterBurn, startBlockedReason } from "./atcHostGate";

describe("host Airtime gate", () => {
  it("plays out a leftover shorter than the burn chunk instead of cutting hard", () => {
    expect(leftoverPlaySeconds(15)).toBe(15);
    expect(leftoverPlaySeconds(30)).toBe(0);
    expect(leftoverPlaySeconds(0)).toBe(0);
    expect(planAfterBurn({ ok: true, total: 15 })).toBe("buffer");
    expect(planAfterBurn({ ok: false, error: "insufficient", total: 12 })).toBe("buffer");
    expect(planAfterBurn({ ok: false, error: "insufficient", total: 0 })).toBe("end");
    expect(planAfterBurn({ ok: true, total: 90 })).toBe("burn");
  });

  it("blocks start below the declared minimum", () => {
    expect(startBlockedReason({ dailyFreeRemaining: 299, earnedBalance: 0 })).toContain("Need");
    expect(startBlockedReason({ dailyFreeRemaining: ATC_POLICY.hostStartMinimumAtc, earnedBalance: 0 })).toBeNull();
  });
});
