import { describe, expect, it, beforeEach } from "vitest";
import {
  evaluateBudget,
  featureDisabledFlag,
  parseMonthlyCapUsd,
  resolveBudgetCaps,
} from "./budget";
import {
  applyKillSwitchLocal,
  assertKillSwitchWhenFreeTierExceeded,
  isFeatureKillSwitched,
  listCachedEdgeFlags,
  resetEdgeFlagCache,
} from "./edgeFlags";
import { recordCost, resetCostEventStore, monthTotals } from "./recordCost";
import { decideCostAlert } from "./costAlert";

describe("Cost Sentinel budget", () => {
  it("treats monthly cap 0 as unlimited", () => {
    expect(parseMonthlyCapUsd("0")).toBe(0);
    const status = evaluateBudget({
      monthSpendUsd: 999,
      monthUnits: 1,
      caps: { monthlyCapUsd: 0, freeTierUnits: 30, alertRatio: 0.9 },
    });
    expect(status.capExceeded).toBe(false);
    expect(status.atOrAboveAlert).toBe(false);
  });

  it("flags ≥90% and 100% of cap", () => {
    const soft = evaluateBudget({
      monthSpendUsd: 18,
      monthUnits: 1,
      caps: { monthlyCapUsd: 20, freeTierUnits: 30, alertRatio: 0.9 },
    });
    expect(soft.atOrAboveAlert).toBe(true);
    expect(soft.capExceeded).toBe(false);
    const hard = evaluateBudget({
      monthSpendUsd: 20,
      monthUnits: 1,
      caps: { monthlyCapUsd: 20, freeTierUnits: 30, alertRatio: 0.9 },
    });
    expect(hard.capExceeded).toBe(true);
  });

  it("resolves env caps", () => {
    const caps = resolveBudgetCaps({
      COST_SENTINEL_MONTHLY_CAP_USD: "20",
      COST_SENTINEL_FREE_TIER_UNITS: "10",
    });
    expect(caps.monthlyCapUsd).toBe(20);
    expect(caps.freeTierUnits).toBe(10);
  });
});

describe("Cost Sentinel kill-switch", () => {
  beforeEach(() => {
    resetEdgeFlagCache();
    resetCostEventStore();
  });

  it("budget exceed sets kill-switch flag", async () => {
    const result = await recordCost("visual-generate", 1, 5, {
      caps: { monthlyCapUsd: 4, freeTierUnits: 100, alertRatio: 0.9 },
    });
    expect(result.budget.capExceeded).toBe(true);
    expect(result.killSwitch?.flag_name).toBe(featureDisabledFlag("visual-generate"));
    expect(isFeatureKillSwitched("visual-generate")).toBe(true);
  });

  it("assertKillSwitchWhenFreeTierExceeded fails when flag missing", () => {
    const check = assertKillSwitchWhenFreeTierExceeded({
      freeTierExceeded: true,
      feature: "fal",
      flags: [],
    });
    expect(check.ok).toBe(false);
    expect(check.missingFlag).toBe("feature:fal:disabled");
  });

  it("assertKillSwitchWhenFreeTierExceeded passes when flag present", () => {
    applyKillSwitchLocal("fal", "free_tier_units_exceeded");
    const check = assertKillSwitchWhenFreeTierExceeded({
      freeTierExceeded: true,
      feature: "fal",
      flags: listCachedEdgeFlags(),
    });
    expect(check.ok).toBe(true);
  });
});

describe("Cost alert decision", () => {
  it("prints No alert required under cap", () => {
    const d = decideCostAlert({
      monthSpendUsd: 1,
      monthUnits: 1,
      env: { COST_SENTINEL_MONTHLY_CAP_USD: "20" },
      ownerEmail: "ops@vybz.cloud",
    });
    expect(d.action).toBe("none");
    expect(d.message).toBe("No alert required");
  });

  it("emails when ≥90% cap", () => {
    const d = decideCostAlert({
      monthSpendUsd: 19,
      monthUnits: 1,
      env: { COST_SENTINEL_MONTHLY_CAP_USD: "20" },
      ownerEmail: "ops@vybz.cloud",
    });
    expect(d.action).toBe("email");
    if (d.action === "email") {
      expect(d.to).toBe("ops@vybz.cloud");
      expect(d.subject).toContain("Cost Sentinel");
    }
  });
});

describe("recordCost store", () => {
  beforeEach(() => resetCostEventStore());

  it("aggregates month totals", async () => {
    await recordCost("prepare", 2, 1.5);
    await recordCost("visual-generate", 1, 0.5);
    const t = await monthTotals();
    expect(t.spendUsd).toBeCloseTo(2);
    expect(t.units).toBe(3);
  });
});
