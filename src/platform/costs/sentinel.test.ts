import { describe, expect, it, vi } from "vitest";
import { createCostSentinel } from "./sentinel";

describe("cost sentinel", () => {
  it("emits sample alert without network when soft minutes exceeded", () => {
    const sink = vi.fn();
    const sentinel = createCostSentinel({
      thresholds: {
        freeTierJobMinutes: 999,
        softJobMinutes: 1,
        hardJobMinutes: 10,
        softStorageBytes: 1000,
        hardStorageBytes: 5000,
      },
      sink,
    });
    const alerts = sentinel.record({ jobMinutes: 1.5, storageBytes: 10 });
    expect(alerts.some((a) => a.code === "JOB_MINUTES_SOFT")).toBe(true);
    expect(sink).toHaveBeenCalled();
    expect(sentinel.snapshot().jobMinutes).toBe(1.5);
  });

  it("emits storage soft alert", () => {
    const alerts: string[] = [];
    const sentinel = createCostSentinel({
      thresholds: {
        freeTierJobMinutes: 999,
        softJobMinutes: 999,
        hardJobMinutes: 9999,
        softStorageBytes: 100,
        hardStorageBytes: 1000,
      },
      sink: (a) => alerts.push(a.code),
    });
    sentinel.record({ storageBytes: 150 });
    expect(alerts).toContain("STORAGE_SOFT");
  });

  it("emits free-tier alert when job minutes exceed allowance (no auto-spend)", () => {
    const sink = vi.fn();
    const sentinel = createCostSentinel({
      thresholds: {
        freeTierJobMinutes: 1,
        softJobMinutes: 100,
        hardJobMinutes: 200,
        softStorageBytes: 1e12,
        hardStorageBytes: 2e12,
      },
      sink,
    });
    const alerts = sentinel.record({ jobMinutes: 1.5 });
    expect(alerts.some((a) => a.code === "FREE_TIER_JOB_MINUTES")).toBe(true);
    expect(sink).toHaveBeenCalled();
  });
});
