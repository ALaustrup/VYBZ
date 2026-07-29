import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const up = readFileSync(
  path.resolve(__dirname, "../../../../supabase/migrations/20260728_0082_release_credits.sql"),
  "utf8"
);
const down = readFileSync(
  path.resolve(__dirname, "../../../../supabase/migrations/20260728_0082_release_credits.down.sql"),
  "utf8"
);

describe("release_credits RLS policy proofs", () => {
  it("enables RLS and owner policies", () => {
    expect(up).toMatch(/alter table public\.release_credits enable row level security/);
    expect(up).toContain("release_credits select own");
    expect(up).toContain("release_credits insert own");
    expect(up).toContain("owner_id = auth.uid()");
  });

  it("down drops the table", () => {
    expect(down).toContain("drop table if exists public.release_credits");
  });
});
