import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DOTS_LEAD_SEC,
  MAX_SPARKS_PER_TRACK,
  MIN_SPARK_SPACING_SEC,
  SPARK_OPTION_SETS,
  SPARK_WINDOW_SEC,
  activeSpark,
  optionSetById,
  rejectPlacement,
  spansPolarity,
  sparkStateAt,
  suggestedPositions,
  type Spark,
} from "./sparkEngine";

function spark(id: string, positionSec: number): Spark {
  const set = SPARK_OPTION_SETS[0]!;
  return { id, positionSec, question: set.question, options: set.options };
}

describe("spark timing", () => {
  const s = spark("a", 100);

  it("leaves room to notice, read and decide", () => {
    // 8s was tried on production and missed. Noticing, reading the question and
    // weighing three options while music plays does not fit in single digits.
    expect(SPARK_WINDOW_SEC).toBeGreaterThanOrEqual(15);
    expect(DOTS_LEAD_SEC).toBeGreaterThanOrEqual(5);
  });

  it("never lets one prompt open while another is still live", () => {
    expect(MIN_SPARK_SPACING_SEC).toBeGreaterThan(DOTS_LEAD_SEC + SPARK_WINDOW_SEC);
  });

  it("is idle well before the moment", () => {
    expect(sparkStateAt(s, 0).phase).toBe("idle");
    expect(sparkStateAt(s, 100 - DOTS_LEAD_SEC - 0.1).phase).toBe("idle");
  });

  it("shows dots across the passage, never the prompt", () => {
    expect(sparkStateAt(s, 100 - DOTS_LEAD_SEC).phase).toBe("dots");
    expect(sparkStateAt(s, 99.9).phase).toBe("dots");
    // Halfway through the lead-in.
    expect(sparkStateAt(s, 100 - DOTS_LEAD_SEC / 2).progress).toBeCloseTo(0.5, 5);
  });

  it("lands the prompt after the moment, not during it", () => {
    // The instant the passage ends, and not a moment earlier.
    expect(sparkStateAt(s, 100).phase).toBe("live");
    expect(sparkStateAt(s, 99.999).phase).toBe("dots");
  });

  it("fills the ring across the window and then bursts", () => {
    expect(sparkStateAt(s, 100).progress).toBe(0);
    expect(sparkStateAt(s, 100 + SPARK_WINDOW_SEC / 2).progress).toBeCloseTo(0.5, 5);
    expect(sparkStateAt(s, 100 + SPARK_WINDOW_SEC - 0.01).phase).toBe("live");
    expect(sparkStateAt(s, 100 + SPARK_WINDOW_SEC).phase).toBe("gone");
    expect(sparkStateAt(s, 5000).phase).toBe("gone");
  });
});

describe("choosing what to render", () => {
  it("renders nothing when no spark is near", () => {
    expect(activeSpark([spark("a", 100), spark("b", 200)], 10)).toBeNull();
  });

  it("prefers a live spark over another one's dots", () => {
    // 101 is live for "a"; 104 is inside the dots lead for "b" at 105.
    const picked = activeSpark([spark("a", 100), spark("b", 105)], 101);
    expect(picked?.spark.id).toBe("a");
    expect(picked?.state.phase).toBe("live");
  });

  it("picks the nearer mark when both are in the same phase", () => {
    // Spacing rules make this unreachable in practice, but the tie-break must
    // still be deterministic if two windows ever overlap.
    const picked = activeSpark([spark("a", 100), spark("b", 103)], 104);
    expect(picked?.state.phase).toBe("live");
    expect(picked?.spark.id).toBe("b");
  });
});

describe("placement rules", () => {
  it("accepts a clean placement", () => {
    expect(rejectPlacement({ existing: [], positionSec: 40, durationSec: 200 })).toBeNull();
  });

  it("caps how many a track can carry", () => {
    const existing = Array.from({ length: MAX_SPARKS_PER_TRACK }, (_, i) =>
      spark(`s${i}`, 30 + i * 60),
    );
    expect(rejectPlacement({ existing, positionSec: 500, durationSec: 900 })).toBe("too_many");
  });

  it("keeps sparks from crowding each other", () => {
    const existing = [spark("a", 100)];
    expect(
      rejectPlacement({ existing, positionSec: 100 + MIN_SPARK_SPACING_SEC - 1, durationSec: 300 }),
    ).toBe("too_close");
    expect(
      rejectPlacement({ existing, positionSec: 100 + MIN_SPARK_SPACING_SEC, durationSec: 300 }),
    ).toBeNull();
  });

  it("rejects a moment outside the track", () => {
    expect(rejectPlacement({ existing: [], positionSec: 400, durationSec: 300 })).toBe(
      "out_of_range",
    );
    expect(rejectPlacement({ existing: [], positionSec: 0, durationSec: 300 })).toBe(
      "out_of_range",
    );
  });

  it("skips the range check when duration is unknown rather than inventing one", () => {
    expect(rejectPlacement({ existing: [], positionSec: 9999, durationSec: null })).toBeNull();
  });

  it("uses the same spacing the database enforces", () => {
    // place_track_spark repeats this rule server-side. If the two drift, the UI
    // accepts a placement the database then rejects.
    const sql = readFileSync(
      path.resolve(__dirname, "../../../supabase/migrations/20260815_0100_spark_timing.sql"),
      "utf8",
    );
    expect(sql).toContain(`< ${MIN_SPARK_SPACING_SEC}`);
  });

  it("refuses an answer set that cannot deliver bad news", () => {
    const flattering = [
      { emoji: "🔥", label: "great", polarity: "positive" as const },
      { emoji: "💯", label: "perfect", polarity: "positive" as const },
      { emoji: "🚀", label: "amazing", polarity: "positive" as const },
    ];
    expect(rejectPlacement({ existing: [], positionSec: 40, options: flattering })).toBe(
      "options_not_spanning",
    );
  });
});

describe("curated option sets", () => {
  it("every set spans positive, neutral and critical", () => {
    expect(SPARK_OPTION_SETS.length).toBeGreaterThan(3);
    for (const set of SPARK_OPTION_SETS) {
      expect(set.options).toHaveLength(3);
      expect(spansPolarity(set.options), set.id).toBe(true);
    }
  });

  it("every option carries a word, not only an emoji", () => {
    for (const set of SPARK_OPTION_SETS) {
      for (const o of set.options) {
        expect(o.label.trim().length, `${set.id}/${o.emoji}`).toBeGreaterThan(2);
      }
    }
  });

  it("looks sets up by id", () => {
    expect(optionSetById("impact")?.question).toBe("How did that land?");
    expect(optionSetById("nope")).toBeNull();
  });
});

describe("suggested placement", () => {
  it("suggests nothing without a measured duration", () => {
    expect(suggestedPositions({ durationSec: null })).toEqual([]);
    expect(suggestedPositions({ durationSec: 10 })).toEqual([]);
  });

  it("suggests the opening and the ending from duration alone", () => {
    const out = suggestedPositions({ durationSec: 200 });
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.map((o) => o.because)).toContain("the opening");
    expect(out.map((o) => o.because)).toContain("the ending");
  });

  it("adds the largest measured energy change when peaks exist", () => {
    // Flat, then a hard jump at the midpoint.
    const peaks = [...Array(10).fill(0.1), ...Array(10).fill(0.9)];
    const out = suggestedPositions({ peaks, durationSec: 240 });
    expect(out.map((o) => o.because)).toContain("the largest measured energy change");
  });

  it("never suggests two moments too close together", () => {
    const out = suggestedPositions({ durationSec: 200, peaks: [0.1, 0.9, 0.1, 0.9] });
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.positionSec - out[i - 1]!.positionSec).toBeGreaterThanOrEqual(
        MIN_SPARK_SPACING_SEC,
      );
    }
  });
});
