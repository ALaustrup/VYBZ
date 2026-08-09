import { describe, expect, it } from "vitest";
import { MAX_ANALYZER_BATCH, analyzerWorkerCount, runWithConcurrency } from "@/features/prepare/scanConcurrency";

describe("analyzer scan concurrency", () => {
  it("caps the batch at 20", () => {
    expect(MAX_ANALYZER_BATCH).toBe(20);
  });

  it("derives workers from hardwareConcurrency", () => {
    expect(analyzerWorkerCount(0)).toBe(1);
    expect(analyzerWorkerCount(2)).toBe(1);
    expect(analyzerWorkerCount(4)).toBe(2);
    expect(analyzerWorkerCount(8)).toBe(4);
    expect(analyzerWorkerCount(32)).toBe(4);
  });

  it("runs a pool without dropping items", async () => {
    const seen: number[] = [];
    await runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      seen.push(n);
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
