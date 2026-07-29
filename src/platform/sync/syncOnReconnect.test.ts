import { describe, expect, it } from "vitest";
import { createMemoryMutationQueue } from "./mutationQueue";
import { createSyncOrchestrator } from "./syncOnReconnect";

describe("sync on reconnect", () => {
  it("applies queued mutations when flush runs", async () => {
    const queue = createMemoryMutationQueue();
    const applied: string[] = [];
    const orch = createSyncOrchestrator({
      queue,
      apply: async (m) => {
        applied.push(m.idempotencyKey);
        return { status: "applied" };
      },
    });

    await queue.enqueue({
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName"], patch: { displayName: "Ada" } },
      idempotencyKey: "k1",
      baseVersion: "v1",
    });

    const result = await orch.flush();
    expect(result.applied).toBe(1);
    expect(applied).toEqual(["k1"]);
    expect(await queue.list()).toHaveLength(0);
  });

  it("surfaces same-field races as conflicts and resolves mine/theirs", async () => {
    const queue = createMemoryMutationQueue();
    const resolved: string[] = [];
    const orch = createSyncOrchestrator({
      queue,
      apply: async () => ({ status: "applied" }),
      onResolve: async (c, choice) => {
        resolved.push(`${c.field}:${choice}`);
      },
    });

    await queue.enqueue({
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName"], patch: { displayName: "Mine" } },
      idempotencyKey: "a",
      baseVersion: "v1",
    });
    await queue.enqueue({
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName"], patch: { displayName: "Theirs" } },
      idempotencyKey: "b",
      baseVersion: "v2",
    });

    const result = await orch.flush();
    expect(result.conflicts.length).toBeGreaterThan(0);
    const conflict = orch.listConflicts()[0]!;
    await orch.resolve(conflict.id, "mine");
    expect(orch.listConflicts()).toHaveLength(0);
    expect(resolved[0]).toContain("mine");
  });

  it("accepts injected conflicts for UI fixtures", async () => {
    const queue = createMemoryMutationQueue();
    const orch = createSyncOrchestrator({
      queue,
      apply: async () => ({ status: "applied" }),
    });
    const c = orch.pushConflict({
      projectId: "p",
      field: "displayName",
      operation: "credit.update",
      mutationId: "m1",
      mine: "Mine",
      theirs: "Theirs",
      minePayload: { displayName: "Mine" },
      theirsPayload: { displayName: "Theirs" },
    });
    expect(orch.listConflicts()).toHaveLength(1);
    await orch.resolve(c.id, "theirs");
    expect(orch.listConflicts()).toHaveLength(0);
  });
});
