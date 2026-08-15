/**
 * Spark timing and option rules.
 *
 * A spark asks the listener about a specific moment. It arrives **just after**
 * that moment, never during it — a prompt sitting on top of the passage would
 * steal the attention we are trying to measure, and the answer would describe a
 * moment the listener half-missed.
 *
 * Sequence: quiet dots during the passage ("stay with this"), then the spark
 * with a filling ring once the passage ends, then it bursts and is gone.
 *
 * Pure module: no React, no network, no clock of its own. Everything is derived
 * from a playback position so it can be tested exactly.
 */

/**
 * How long the dots show before the spark lands.
 *
 * The lead-in is the difference between a prompt that arrives cold and one you
 * were ready for. Four seconds was not enough for the dots to register at all.
 */
export const DOTS_LEAD_SEC = 6;

/**
 * How long a spark stays tappable before it bursts.
 *
 * This is a judgement, not a measurement. Eight seconds was tried on production
 * and was too short: a listener needs to notice the prompt, read the question,
 * read three options and decide — and they are listening to music while doing
 * it. Missing the window turns "no response" into "too slow", which quietly
 * poisons the only figure here that has to stay honest.
 *
 * Tune this from real answer-versus-miss rates once there are enough of them.
 */
export const SPARK_WINDOW_SEC = 18;

/** Sparks per track. Priced in Airtime later; capped here so a song stays a song. */
export const MAX_SPARKS_PER_TRACK = 5;

/**
 * Two sparks cannot crowd each other.
 *
 * Must stay greater than `DOTS_LEAD_SEC + SPARK_WINDOW_SEC`, or one prompt's
 * window would open while the previous one is still live. `place_track_spark`
 * enforces the same number server-side; the gate test asserts they match.
 */
export const MIN_SPARK_SPACING_SEC = 30;

export type Polarity = "positive" | "neutral" | "critical";

export type SparkOption = {
  emoji: string;
  /** The word carries the meaning. An emoji alone aggregates into nothing. */
  label: string;
  polarity: Polarity;
};

export type Spark = {
  id: string;
  /** End of the passage being asked about. The prompt lands here. */
  positionSec: number;
  question: string;
  options: [SparkOption, SparkOption, SparkOption];
};

export type SparkPhase = "idle" | "dots" | "live" | "gone";

export type SparkState = {
  phase: SparkPhase;
  /** 0..1 through the current phase. Drives the dots and the filling ring. */
  progress: number;
};

/**
 * Curated option sets.
 *
 * Artists choose from these rather than writing their own, because an artist who
 * can write the options will write flattering ones, and a feedback system that
 * cannot return bad news is not a feedback system. Every set spans positive,
 * neutral and critical.
 */
export const SPARK_OPTION_SETS: ReadonlyArray<{
  id: string;
  question: string;
  options: [SparkOption, SparkOption, SparkOption];
}> = [
  {
    id: "still-with-it",
    question: "Still with it?",
    options: [
      { emoji: "🔒", label: "locked in", polarity: "positive" },
      { emoji: "😐", label: "drifting", polarity: "neutral" },
      { emoji: "🚪", label: "lost me", polarity: "critical" },
    ],
  },
  {
    id: "impact",
    question: "How did that land?",
    options: [
      { emoji: "🔥", label: "hits hard", polarity: "positive" },
      { emoji: "😐", label: "flat here", polarity: "neutral" },
      { emoji: "🌊", label: "too much", polarity: "critical" },
    ],
  },
  {
    id: "length",
    question: "How is the pacing here?",
    options: [
      { emoji: "👌", label: "just right", polarity: "positive" },
      { emoji: "🐢", label: "dragging", polarity: "neutral" },
      { emoji: "✂️", label: "cut it", polarity: "critical" },
    ],
  },
  {
    id: "transition",
    question: "Did that change work?",
    options: [
      { emoji: "🧈", label: "smooth", polarity: "positive" },
      { emoji: "🤔", label: "noticed it", polarity: "neutral" },
      { emoji: "🧱", label: "jarring", polarity: "critical" },
    ],
  },
  {
    id: "presence",
    question: "What is front and centre?",
    options: [
      { emoji: "🎙️", label: "the vocal", polarity: "positive" },
      { emoji: "🥁", label: "the drums", polarity: "neutral" },
      { emoji: "🌫️", label: "it is muddy", polarity: "critical" },
    ],
  },
  {
    id: "ending",
    question: "How does it leave you?",
    options: [
      { emoji: "🔁", label: "play it again", polarity: "positive" },
      { emoji: "🫱", label: "fine", polarity: "neutral" },
      { emoji: "🥱", label: "over already", polarity: "critical" },
    ],
  },
];

export function optionSetById(id: string) {
  return SPARK_OPTION_SETS.find((s) => s.id === id) ?? null;
}

/** Every set must be able to deliver bad news. */
export function spansPolarity(options: readonly SparkOption[]): boolean {
  const seen = new Set(options.map((o) => o.polarity));
  return seen.has("positive") && seen.has("neutral") && seen.has("critical");
}

/**
 * Where a spark is at this playback position.
 *
 * `dots` runs for DOTS_LEAD_SEC before the mark, `live` for SPARK_WINDOW_SEC
 * after it. Both report progress so the UI can animate without its own timers.
 */
export function sparkStateAt(spark: Spark, currentSec: number): SparkState {
  const mark = spark.positionSec;
  const dotsStart = mark - DOTS_LEAD_SEC;
  const burstAt = mark + SPARK_WINDOW_SEC;

  if (currentSec < dotsStart) return { phase: "idle", progress: 0 };
  if (currentSec < mark) {
    return { phase: "dots", progress: clamp01((currentSec - dotsStart) / DOTS_LEAD_SEC) };
  }
  if (currentSec < burstAt) {
    return { phase: "live", progress: clamp01((currentSec - mark) / SPARK_WINDOW_SEC) };
  }
  return { phase: "gone", progress: 1 };
}

/** The one spark worth rendering right now, if any. */
export function activeSpark(
  sparks: readonly Spark[],
  currentSec: number,
): { spark: Spark; state: SparkState } | null {
  let best: { spark: Spark; state: SparkState } | null = null;
  for (const spark of sparks) {
    const state = sparkStateAt(spark, currentSec);
    if (state.phase === "idle" || state.phase === "gone") continue;
    // Live beats dots; otherwise the nearer mark wins.
    if (
      !best ||
      (state.phase === "live" && best.state.phase === "dots") ||
      (state.phase === best.state.phase &&
        Math.abs(spark.positionSec - currentSec) <
          Math.abs(best.spark.positionSec - currentSec))
    ) {
      best = { spark, state };
    }
  }
  return best;
}

export type PlacementRejection =
  | "too_many"
  | "too_close"
  | "out_of_range"
  | "options_not_spanning";

/**
 * Can a spark go here? Returns null when it can.
 *
 * `durationSec` may be unknown — we do not invent one, we just skip the range
 * check when it is missing.
 */
export function rejectPlacement(input: {
  existing: readonly Spark[];
  positionSec: number;
  durationSec?: number | null;
  options?: readonly SparkOption[];
}): PlacementRejection | null {
  const { existing, positionSec, durationSec, options } = input;

  if (existing.length >= MAX_SPARKS_PER_TRACK) return "too_many";
  if (!Number.isFinite(positionSec) || positionSec < 1) return "out_of_range";
  if (durationSec != null && Number.isFinite(durationSec) && positionSec > durationSec) {
    return "out_of_range";
  }
  if (existing.some((s) => Math.abs(s.positionSec - positionSec) < MIN_SPARK_SPACING_SEC)) {
    return "too_close";
  }
  if (options && !spansPolarity(options)) return "options_not_spanning";
  return null;
}

export function placementRejectionMessage(reason: PlacementRejection): string {
  switch (reason) {
    case "too_many":
      return `A track can carry ${MAX_SPARKS_PER_TRACK} sparks. Remove one first.`;
    case "too_close":
      return `Sparks need ${MIN_SPARK_SPACING_SEC} seconds between them.`;
    case "out_of_range":
      return "That moment is outside the track.";
    case "options_not_spanning":
      return "Answers must include a positive, a neutral and a critical option.";
  }
}

/**
 * Measured structural moments to pre-place sparks at.
 *
 * Derived from waveform peaks the catalog already stores. These are described by
 * what was measured — the largest energy change, the opening, the ending — and
 * never as a musical section we cannot detect.
 */
export function suggestedPositions(input: {
  peaks?: readonly number[] | null;
  durationSec?: number | null;
  limit?: number;
}): Array<{ positionSec: number; because: string }> {
  const { peaks, durationSec, limit = 3 } = input;
  if (!durationSec || !Number.isFinite(durationSec) || durationSec < 30) return [];

  const out: Array<{ positionSec: number; because: string }> = [];
  // Listeners leave early or not at all; the opening is always worth asking about.
  out.push({ positionSec: Math.min(30, durationSec * 0.15), because: "the opening" });

  if (peaks && peaks.length > 8) {
    let jumpAt = -1;
    let jumpSize = 0;
    for (let i = 1; i < peaks.length; i++) {
      const delta = Math.abs((peaks[i] ?? 0) - (peaks[i - 1] ?? 0));
      if (delta > jumpSize) {
        jumpSize = delta;
        jumpAt = i;
      }
    }
    if (jumpAt > 0) {
      out.push({
        positionSec: (jumpAt / peaks.length) * durationSec,
        because: "the largest measured energy change",
      });
    }
  }

  out.push({ positionSec: Math.max(1, durationSec - 20), because: "the ending" });

  const spaced: Array<{ positionSec: number; because: string }> = [];
  for (const c of out.sort((a, b) => a.positionSec - b.positionSec)) {
    if (spaced.some((s) => Math.abs(s.positionSec - c.positionSec) < MIN_SPARK_SPACING_SEC)) {
      continue;
    }
    spaced.push({ ...c, positionSec: Math.round(c.positionSec) });
  }
  return spaced.slice(0, limit);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
