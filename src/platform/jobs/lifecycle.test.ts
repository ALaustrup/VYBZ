import { describe, expect, it } from "vitest";
import { createDraftJob, canTransition, runPortableAnalyzeLifecycle, transitionJob } from "./lifecycle";

describe("job lifecycle contract", () => {
  it("allows draft → validating → queued → running → completed", () => {
    const job = createDraftJob({
      type: "analyze_audio",
      ownerId: "u1",
      idempotencyKey: "k1",
    });
    const done = runPortableAnalyzeLifecycle(job);
    expect(done.state).toBe("completed");
    expect(done.actualCostCents).toBe(0);
  });

  it("rejects illegal transitions", () => {
    const job = createDraftJob({
      type: "analyze_audio",
      ownerId: "u1",
      idempotencyKey: "k2",
    });
    expect(canTransition("draft", "completed")).toBe(false);
    expect(() => transitionJob(job, "completed")).toThrow(/Invalid job transition/);
  });

  it("supports cancel from queued", () => {
    let job = createDraftJob({ type: "x", ownerId: "u", idempotencyKey: "c" });
    job = transitionJob(job, "validating");
    job = transitionJob(job, "queued");
    job = transitionJob(job, "cancelled");
    expect(job.state).toBe("cancelled");
  });
});
