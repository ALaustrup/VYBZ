import { describe, expect, it } from "vitest";
import {
  buildActionItems,
  buildStats,
  nextStepFor,
  recentReleases,
} from "@/lib/dashboardModel";
import type { ReleaseProject } from "@vybz/domain/releases";
import type { StorefrontOrder } from "@/features/storefront/types";
import type { Drop } from "@/types";

function drop(over: Partial<Drop> & { id: string }): Drop {
  return {
    authorId: "u1",
    authorUsername: "ada",
    title: "Track",
    body: null,
    seed: 1,
    feels: 0,
    wilds: 0,
    createdAt: Date.UTC(2026, 7, 1),
    assetId: "asset",
    plays: 0,
    ...over,
  };
}

function release(over: Partial<ReleaseProject> & { id: string }): ReleaseProject {
  return {
    ownerId: "u1",
    title: "Release",
    artistName: "Ada",
    status: "draft",
    metadata: {},
    idempotencyKey: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    deletedAt: null,
    ...over,
  };
}

function order(over: Partial<StorefrontOrder> & { id: string }): StorefrontOrder {
  return {
    pack_id: "p1",
    buyer_email: "b@example.com",
    buyer_user_id: null,
    amount_cents: 1000,
    application_fee_cents: 100,
    stripe_session_id: null,
    stripe_payment_intent: null,
    status: "paid",
    settlement_status: "pending_manual",
    fulfilled_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
    ...over,
  } as StorefrontOrder;
}

const EMPTY = { drops: [], releases: [], orders: [] };

describe("buildStats", () => {
  it("counts tracks, releases and plays from stored fields", () => {
    const stats = buildStats(
      [drop({ id: "a", plays: 10 }), drop({ id: "b", plays: 5 })],
      [release({ id: "r1", status: "ready" }), release({ id: "r2", status: "blocked" })]
    );
    expect(stats.tracks).toBe(2);
    expect(stats.totalPlays).toBe(15);
    expect(stats.releases).toBe(2);
    expect(stats.releasesReady).toBe(1);
    expect(stats.releasesBlocked).toBe(1);
  });

  it("excludes archived releases from every release count", () => {
    const stats = buildStats([], [release({ id: "r1", status: "archived" })]);
    expect(stats.releases).toBe(0);
  });

  it("counts untitled tracks and tracks with no file", () => {
    const stats = buildStats(
      [drop({ id: "a", title: null }), drop({ id: "b", title: "  " }), drop({ id: "c", assetId: null })],
      []
    );
    expect(stats.tracksUntitled).toBe(2);
    expect(stats.tracksWithoutFile).toBe(1);
  });

  it("reports zeroes for an empty account rather than throwing", () => {
    const stats = buildStats([], []);
    expect(stats).toMatchObject({ tracks: 0, releases: 0, totalPlays: 0 });
  });
});

describe("buildActionItems", () => {
  it("produces nothing for an account with nothing outstanding", () => {
    expect(buildActionItems(EMPTY)).toEqual([]);
  });

  it("does not invent work for a tidy account", () => {
    const items = buildActionItems({
      drops: [drop({ id: "a" })],
      releases: [release({ id: "r1", status: "ready" })],
      orders: [order({ id: "o1", settlement_status: "settled_off_platform" })],
    });
    expect(items).toEqual([]);
  });

  it("raises blocked releases as the highest severity", () => {
    const items = buildActionItems({
      ...EMPTY,
      releases: [release({ id: "r1", status: "blocked", title: "Neon Rain" })],
    });
    expect(items[0]!.id).toBe("releases-blocked");
    expect(items[0]!.severity).toBe("blocking");
    expect(items[0]!.title).toContain("Neon Rain");
    expect(items[0]!.href).toBe("/release/r1");
  });

  it("links to the list rather than one release when several are blocked", () => {
    const items = buildActionItems({
      ...EMPTY,
      releases: [release({ id: "r1", status: "blocked" }), release({ id: "r2", status: "blocked" })],
    });
    expect(items[0]!.href).toBe("/releases");
    expect(items[0]!.count).toBe(2);
  });

  it("sorts blocking before attention before suggestion", () => {
    const items = buildActionItems({
      drops: [drop({ id: "a", assetId: null })],
      releases: [release({ id: "r1", status: "blocked" }), release({ id: "r2", status: "draft" })],
      orders: [],
    });
    expect(items.map((i) => i.severity)).toEqual(["blocking", "attention", "suggestion"]);
  });

  it("flags only paid orders that are not yet settled", () => {
    const items = buildActionItems({
      ...EMPTY,
      orders: [
        order({ id: "o1", status: "paid", settlement_status: "pending_manual" }),
        order({ id: "o2", status: "paid", settlement_status: "settled_off_platform" }),
        order({ id: "o3", status: "pending", settlement_status: "pending_manual" }),
      ],
    });
    const settle = items.find((i) => i.id === "orders-pending-settlement");
    expect(settle?.count).toBe(1);
  });

  it("flags untitled tracks", () => {
    const items = buildActionItems({ ...EMPTY, drops: [drop({ id: "a", title: null })] });
    expect(items.find((i) => i.id === "tracks-untitled")?.count).toBe(1);
  });

  it("suggests a first scan only when tracks exist but no release does", () => {
    const withTracks = buildActionItems({ ...EMPTY, drops: [drop({ id: "a" })] });
    expect(withTracks.some((i) => i.id === "no-releases")).toBe(true);

    const withRelease = buildActionItems({
      ...EMPTY,
      drops: [drop({ id: "a" })],
      releases: [release({ id: "r1", status: "ready" })],
    });
    expect(withRelease.some((i) => i.id === "no-releases")).toBe(false);

    expect(buildActionItems(EMPTY).some((i) => i.id === "no-releases")).toBe(false);
  });

  it("gives every item a destination and an action label", () => {
    const items = buildActionItems({
      drops: [drop({ id: "a", title: null, assetId: null })],
      releases: [release({ id: "r1", status: "blocked" }), release({ id: "r2", status: "draft" })],
      orders: [order({ id: "o1" })],
    });
    expect(items.length).toBeGreaterThan(3);
    for (const item of items) {
      expect(item.href.startsWith("/")).toBe(true);
      expect(item.actionLabel.length).toBeGreaterThan(2);
      expect(item.detail.length).toBeGreaterThan(10);
      expect(item.count).toBeGreaterThan(0);
    }
  });

  it("ignores archived releases entirely", () => {
    const items = buildActionItems({
      ...EMPTY,
      releases: [release({ id: "r1", status: "archived" })],
    });
    expect(items).toEqual([]);
  });
});

describe("recentReleases", () => {
  it("orders by most recently updated and drops archived", () => {
    const list = recentReleases([
      release({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      release({ id: "new", updatedAt: "2026-08-01T00:00:00.000Z" }),
      release({ id: "gone", status: "archived", updatedAt: "2026-09-01T00:00:00.000Z" }),
    ]);
    expect(list.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 10 }, (_, i) => release({ id: `r${i}` }));
    expect(recentReleases(many, 3)).toHaveLength(3);
  });
});

describe("nextStepFor", () => {
  it("names a concrete next step per status", () => {
    expect(nextStepFor(release({ id: "a", status: "blocked" }))).toMatch(/resolve/i);
    expect(nextStepFor(release({ id: "a", status: "draft" }))).toMatch(/review/i);
    expect(nextStepFor(release({ id: "a", status: "ready" }))).toMatch(/package/i);
    expect(nextStepFor(release({ id: "a", status: "scanning" }))).toMatch(/progress/i);
  });
});
