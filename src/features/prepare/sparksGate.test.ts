/**
 * Sparks gate — artist-authored prompts answered during playback.
 *
 * The invariants that make the data worth having: the prompt lands after the
 * moment rather than on it, answer sets can always deliver bad news, silence is
 * recorded rather than inferred, aggregates never expose who answered, and the
 * dry playback contract is untouched.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY, PRINCIPLES } from "@/product/invariants";
import { SPARK_OPTION_SETS, spansPolarity } from "@/features/sparks/sparkEngine";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

/**
 * Strip comments before asserting a term is absent.
 *
 * A prose explanation of why we avoid something is not a use of it, and checking
 * raw source makes documenting a rule break the test that enforces it.
 */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Split on \r?\n: these files are CRLF, and `.` does not match \r, so a
    // trailing carriage return stops `.*$` from reaching the end of the line.
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)(--|\/\/).*$/, ""))
    .join("\n");
}

describe("sparks", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("sparks");
  });

  it("never lets an artist build a compliment machine", () => {
    for (const set of SPARK_OPTION_SETS) {
      expect(spansPolarity(set.options), set.id).toBe(true);
    }
    // The rule is enforced server-side too, so a crafted request cannot skip it.
    const sql = read("supabase/migrations/20260815_0098_track_sparks.sql");
    expect(sql).toContain("'positive' = any(polarities)");
    expect(sql).toContain("'neutral' = any(polarities)");
    expect(sql).toContain("'critical' = any(polarities)");
    expect(sql).toContain("options_not_spanning");
  });

  it("records silence instead of inferring it", () => {
    const sql = read("supabase/migrations/20260815_0098_track_sparks.sql");
    // A row exists from the moment the prompt is shown; the answer fills it in.
    expect(sql).toContain("mark_spark_shown");
    expect(sql).toContain("option_index smallint");
    expect(sql).toMatch(/option_index is null\) as \"noResponse\"/);

    const desk = read("src/features/sparks/SparkDesk.tsx");
    expect(desk).toContain("no response");
    // Never dressed up as a negative reaction in anything rendered.
    expect(code("src/features/sparks/SparkDesk.tsx")).not.toMatch(/disliked|bored|ignored/i);
  });

  it("reports counts to the owner and never who answered", () => {
    const sql = read("supabase/migrations/20260815_0098_track_sparks.sql");
    const report = sql.slice(sql.indexOf("function public.spark_report"));
    expect(report).toContain("count(r.*)");
    expect(report).not.toMatch(/r\.user_id/);
    // Individual rows stay private to the listener.
    expect(sql).toContain('create policy "spark_responses own"');
    expect(sql).toContain("using (user_id = auth.uid())");
  });

  it("keeps playback dry — the overlay only reads the clock", () => {
    const overlay = read("src/features/sparks/SparkOverlay.tsx");
    expect(overlay).toContain("getSnapshot");
    expect(overlay).not.toMatch(/createMediaElementSource|AudioContext|playbackRate/);
    expect(PRINCIPLES.playbackIsDryAndDisclosed).toBe(true);
  });

  it("ships a reversible migration", () => {
    expect(
      existsSync(path.join(ROOT, "supabase/migrations/20260815_0098_track_sparks.down.sql")),
    ).toBe(true);
  });

  it("is mounted for listeners and for the owner", () => {
    expect(read("src/App.tsx")).toContain("<SparkHost />");
    expect(read("src/pages/TrackDetailPage.tsx")).toContain("SparkDesk");
  });

  it("carries no economy yet, because the constants are not measured", () => {
    // Schema only — the header explains why charging is deferred, which is fine.
    expect(code("supabase/migrations/20260815_0098_track_sparks.sql")).not.toMatch(
      /airtime|credit|charge/i,
    );
  });
});
