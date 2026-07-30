/**
 * Cost alert aggregation — shared by Edge Function dry-run script + unit tests.
 */

import { evaluateBudget, resolveBudgetCaps, type BudgetStatus } from "./budget";

export type CostAlertAggInput = {
  monthSpendUsd: number;
  monthUnits: number;
  env?: Record<string, string | undefined>;
  ownerEmail?: string;
};

export type CostAlertDecision =
  | { action: "none"; message: string; budget: BudgetStatus }
  | {
      action: "email";
      message: string;
      budget: BudgetStatus;
      to: string;
      subject: string;
      body: string;
    };

export function decideCostAlert(input: CostAlertAggInput): CostAlertDecision {
  const caps = resolveBudgetCaps(input.env ?? {});
  const budget = evaluateBudget({
    monthSpendUsd: input.monthSpendUsd,
    monthUnits: input.monthUnits,
    caps,
  });

  if (!budget.atOrAboveAlert && !budget.freeTierExceeded) {
    return {
      action: "none",
      message: "No alert required",
      budget,
    };
  }

  const to = input.ownerEmail?.trim() || "";
  const pct =
    budget.ratioOfCap != null ? `${Math.round(budget.ratioOfCap * 100)}%` : "n/a";
  const subject = `VYBZ Cost Sentinel — ${pct} of monthly cap`;
  const body = [
    `Month spend: $${budget.monthSpendUsd.toFixed(2)}`,
    `Cap: $${budget.caps.monthlyCapUsd.toFixed(2)} (0 = unlimited)`,
    `Units: ${budget.monthUnits} / free-tier ${budget.caps.freeTierUnits}`,
    budget.atOrAboveAlert ? `Alert threshold (≥ ${budget.caps.alertRatio * 100}%): triggered` : "",
    budget.freeTierExceeded ? "Free-tier units exceeded — kill-switch expected." : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!to) {
    return {
      action: "none",
      message: "No alert required (missing COST_ALERT_EMAIL)",
      budget,
    };
  }

  // Cap 0 = unlimited USD — still alert on free-tier if exceeded and email set
  if (!budget.atOrAboveAlert && budget.freeTierExceeded) {
    return {
      action: "email",
      message: "Free-tier units alert",
      budget,
      to,
      subject: "VYBZ Cost Sentinel — free-tier units exceeded",
      body,
    };
  }

  if (!budget.atOrAboveAlert) {
    return { action: "none", message: "No alert required", budget };
  }

  return {
    action: "email",
    message: `Alert at ${pct} of monthly cap`,
    budget,
    to,
    subject,
    body,
  };
}
