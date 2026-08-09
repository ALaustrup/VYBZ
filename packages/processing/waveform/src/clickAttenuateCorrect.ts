/**
 * M6 / OR-026 — gentle click/pop attenuate via short local interpolation.
 * Law 1: events from the same heuristic as measureClickPop. High false-positive
 * risk acknowledged — assist only, re-check after.
 */

import { snapshotLevels, type LevelSnapshot } from "./correctionLevels";
import { measureClickPop } from "./clickPop";

export const CLICK_ATTENUATE_VERSION = "m6.click-attenuate.1";

export type ClickAttenuateResult = {
  channels: Float32Array[];
  before: LevelSnapshot;
  after: LevelSnapshot;
  eventsFixed: number;
  countBefore: number | null;
  countAfter: number | null;
  correctionVersion: typeof CLICK_ATTENUATE_VERSION;
};

function downmix(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0]!;
  const n = channels[0]?.length ?? 0;
  const out = new Float32Array(n);
  const inv = 1 / channels.length;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const ch of channels) s += ch[i] ?? 0;
    out[i] = s * inv;
  }
  return out;
}

function findClickIndices(samples: Float32Array, sampleRate: number): number[] {
  const indices: number[] = [];
  if (samples.length < 2048 || sampleRate < 8000) return indices;
  const win = Math.max(32, Math.floor(sampleRate * 0.005));
  const refractory = Math.max(8, Math.floor(sampleRate * 0.002));
  const minJump = 0.06;
  const ratioFloor = 8;
  const hist = new Float32Array(win);
  let histLen = 0;
  let histWrite = 0;
  let sumSq = 0;
  let nextAllowed = 0;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    if (histLen === win) sumSq -= hist[histWrite]!;
    else histLen++;
    hist[histWrite] = prev * prev;
    sumSq += hist[histWrite]!;
    if (sumSq < 0) sumSq = 0;
    histWrite = (histWrite + 1) % win;
    const jump = Math.abs(samples[i]! - prev);
    if (jump < minJump || i < nextAllowed) continue;
    const localRms = Math.sqrt(Math.max(sumSq / histLen, 1e-12));
    if (jump / localRms < ratioFloor) continue;
    indices.push(i);
    nextAllowed = i + refractory;
  }
  return indices;
}

function interpolateAround(ch: Float32Array, center: number, half: number): void {
  const a = Math.max(0, center - half);
  const b = Math.min(ch.length - 1, center + half);
  if (b <= a + 1) return;
  const ya = ch[a]!;
  const yb = ch[b]!;
  const span = b - a;
  for (let i = a; i <= b; i++) {
    const t = (i - a) / span;
    ch[i] = ya * (1 - t) + yb * t;
  }
}

/**
 * Soften impulsive clicks by short linear bridges. Caps events per run.
 */
export function applyClickAttenuate(
  channels: Float32Array[],
  sampleRate: number,
): ClickAttenuateResult {
  const before = snapshotLevels(channels);
  const mono = downmix(channels);
  const measuredBefore = measureClickPop(mono, sampleRate);
  const half = Math.max(2, Math.floor(sampleRate * 0.0008));
  const maxEvents = 40;
  const indices = findClickIndices(mono, sampleRate).slice(0, maxEvents);

  const out = channels.map((ch) => {
    const copy = new Float32Array(ch.length);
    copy.set(ch);
    return copy;
  });
  for (const idx of indices) {
    for (const ch of out) interpolateAround(ch, idx, half);
  }

  const afterMono = downmix(out);
  const measuredAfter = measureClickPop(afterMono, sampleRate);

  return {
    channels: out,
    before,
    after: snapshotLevels(out),
    eventsFixed: indices.length,
    countBefore: measuredBefore?.count ?? null,
    countAfter: measuredAfter?.count ?? null,
    correctionVersion: CLICK_ATTENUATE_VERSION,
  };
}
