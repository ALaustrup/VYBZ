import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const up = readFileSync(
  path.resolve(__dirname, "../../../../supabase/migrations/20260728_0081_release_projects.sql"),
  "utf8"
);
const down = readFileSync(
  path.resolve(__dirname, "../../../../supabase/migrations/20260728_0081_release_projects.down.sql"),
  "utf8"
);

describe("release_projects RLS policy proofs (SQL contract)", () => {
  it("enables RLS on all Prepare tables", () => {
    expect(up).toMatch(/alter table public\.release_projects enable row level security/);
    expect(up).toMatch(/alter table public\.release_assets enable row level security/);
    expect(up).toMatch(/alter table public\.release_findings enable row level security/);
  });

  it("scopes select/insert/update/delete to owner_id = auth.uid()", () => {
    for (const table of ["release_projects", "release_assets", "release_findings"]) {
      expect(up).toContain(`${table} select own`);
      expect(up).toContain(`${table} insert own`);
      expect(up).toContain(`${table} update own`);
      expect(up).toContain(`${table} delete own`);
    }
    expect(up.match(/owner_id = auth\.uid\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });

  it("does not grant anon write access", () => {
    expect(up).not.toMatch(/grant insert.*to anon/i);
    expect(up).not.toMatch(/to anon.*insert/i);
  });

  it("down migration drops Prepare tables", () => {
    expect(down).toContain("drop table if exists public.release_findings");
    expect(down).toContain("drop table if exists public.release_assets");
    expect(down).toContain("drop table if exists public.release_projects");
  });
});
