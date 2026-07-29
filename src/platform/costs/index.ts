import type { CostEstimate, ProviderMode } from "./types";

export type {
  CostEstimate,
  CostReservation,
  CostReservationStatus,
  ProviderMode,
} from "./types";

export type CostPolicy = {
  allowPaidWithoutReservation: boolean;
  prepaidProviders: readonly string[];
};

export function defaultCostPolicy(): CostPolicy {
  return {
    allowPaidWithoutReservation: false,
    prepaidProviders: [],
  };
}

/** Phase 1: paid providers require reservation / prepaid — never silent cloud spend. */
export function canUsePaidProvider(
  provider: string,
  policy: CostPolicy = defaultCostPolicy(),
): boolean {
  if (policy.allowPaidWithoutReservation) return true;
  return policy.prepaidProviders.includes(provider);
}

/** Phase 1 stub — always zero / disabled until Cost Sentinel. */
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
    reason: "Cost estimates disabled in Phase 1 stubs",
  };
}

export function estimateFeatureCost(feature: string): CostEstimate {
  return estimateJobCost(feature, "disabled");
}
