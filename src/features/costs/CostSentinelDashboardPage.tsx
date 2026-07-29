import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import {
  createCostSentinel,
  getSharedCostSentinel,
  DEFAULT_THRESHOLDS,
  type CostAlert,
  type CostUsageSnapshot,
} from "@/platform/costs/sentinel";

/**
 * Read-only Cost Sentinel dashboard — local usage + thresholds.
 * No spend controls; no provider network calls.
 */
export function CostSentinelDashboardPage() {
  const [usage, setUsage] = useState<CostUsageSnapshot>(() => getSharedCostSentinel().snapshot());
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const thresholds = getSharedCostSentinel().thresholds;

  useEffect(() => {
    const sentinel = getSharedCostSentinel();
    setUsage(sentinel.snapshot());
    // Re-evaluate for display; does not invent spend.
    const current = sentinel.evaluate();
    setAlerts(current);
  }, []);

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
        <h1 className="font-display text-2xl font-semibold text-snow">Usage & alerts</h1>
        <p className="mt-1 text-sm text-fog">
          Tracks job minutes and storage locally. Alerts are log-only — no auto-spend, no provider calls.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Usage meters">
        <Meter
          label="Job minutes"
          value={`${usage.jobMinutes.toFixed(2)} min`}
          hint={`Free tier ${thresholds.freeTierJobMinutes} · soft ${thresholds.softJobMinutes} · hard ${thresholds.hardJobMinutes}`}
        />
        <Meter
          label="Storage"
          value={formatBytes(usage.storageBytes)}
          hint={`Soft ${formatBytes(thresholds.softStorageBytes)} · hard ${formatBytes(thresholds.hardStorageBytes)}`}
        />
      </section>

      <section aria-label="Alerts">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-snow">Alerts</h2>
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
            No active alerts.
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

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
