/**
 * Cost Sentinel budget caps + 90% soft-limit helpers (Phase 14).
 * Env (Edge / server): COST_SENTINEL_MONTHLY_CAP_USD (0 = unlimited)
 *                      COST_SENTINEL_FREE_TIER_UNITS (JSON or number default)
 * Client (optional):   VITE_COST_SENTINEL_MONTHLY_CAP_USD
 */

export type BudgetCaps = {
  monthlyCapUsd: number;
  freeTierUnits: number;
  alertRatio: number;
};

export const DEFAULT_BUDGET_CAPS: BudgetCaps = {
  monthlyCapUsd: 0,
  freeTierUnits: 30,
  alertRatio: 0.9,
};

export function parseMonthlyCapUsd(raw: string | undefined | null): number {
  if (raw == null || raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function parseFreeTierUnits(raw: string | undefined | null): number {
  if (raw == null || raw.trim() === "") return DEFAULT_BUDGET_CAPS.freeTierUnits;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "number" && Number.isFinite(parsed)) return Math.max(0, parsed);
    if (parsed && typeof parsed === "object" && "default" in (parsed as object)) {
      const d = Number((parsed as { default: unknown }).default);
      if (Number.isFinite(d)) return Math.max(0, d);
    }
  } catch {
    /* fall through */
  }
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BUDGET_CAPS.freeTierUnits;
}

export function resolveBudgetCaps(env: Record<string, string | undefined> = {}): BudgetCaps {
  const monthly =
    parseMonthlyCapUsd(env.COST_SENTINEL_MONTHLY_CAP_USD) ||
    parseMonthlyCapUsd(env.VITE_COST_SENTINEL_MONTHLY_CAP_USD);
  const free =
    parseFreeTierUnits(env.COST_SENTINEL_FREE_TIER_UNITS) ||
    parseFreeTierUnits(env.VITE_COST_SENTINEL_FREE_TIER_UNITS);
  return {
    monthlyCapUsd: monthly,
    freeTierUnits: free || DEFAULT_BUDGET_CAPS.freeTierUnits,
    alertRatio: DEFAULT_BUDGET_CAPS.alertRatio,
  };
}

export function clientBudgetCaps(): BudgetCaps {
  return resolveBudgetCaps({
    VITE_COST_SENTINEL_MONTHLY_CAP_USD: import.meta.env.VITE_COST_SENTINEL_MONTHLY_CAP_USD as
      | string
      | undefined,
    VITE_COST_SENTINEL_FREE_TIER_UNITS: import.meta.env.VITE_COST_SENTINEL_FREE_TIER_UNITS as
      | string
      | undefined,
  });
}

export type BudgetStatus = {
  monthSpendUsd: number;
  monthUnits: number;
  caps: BudgetCaps;
  ratioOfCap: number | null;
  atOrAboveAlert: boolean;
  capExceeded: boolean;
  freeTierExceeded: boolean;
};

export function evaluateBudget(opts: {
  monthSpendUsd: number;
  monthUnits: number;
  caps?: BudgetCaps;
}): BudgetStatus {
  const caps = opts.caps ?? DEFAULT_BUDGET_CAPS;
  const ratioOfCap =
    caps.monthlyCapUsd > 0 ? opts.monthSpendUsd / caps.monthlyCapUsd : null;
  return {
    monthSpendUsd: opts.monthSpendUsd,
    monthUnits: opts.monthUnits,
    caps,
    ratioOfCap,
    atOrAboveAlert: ratioOfCap != null && ratioOfCap >= caps.alertRatio,
    capExceeded: ratioOfCap != null && ratioOfCap >= 1,
    freeTierExceeded: opts.monthUnits > caps.freeTierUnits,
  };
}

/** Kill-switch flag name for a feature soft-disable. */
export function featureDisabledFlag(feature: string): string {
  return `feature:${feature.trim().toLowerCase()}:disabled`;
}
