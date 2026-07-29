import { describe, expect, it } from "vitest";
import { createLocalReleasesRepository } from "@vybz/data/releases";

function memoryKv() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

describe("local releases repository", () => {
  it("creates idempotently and survives reload", async () => {
    const kv = memoryKv();
    const a = createLocalReleasesRepository(kv);
    const first = await a.createProject({
      ownerId: "u1",
      title: "One",
      idempotencyKey: "same",
    });
    const second = await a.createProject({
      ownerId: "u1",
      title: "Two",
      idempotencyKey: "same",
    });
    expect(second.id).toBe(first.id);

    const b = createLocalReleasesRepository(kv);
    const list = await b.listProjects("u1");
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe("One");
  });

  it("isolates owners", async () => {
    const repo = createLocalReleasesRepository(memoryKv());
    await repo.createProject({ ownerId: "a", title: "A" });
    await repo.createProject({ ownerId: "b", title: "B" });
    expect(await repo.listProjects("a")).toHaveLength(1);
    expect(await repo.listProjects("b")).toHaveLength(1);
  });
});
