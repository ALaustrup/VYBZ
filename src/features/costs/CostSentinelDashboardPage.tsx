import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import {
  createCostSentinel,
  getSharedCostSentinel,
  DEFAULT_THRESHOLDS,
  type CostAlert,
  type CostUsageSnapshot,
} from "@/platform/costs/sentinel";
import {
  listRecentCostEvents,
  monthTotals,
  monthlySpendByFeature,
  recordCost,
  type CostEventRow,
} from "@/platform/costs/recordCost";
import { clientBudgetCaps, evaluateBudget, type BudgetStatus } from "@/platform/costs/budget";
import { isFeatureKillSwitched } from "@/platform/costs/edgeFlags";

const FEATURE_COLORS = [
  "bg-sky-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-cyan-300",
];

type Props = {
  /** Seed demo events for local / Playwright (e2e fixture). */
  seedDemo?: boolean;
};

/**
 * Cost Sentinel dashboard — stacked monthly USD, recent events, 90% cap banner.
 * Soft-limits only; no auto-spend.
 */
export function CostSentinelDashboardPage({ seedDemo = false }: Props) {
  const [usage, setUsage] = useState<CostUsageSnapshot>(() => getSharedCostSentinel().snapshot());
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [events, setEvents] = useState<CostEventRow[]>([]);
  const [series, setSeries] = useState<
    Array<{ month: string; features: Record<string, number>; total: number }>
  >([]);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const thresholds = getSharedCostSentinel().thresholds;

  async function refresh() {
    const sentinel = getSharedCostSentinel();
    setUsage(sentinel.snapshot());
    setAlerts(sentinel.evaluate());
    setEvents(await listRecentCostEvents(40));
    setSeries(await monthlySpendByFeature(6));
    const totals = await monthTotals();
    const caps = seedDemo
      ? { monthlyCapUsd: 20, freeTierUnits: 30, alertRatio: 0.9 as const }
      : clientBudgetCaps();
    setBudget(
      evaluateBudget({
        monthSpendUsd: totals.spendUsd,
        monthUnits: totals.units,
        caps,
      })
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (seedDemo) {
        await recordCost("prepare", 4, 6, {
          caps: { monthlyCapUsd: 20, freeTierUnits: 30, alertRatio: 0.9 },
        });
        await recordCost("visual-generate", 3, 8, {
          caps: { monthlyCapUsd: 20, freeTierUnits: 30, alertRatio: 0.9 },
        });
        await recordCost("storefront-copy", 2, 5, {
          caps: { monthlyCapUsd: 20, freeTierUnits: 30, alertRatio: 0.9 },
        });
        // Force ≥90% of $20 cap
        await recordCost("processing", 1, 1, {
          caps: { monthlyCapUsd: 20, freeTierUnits: 30, alertRatio: 0.9 },
        });
      }
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [seedDemo]);

  const featureKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const m of series) Object.keys(m.features).forEach((k) => keys.add(k));
    return [...keys];
  }, [series]);

  const maxTotal = Math.max(1, ...series.map((s) => s.total));
  const showCapBanner = budget?.atOrAboveAlert === true;

  function refreshDemoAlert() {
    const probe = createCostSentinel({
      thresholds: { ...DEFAULT_THRESHOLDS, freeTierJobMinutes: 0.01 },
      sink: (a) => setAlerts((prev) => [...prev.filter((x) => x.code !== a.code), a]),
    });
    probe.record({ jobMinutes: 0.05 });
    setUsage(getSharedCostSentinel().snapshot());
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-28 md:p-8" data-testid="cost-sentinel-page">
      <div>
        <Link to="/settings" className="text-xs text-fog hover:text-snow">
          ← Settings
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-suite-cyan">Cost Sentinel</p>
        <h1 className="font-display text-2xl font-semibold text-snow">Usage & budgets</h1>
        <p className="mt-1 text-sm text-fog">
          Soft-limits and kill-switches only — no auto-spend, no live billing webhooks.
        </p>
      </div>

      {showCapBanner ? (
        <div
          className="rounded-suite border border-amber-400/40 bg-amber-400/10 px-4 py-3"
          role="alert"
          data-testid="cost-cap-alert-banner"
        >
          <p className="text-sm font-medium text-snow">
            ≥ 90% of monthly cost cap
            {budget?.caps.monthlyCapUsd
              ? ` ($${budget.monthSpendUsd.toFixed(2)} / $${budget.caps.monthlyCapUsd.toFixed(2)})`
              : ""}
          </p>
          <p className="mt-1 text-xs text-fog">
            Soft-limit active
            {budget?.capExceeded && isFeatureKillSwitched("processing")
              ? " · kill-switch set for exceeded features"
              : ""}
            . No automatic provider spend.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Usage meters">
        <Meter
          label="Job minutes"
          value={`${usage.jobMinutes.toFixed(2)} min`}
          hint={`Free tier ${thresholds.freeTierJobMinutes} · soft ${thresholds.softJobMinutes} · hard ${thresholds.hardJobMinutes}`}
        />
        <Meter
          label="Month USD"
          value={`$${(budget?.monthSpendUsd ?? 0).toFixed(2)}`}
          hint={
            budget?.caps.monthlyCapUsd
              ? `Cap $${budget.caps.monthlyCapUsd} · alert ≥ ${budget.caps.alertRatio * 100}%`
              : "Cap unlimited (COST_SENTINEL_MONTHLY_CAP_USD=0)"
          }
        />
      </section>

      <section aria-label="Monthly spend chart">
        <h2 className="mb-2 text-sm font-semibold text-snow">Monthly spend (USD)</h2>
        <div
          className="flex h-40 items-end gap-2 rounded-suite border border-white/10 bg-white/[0.03] p-4"
          data-testid="cost-stacked-chart"
        >
          {series.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1" data-testid="cost-chart-bar">
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
                style={{ height: `${Math.max(4, (m.total / maxTotal) * 100)}%` }}
                title={`$${m.total.toFixed(2)}`}
              >
                {featureKeys.map((feat, i) => {
                  const v = m.features[feat] ?? 0;
                  if (v <= 0) return null;
                  const pct = m.total > 0 ? (v / m.total) * 100 : 0;
                  return (
                    <div
                      key={feat}
                      className={`${FEATURE_COLORS[i % FEATURE_COLORS.length]} w-full`}
                      style={{ height: `${pct}%` }}
                      title={`${feat}: $${v.toFixed(2)}`}
                    />
                  );
                })}
              </div>
              <span className="text-[9px] text-fog">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
        {featureKeys.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-3 text-[11px] text-fog">
            {featureKeys.map((f, i) => (
              <li key={f} className="flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-sm ${FEATURE_COLORS[i % FEATURE_COLORS.length]}`} />
                {f}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-label="Recent cost events">
        <h2 className="mb-2 text-sm font-semibold text-snow">Recent cost events</h2>
        {events.length === 0 ? (
          <p className="text-sm text-fog" data-testid="cost-events-empty">
            No cost events yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-suite border border-white/10" data-testid="cost-events-table">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-white/10 text-[11px] uppercase tracking-wide text-fog">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Feature</th>
                  <th className="px-3 py-2 font-medium">Units</th>
                  <th className="px-3 py-2 font-medium">USD</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-white/5" data-testid="cost-event-row">
                    <td className="px-3 py-2 text-xs text-fog">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-snow">{e.feature}</td>
                    <td className="px-3 py-2 text-fog">{e.units}</td>
                    <td className="px-3 py-2 text-snow">${e.usd_estimate.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Legacy alerts">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-snow">Local meters</h2>
          <button
            type="button"
            className="suite-focus-ring rounded-suite-md border border-white/10 px-3 py-1.5 text-xs text-fog hover:text-snow"
            data-testid="cost-sentinel-refresh-demo"
            onClick={refreshDemoAlert}
          >
            Preview free-tier alert
          </button>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-fog" data-testid="cost-sentinel-empty">
            No active local alerts.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="cost-sentinel-alerts">
            {alerts.map((a) => (
              <li
                key={`${a.code}-${a.at}`}
                className="rounded-suite border border-amber-400/25 bg-amber-400/5 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="warning">{a.code}</Badge>
                  <span className="text-xs text-fog">{new Date(a.at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-snow">{a.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meter({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-suite border border-white/10 bg-white/[0.03] p-4 shadow-[var(--shadow-md)]">
      <p className="text-xs uppercase tracking-wide text-fog">{label}</p>
      <p className="mt-1 font-display text-xl text-snow" data-testid={`cost-meter-${label}`}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-fog">{hint}</p>
    </div>
  );
}
