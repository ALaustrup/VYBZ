import { describe, expect, it } from "vitest";
import { ATC_POLICY } from "@/product/invariants";
import {
  applyDailyGrant,
  canStartHost,
  consumeAtc,
  creditEarned,
  listenEarnAtc,
  qualityMultiplier,
  shouldWarnHost,
  totalAtc,
} from "./atcAccounting";

describe("ATC accounting", () => {
  it("overwrites daily free instead of stacking", () => {
    const once = applyDailyGrant({ dailyFreeRemaining: 12, earnedBalance: 400 });
    const twice = applyDailyGrant(once);
    expect(once.dailyFreeRemaining).toBe(ATC_POLICY.dailyFreeGrantAtc);
    expect(twice.dailyFreeRemaining).toBe(ATC_POLICY.dailyFreeGrantAtc);
    expect(twice.earnedBalance).toBe(400);
  });

  it("burns daily free before earned", () => {
    const next = consumeAtc({ dailyFreeRemaining: 10, earnedBalance: 20 }, 14);
    expect(next).toEqual({ dailyFreeRemaining: 0, earnedBalance: 16 });
  });

  it("refuses a consume that would go negative", () => {
    expect(consumeAtc({ dailyFreeRemaining: 2, earnedBalance: 2 }, 5)).toBeNull();
    expect(consumeAtc({ dailyFreeRemaining: 10, earnedBalance: 0 }, 0)).toBeNull();
  });

  it("gates start at the declared 300 ATC minimum", () => {
    expect(canStartHost({ dailyFreeRemaining: 299, earnedBalance: 0 })).toBe(false);
    expect(canStartHost({ dailyFreeRemaining: 200, earnedBalance: 100 })).toBe(true);
  });

  it("warns at 60 ATC remaining", () => {
    expect(shouldWarnHost({ dailyFreeRemaining: 61, earnedBalance: 0 })).toBe(false);
    expect(shouldWarnHost({ dailyFreeRemaining: 10, earnedBalance: 50 })).toBe(true);
  });

  it("caps the quality multiplier so farming stays bounded", () => {
    const allOn = qualityMultiplier({ spark: true, stay: true, discovery: true, firstListen: true });
    expect(allOn).toBeLessThanOrEqual(ATC_POLICY.maxQualityMultiplier);
    expect(allOn).toBe(ATC_POLICY.maxQualityMultiplier);
    expect(qualityMultiplier({ spark: false, stay: false, discovery: false, firstListen: false })).toBe(1);
  });

  it("awards floor(seconds × 50/60 × multiplier) and rejects unmeasured seconds", () => {
    expect(listenEarnAtc(60, { spark: false, stay: false, discovery: false, firstListen: false })).toBe(50);
    expect(listenEarnAtc(60, { spark: true, stay: false, discovery: false, firstListen: false })).toBe(60);
    expect(listenEarnAtc(0, { spark: false, stay: false, discovery: false, firstListen: false })).toBeNull();
    expect(listenEarnAtc(30.5, { spark: false, stay: false, discovery: false, firstListen: false })).toBeNull();
  });

  it("credits only earned, never daily free", () => {
    const next = creditEarned({ dailyFreeRemaining: 100, earnedBalance: 1 }, 50);
    expect(next).toEqual({ dailyFreeRemaining: 100, earnedBalance: 51 });
    expect(totalAtc(next!)).toBe(151);
  });
});
