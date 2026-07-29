/**
 * Cost Sentinel — tracks job minutes + storage locally; emits alerts via callback/log only.
 * Never opens network sockets or calls paid providers. No auto-spend.
 */

export type CostUsageSnapshot = {
  jobMinutes: number;
  storageBytes: number;
  updatedAt: string;
};

export type CostAlert = {
  code:
    | "JOB_MINUTES_SOFT"
    | "STORAGE_SOFT"
    | "JOB_MINUTES_HARD"
    | "STORAGE_HARD"
    | "FREE_TIER_JOB_MINUTES";
  message: string;
  usage: CostUsageSnapshot;
  threshold: number;
  at: string;
};

export type CostSentinelThresholds = {
  /** Soft alert when remote/portable job minutes exceed free-tier allowance. */
  freeTierJobMinutes: number;
  softJobMinutes: number;
  hardJobMinutes: number;
  softStorageBytes: number;
  hardStorageBytes: number;
};

export const DEFAULT_THRESHOLDS: CostSentinelThresholds = {
  freeTierJobMinutes: 30,
  softJobMinutes: 60,
  hardJobMinutes: 240,
  softStorageBytes: 5 * 1024 * 1024 * 1024,
  hardStorageBytes: 20 * 1024 * 1024 * 1024,
};

export type CostAlertSink = (alert: CostAlert) => void;

export function createCostSentinel(opts?: {
  thresholds?: Partial<CostSentinelThresholds>;
  sink?: CostAlertSink;
}) {
  const thresholds: CostSentinelThresholds = { ...DEFAULT_THRESHOLDS, ...opts?.thresholds };
  const sink: CostAlertSink =
    opts?.sink ??
    ((alert) => {
      console.info(`[cost-sentinel] ${alert.code}: ${alert.message}`);
    });

  let usage: CostUsageSnapshot = {
    jobMinutes: 0,
    storageBytes: 0,
    updatedAt: new Date().toISOString(),
  };

  function snapshot(): CostUsageSnapshot {
    return { ...usage };
  }

  function record(delta: { jobMinutes?: number; storageBytes?: number }): CostAlert[] {
    usage = {
      jobMinutes: usage.jobMinutes + Math.max(0, delta.jobMinutes ?? 0),
      storageBytes: usage.storageBytes + Math.max(0, delta.storageBytes ?? 0),
      updatedAt: new Date().toISOString(),
    };
    return evaluate();
  }

  function evaluate(): CostAlert[] {
    const alerts: CostAlert[] = [];
    const at = new Date().toISOString();
    const push = (code: CostAlert["code"], threshold: number, message: string) => {
      const alert: CostAlert = { code, message, usage: snapshot(), threshold, at };
      alerts.push(alert);
      sink(alert);
    };

    if (usage.jobMinutes >= thresholds.hardJobMinutes) {
      push(
        "JOB_MINUTES_HARD",
        thresholds.hardJobMinutes,
        `Job minutes hit hard cap (${usage.jobMinutes.toFixed(2)} ≥ ${thresholds.hardJobMinutes})`
      );
    } else if (usage.jobMinutes >= thresholds.softJobMinutes) {
      push(
        "JOB_MINUTES_SOFT",
        thresholds.softJobMinutes,
        `Job minutes soft alert (${usage.jobMinutes.toFixed(2)} ≥ ${thresholds.softJobMinutes})`
      );
    } else if (usage.jobMinutes > thresholds.freeTierJobMinutes) {
      push(
        "FREE_TIER_JOB_MINUTES",
        thresholds.freeTierJobMinutes,
        `Remote job minutes (${usage.jobMinutes.toFixed(2)}) exceed free tier (${thresholds.freeTierJobMinutes}). No auto-spend.`
      );
    }

    if (usage.storageBytes >= thresholds.hardStorageBytes) {
      push(
        "STORAGE_HARD",
        thresholds.hardStorageBytes,
        `Storage hit hard cap (${usage.storageBytes} ≥ ${thresholds.hardStorageBytes})`
      );
    } else if (usage.storageBytes >= thresholds.softStorageBytes) {
      push(
        "STORAGE_SOFT",
        thresholds.softStorageBytes,
        `Storage soft alert (${usage.storageBytes} ≥ ${thresholds.softStorageBytes})`
      );
    }

    return alerts;
  }

  function reset() {
    usage = { jobMinutes: 0, storageBytes: 0, updatedAt: new Date().toISOString() };
  }

  return { snapshot, record, evaluate, reset, thresholds };
}

export type CostSentinel = ReturnType<typeof createCostSentinel>;

let shared: CostSentinel | null = null;

export function getSharedCostSentinel(): CostSentinel {
  if (!shared) shared = createCostSentinel();
  return shared;
}

export function resetSharedCostSentinel(): void {
  shared = null;
}
