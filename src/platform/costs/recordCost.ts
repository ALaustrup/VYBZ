/**
 * recordCost(feature, units, dollars?) — Cost Sentinel collector (Phase 14).
 * Memory store for local/e2e; optional Supabase RPC when session available.
 */

import { applyKillSwitchLocal } from "./edgeFlags";
import {
  clientBudgetCaps,
  evaluateBudget,
  type BudgetStatus,
} from "./budget";
import { getSharedCostSentinel } from "./sentinel";

export type CostEventRow = {
  id: string;
  user_id: string | null;
  feature: string;
  units: number;
  usd_estimate: number;
  created_at: string;
  meta?: Record<string, unknown>;
};

export type CostEventStore = {
  list(): Promise<CostEventRow[]>;
  insert(row: Omit<CostEventRow, "id" | "created_at"> & { id?: string; created_at?: string }): Promise<CostEventRow>;
};

function memoryStore(): CostEventStore {
  let rows: CostEventRow[] = [];
  return {
    async list() {
      return rows.map((r) => ({ ...r }));
    },
    async insert(input) {
      const row: CostEventRow = {
        id: input.id ?? crypto.randomUUID(),
        user_id: input.user_id,
        feature: input.feature,
        units: input.units,
        usd_estimate: input.usd_estimate,
        created_at: input.created_at ?? new Date().toISOString(),
        meta: input.meta,
      };
      rows = [row, ...rows];
      return { ...row };
    },
  };
}

let store: CostEventStore = memoryStore();

export function setCostEventStore(next: CostEventStore): void {
  store = next;
}

export function resetCostEventStore(): void {
  store = memoryStore();
}

export function getCostEventStore(): CostEventStore {
  return store;
}

function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function monthTotals(rows?: CostEventRow[]): Promise<{
  spendUsd: number;
  units: number;
  byFeature: Record<string, { usd: number; units: number }>;
}> {
  const all = rows ?? (await store.list());
  const start = startOfUtcMonth().getTime();
  const byFeature: Record<string, { usd: number; units: number }> = {};
  let spendUsd = 0;
  let units = 0;
  for (const r of all) {
    if (new Date(r.created_at).getTime() < start) continue;
    spendUsd += r.usd_estimate;
    units += r.units;
    const slot = byFeature[r.feature] ?? { usd: 0, units: 0 };
    slot.usd += r.usd_estimate;
    slot.units += r.units;
    byFeature[r.feature] = slot;
  }
  return { spendUsd, units, byFeature };
}

export type RecordCostResult = {
  event: CostEventRow;
  budget: BudgetStatus;
  killSwitch?: { flag_name: string; enabled: boolean; reason?: string | null };
};

/**
 * Insert a cost event and enforce soft-limits (90% alert + kill-switch on exceed).
 */
export async function recordCost(
  feature: string,
  units: number,
  dollars?: number,
  opts?: { userId?: string | null; meta?: Record<string, unknown>; caps?: ReturnType<typeof clientBudgetCaps> }
): Promise<RecordCostResult> {
  const feat = feature.trim().toLowerCase() || "unknown";
  const usd = Math.max(0, dollars ?? 0);
  const u = Math.max(0, units);

  const event = await store.insert({
    user_id: opts?.userId ?? null,
    feature: feat,
    units: u,
    usd_estimate: usd,
    meta: opts?.meta,
  });

  // Keep legacy local sentinel meters roughly in sync (minutes heuristic).
  getSharedCostSentinel().record({ jobMinutes: u > 0 && usd === 0 ? u : 0 });

  const totals = await monthTotals();
  const caps = opts?.caps ?? clientBudgetCaps();
  const budget = evaluateBudget({
    monthSpendUsd: totals.spendUsd,
    monthUnits: totals.units,
    caps,
  });

  let killSwitch: RecordCostResult["killSwitch"];
  if (budget.capExceeded || budget.freeTierExceeded) {
    killSwitch = applyKillSwitchLocal(
      feat,
      budget.capExceeded ? "monthly_cap_exceeded" : "free_tier_units_exceeded"
    );
  }

  return { event, budget, killSwitch };
}

export async function listRecentCostEvents(limit = 50): Promise<CostEventRow[]> {
  const all = await store.list();
  return all.slice(0, limit);
}

/** Stacked-bar month series: last N months of usd_estimate by feature. */
export async function monthlySpendByFeature(months = 6): Promise<
  Array<{ month: string; features: Record<string, number>; total: number }>
> {
  const all = await store.list();
  const now = new Date();
  const series: Array<{ month: string; features: Record<string, number>; total: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const start = d.getTime();
    const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    const features: Record<string, number> = {};
    let total = 0;
    for (const r of all) {
      const t = new Date(r.created_at).getTime();
      if (t < start || t >= end) continue;
      features[r.feature] = (features[r.feature] ?? 0) + r.usd_estimate;
      total += r.usd_estimate;
    }
    series.push({ month: key, features, total });
  }
  return series;
}
