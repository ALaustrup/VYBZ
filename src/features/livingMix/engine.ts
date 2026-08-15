/**
 * Living Mix session planner.
 *
 * A mix is a seeded walk through a catalog pool — not a static playlist, and
 * not an AI producer. Every pick cites a rule. Missing BPM / duration / play
 * counts stay unused (Law 1); they are never invented.
 *
 * VDock remains dry (Law 5). This module only orders tracks.
 */

export type MixIntent = "calm" | "steady" | "peak";

export const MIX_INTENTS: readonly MixIntent[] = ["calm", "steady", "peak"];

export const MIX_INTENT_LABEL: Record<MixIntent, string> = {
  calm: "Calm",
  steady: "Steady",
  peak: "Peak",
};

export type MixPickReason =
  | "session-seed"
  | "avoid-repeat"
  | "avoid-same-artist"
  | "intent-duration"
  | "intent-plays"
  | "only-remaining";

export type MixCandidate = {
  id: string;
  /** Lowercased credited artist or author. Empty when unknown — never guessed. */
  artistKey: string;
  durationSec: number | null;
  plays: number | null;
  bpm: number | null;
  kind: string | null;
};

export type MixPick = {
  candidate: MixCandidate;
  reasons: MixPickReason[];
  score: number;
};

export function sessionSeed(mixId: string, startedAtMs: number): number {
  let h = 2166136261 ^ (startedAtMs >>> 0);
  for (let i = 0; i < mixId.length; i++) {
    h ^= mixId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Recency window so a track cannot return until others have played. */
export function recencyWindow(poolSize: number): number {
  if (poolSize <= 1) return 0;
  return Math.max(1, Math.min(5, Math.floor(poolSize / 3)));
}

export function planSession(
  pool: MixCandidate[],
  intent: MixIntent,
  seed: number,
  length?: number,
): MixPick[] {
  if (!pool.length) return [];
  const unique = dedupe(pool);
  const target = length ?? Math.max(unique.length, Math.min(24, unique.length * 2));
  const history: string[] = [];
  const picks: MixPick[] = [];
  for (let step = 0; step < target; step++) {
    const next = pickNext({ pool: unique, history, intent, seed, step });
    if (!next) break;
    picks.push(next);
    history.push(next.candidate.id);
  }
  return picks;
}

export function pickNext(input: {
  pool: MixCandidate[];
  history: string[];
  intent: MixIntent;
  seed: number;
  step: number;
}): MixPick | null {
  const { pool, history, intent, seed, step } = input;
  if (!pool.length) return null;

  const window = recencyWindow(pool.length);
  const recent = new Set(history.slice(-window));
  let eligible = pool.filter((c) => !recent.has(c.id));
  if (!eligible.length) eligible = pool.filter((c) => c.id !== history[history.length - 1]);
  if (!eligible.length) eligible = pool.slice();

  const last = pool.find((c) => c.id === history[history.length - 1]);
  const rng = mulberry32(seed ^ Math.imul(step + 1, 0x9e3779b9));

  let best: MixPick | null = null;
  for (const candidate of eligible) {
    const { score, reasons } = scoreCandidate(candidate, {
      intent,
      lastArtist: last?.artistKey ?? "",
      jitter: rng(),
      eligibleCount: eligible.length,
      poolSize: pool.length,
    });
    if (!best || score > best.score) best = { candidate, reasons, score };
  }
  return best;
}

function scoreCandidate(
  candidate: MixCandidate,
  ctx: {
    intent: MixIntent;
    lastArtist: string;
    jitter: number;
    eligibleCount: number;
    poolSize: number;
  },
): { score: number; reasons: MixPickReason[] } {
  const reasons: MixPickReason[] = ["session-seed"];
  let score = ctx.jitter;

  if (ctx.eligibleCount <= 1 && ctx.poolSize <= 1) {
    reasons.push("only-remaining");
    return { score, reasons };
  }

  reasons.push("avoid-repeat");

  if (candidate.artistKey && ctx.lastArtist && candidate.artistKey !== ctx.lastArtist) {
    score += 3;
    reasons.push("avoid-same-artist");
  }

  const dur = candidate.durationSec;
  if (dur != null && Number.isFinite(dur) && dur > 0) {
    if (ctx.intent === "calm" && dur >= 180) {
      score += 2;
      reasons.push("intent-duration");
    } else if (ctx.intent === "calm" && dur < 90) {
      score -= 1;
    } else if (ctx.intent === "peak" && dur <= 150) {
      score += 2;
      reasons.push("intent-duration");
    } else if (ctx.intent === "peak" && dur >= 240) {
      score -= 1;
    }
  }

  const plays = candidate.plays;
  if (plays != null && Number.isFinite(plays) && plays >= 0) {
    if (ctx.intent === "peak" && plays >= 10) {
      score += Math.min(1, plays / 100);
      reasons.push("intent-plays");
    } else if (ctx.intent === "calm" && plays === 0) {
      score += 0.4;
      reasons.push("intent-plays");
    }
  }

  return { score, reasons };
}

function dedupe(pool: MixCandidate[]): MixCandidate[] {
  const seen = new Set<string>();
  const out: MixCandidate[] = [];
  for (const c of pool) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function reasonCopy(reason: MixPickReason): string {
  switch (reason) {
    case "session-seed":
      return "This session's seed";
    case "avoid-repeat":
      return "Held out of the recent window";
    case "avoid-same-artist":
      return "Different artist than the last pick";
    case "intent-duration":
      return "Length matches the energy you chose";
    case "intent-plays":
      return "Play count (measured) matches the energy you chose";
    case "only-remaining":
      return "Only one playable track in the pool";
  }
}
