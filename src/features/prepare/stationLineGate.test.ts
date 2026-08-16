/**
 * Station line gate — Phase 3, first slice.
 *
 * Vibes Radio refilled its queue by picking a random pool row, which meant an
 * artist could never be told when their track would play. The line makes that a
 * fact: first in, first out, with a total order so ties cannot silently reorder.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");
const MIGRATION = "supabase/migrations/20260815_0101_station_airings.sql";

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)(--|\/\/).*$/, ""))
    .join("\n");
}

describe("station line", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("stationLine");
  });

  it("orders the line totally so ties cannot reorder it", () => {
    // Two submissions inside one transaction share now(); without the id in the
    // comparison, both report the same position and the order is arbitrary.
    const sql = read("supabase/migrations/20260815_0102_station_line_total_order.sql");
    expect(sql).toContain("(o.submitted_at, o.id) < (s.submitted_at, s.id)");
    expect(sql).toContain("order by a.submitted_at, a.id");
  });

  it("keeps one live submission per track", () => {
    const sql = read(MIGRATION);
    expect(sql).toContain("station_airings_one_live_per_drop");
    expect(sql).toContain("already_in_line");
  });

  it("refuses to broadcast a track that is not public", () => {
    const sql = read(MIGRATION);
    expect(sql).toContain("not_public");
    expect(sql).toMatch(/coalesce\(d\.audience, 'public'\) <> 'public'/);
  });

  it("only the owner can submit or cancel their own track", () => {
    const sql = read(MIGRATION);
    expect(sql).toContain("not_owner");
    expect(sql).toContain("owner_id = auth.uid()");
  });

  it("keeps claiming server-side only", () => {
    const sql = read(MIGRATION);
    // A client that could claim could jump the line.
    expect(sql).toMatch(
      /revoke all on function public\.claim_next_airing\(\) from public, anon, authenticated/,
    );
    expect(sql).toContain("grant execute on function public.claim_next_airing() to service_role");
    expect(sql).toContain("for update skip locked");
  });

  it("labels the wait as an estimate rather than a promised time", () => {
    const sql = read(MIGRATION);
    expect(sql).toContain("estimatedWaitSec");
    // No wall-clock airtime is promised, because the station also plays bumpers
    // and some tracks have no recorded duration.
    expect(code(MIGRATION)).not.toMatch(/airs_at|scheduled_for/);
  });

  it("ships reversible", () => {
    expect(
      existsSync(path.join(ROOT, "supabase/migrations/20260815_0101_station_airings.down.sql")),
    ).toBe(true);
  });
});
