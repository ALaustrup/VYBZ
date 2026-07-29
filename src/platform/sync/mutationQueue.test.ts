import { describe, expect, it } from "vitest";
import { createMemoryMutationQueue, detectMutationConflict } from "@/platform/sync";

describe("mutation queue conflicts", () => {
  it("dedupes identical idempotency keys", async () => {
    const q = createMemoryMutationQueue();
    const a = await q.enqueue({
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName"] },
      idempotencyKey: "k1",
    });
    const b = await q.enqueue({
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName"] },
      idempotencyKey: "k1",
    });
    expect(a.id).toBe(b.id);
    expect((await q.list()).length).toBe(1);
  });

  it("flags same-field race on one credit", async () => {
    const q = createMemoryMutationQueue();
    await q.enqueue({
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName", "role"] },
      idempotencyKey: "a",
      baseVersion: "v1",
    });
    const conflict = detectMutationConflict(await q.list(), {
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName"] },
      idempotencyKey: "b",
      baseVersion: "v2",
    });
    expect(conflict?.type).toBe("same_field_race");
    if (conflict?.type === "same_field_race") expect(conflict.field).toBe("displayName");
  });

  it("allows independent field edits on different credits", async () => {
    const q = createMemoryMutationQueue();
    await q.enqueue({
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c1", fields: ["displayName"] },
      idempotencyKey: "a",
    });
    const conflict = detectMutationConflict(await q.list(), {
      userId: "u",
      projectId: "p",
      operation: "credit.update",
      payload: { creditId: "c2", fields: ["displayName"] },
      idempotencyKey: "b",
    });
    expect(conflict).toBeNull();
  });
});
