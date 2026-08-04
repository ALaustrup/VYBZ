import { describe, expect, it, vi } from "vitest";
import { describeOutcome, runBatch, type BatchProgress } from "@/lib/batchRunner";

describe("runBatch", () => {
  it("runs every item and reports full success", async () => {
    const work = vi.fn(async () => {});
    const out = await runBatch(["a", "b", "c"], work);
    expect(work).toHaveBeenCalledTimes(3);
    expect(out.succeeded).toEqual(["a", "b", "c"]);
    expect(out.failed).toEqual([]);
    expect(out.skipped).toEqual([]);
    expect(out.cancelled).toBe(false);
  });

  it("runs items one at a time rather than in parallel", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await runBatch(["a", "b", "c"], async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });
    expect(maxInFlight).toBe(1);
  });

  it("keeps going after a failure and reports partial success", async () => {
    const out = await runBatch(["a", "b", "c"], async (id) => {
      if (id === "b") throw new Error("nope");
    });
    expect(out.succeeded).toEqual(["a", "c"]);
    expect(out.failed).toEqual([{ id: "b", ok: false, error: "nope" }]);
    expect(out.cancelled).toBe(false);
  });

  it("never reports an item as succeeded when its work threw", async () => {
    const out = await runBatch(["a"], async () => {
      throw new Error("boom");
    });
    expect(out.succeeded).toEqual([]);
    expect(out.failed[0]?.error).toBe("boom");
  });

  it("stops before the next item when cancelled and lists the rest as skipped", async () => {
    let cancel = false;
    const out = await runBatch(
      ["a", "b", "c", "d"],
      async (id) => {
        if (id === "b") cancel = true;
      },
      { shouldCancel: () => cancel }
    );
    expect(out.succeeded).toEqual(["a", "b"]);
    expect(out.skipped).toEqual(["c", "d"]);
    expect(out.cancelled).toBe(true);
  });

  it("emits progress with an initial zero state and one update per item", async () => {
    const seen: BatchProgress[] = [];
    await runBatch(["a", "b"], async () => {}, { onProgress: (p) => seen.push({ ...p }) });
    expect(seen[0]).toMatchObject({ done: 0, total: 2, succeeded: 0, failed: 0 });
    expect(seen).toHaveLength(3);
    expect(seen[seen.length - 1]).toMatchObject({ done: 2, total: 2, succeeded: 2, failed: 0 });
  });

  it("counts failures in progress", async () => {
    const seen: BatchProgress[] = [];
    await runBatch(["a", "b"], async (id) => {
      if (id === "a") throw new Error("x");
    }, { onProgress: (p) => seen.push({ ...p }) });
    expect(seen[seen.length - 1]).toMatchObject({ succeeded: 1, failed: 1 });
  });

  it("handles an empty selection without calling work", async () => {
    const work = vi.fn(async () => {});
    const out = await runBatch([], work);
    expect(work).not.toHaveBeenCalled();
    expect(out.succeeded).toEqual([]);
  });
});

describe("describeOutcome", () => {
  const base = { results: [], succeeded: [], failed: [], skipped: [], cancelled: false };

  it("describes complete success", () => {
    expect(describeOutcome({ ...base, succeeded: ["a", "b"] }, "deleted")).toBe("2 items deleted.");
    expect(describeOutcome({ ...base, succeeded: ["a"] }, "deleted")).toBe("1 item deleted.");
  });

  it("describes total failure without claiming any success", () => {
    const msg = describeOutcome(
      { ...base, failed: [{ id: "a", ok: false }, { id: "b", ok: false }] },
      "deleted"
    );
    expect(msg).toBe("None deleted — all 2 failed.");
  });

  it("describes partial success with both counts", () => {
    const msg = describeOutcome(
      { ...base, succeeded: ["a"], failed: [{ id: "b", ok: false }] },
      "downloaded"
    );
    expect(msg).toBe("1 downloaded, 1 failed.");
  });

  it("describes cancellation before anything ran", () => {
    expect(describeOutcome({ ...base, cancelled: true, skipped: ["a"] }, "deleted")).toBe(
      "Cancelled — nothing was deleted."
    );
  });

  it("describes cancellation part-way through", () => {
    const msg = describeOutcome(
      { ...base, cancelled: true, succeeded: ["a"], skipped: ["b", "c"] },
      "deleted"
    );
    expect(msg).toContain("Cancelled after deleted 1");
    expect(msg).toContain("2 left untouched");
  });
});
