import type { CostEstimate, ProviderMode } from "./types";

export type {
  CostEstimate,
  CostReservation,
  CostReservationStatus,
  ProviderMode,
} from "./types";

export {
  createCostSentinel,
  getSharedCostSentinel,
  resetSharedCostSentinel,
  DEFAULT_THRESHOLDS,
  type CostAlert,
  type CostSentinel,
  type CostSentinelThresholds,
  type CostUsageSnapshot,
} from "./sentinel";

export { recordCost, listRecentCostEvents, monthlySpendByFeature, monthTotals } from "./recordCost";
export {
  clientBudgetCaps,
  evaluateBudget,
  featureDisabledFlag,
  resolveBudgetCaps,
  type BudgetStatus,
} from "./budget";
export {
  isFeatureKillSwitched,
  applyKillSwitchLocal,
  assertKillSwitchWhenFreeTierExceeded,
  hydrateEdgeFlags,
} from "./edgeFlags";
export { decideCostAlert } from "./costAlert";
export {
  AI_MINUTE_PACK_SECONDS,
  AI_MINUTE_PACK_CENTS,
  AI_MINUTE_PACK_ID,
  AI_LOW_BALANCE_SECONDS,
  creditAiSeconds,
  debitAICredits,
  getAiCreditBalance,
  listAiCreditLedger,
  resetAiCreditStore,
  secondsToAiMinutes,
  type AiCreditLedgerRow,
} from "./aiCredits";

export type CostPolicy = {
  allowPaidWithoutReservation: boolean;
  prepaidProviders: readonly string[];
};

export function defaultCostPolicy(): CostPolicy {
  return {
    allowPaidWithoutReservation: false,
    prepaidProviders: ["ai_mastering"],
  };
}

/** Paid providers require reservation / prepaid — never silent cloud spend. */
export function canUsePaidProvider(
  provider: string,
  policy: CostPolicy = defaultCostPolicy(),
): boolean {
  if (policy.allowPaidWithoutReservation) return true;
  return policy.prepaidProviders.includes(provider);
}

/** Estimates stay disabled until a paid provider is explicitly reserved. */
export function estimateJobCost(
  provider: string,
  mode: ProviderMode = "disabled",
): CostEstimate {
  return {
    provider,
    mode,
    estimatedCents: 0,
    currency: "USD",
    disabled: true,
    reason: "Cost estimates disabled until prepaid reservation (Cost Sentinel tracks usage only)",
  };
}

export function estimateFeatureCost(feature: string): CostEstimate {
  return estimateJobCost(feature, "disabled");
}
