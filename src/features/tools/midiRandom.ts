/**
 * OR-036 — deterministic-friendly MIDI phrase generator for Midi Maker.
 * Produces note events only; no invented musical “quality” scores.
 */

import type { PreviewNote } from "@/features/tools/midiPreview";

export type MidiScaleId = "major" | "minor" | "pentatonic";

export type RandomMidiOptions = {
  /** Root MIDI pitch class 0–11 (C=0). Default 0. */
  rootPc?: number;
  /** Base octave MIDI (e.g. 60 = C4). Default 60. */
  baseMidi?: number;
  scale?: MidiScaleId;
  /** Number of 4/4 bars. Default 2. */
  bars?: number;
  /** Seconds per beat at tempo. Derived from bpm if provided. */
  bpm?: number;
  /** Notes per bar target (approximate). Default 8. */
  density?: number;
  /** 0..1. Default 0.8. */
  velocity?: number;
  /** Injectable RNG in [0,1). */
  random?: () => number;
};

const SCALES: Record<MidiScaleId, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
};

export function scaleDegrees(scale: MidiScaleId): readonly number[] {
  return SCALES[scale];
}

function clampMidi(n: number): number {
  return Math.max(0, Math.min(127, Math.round(n)));
}

/**
 * Generate a simple monophonic-ish phrase on a grid (16th notes).
 * Returns PreviewNote-shaped events (no ids — caller assigns).
 */
export function generateRandomMidiPhrase(opts: RandomMidiOptions = {}): PreviewNote[] {
  const rootPc = ((opts.rootPc ?? 0) % 12 + 12) % 12;
  const baseMidi = opts.baseMidi ?? 60;
  const scale = opts.scale ?? "pentatonic";
  const bars = Math.max(1, Math.min(8, opts.bars ?? 2));
  const bpm = Math.max(40, Math.min(240, opts.bpm ?? 120));
  const beatSec = 60 / bpm;
  const density = Math.max(2, Math.min(16, opts.density ?? 8));
  const velocity = Math.max(0.05, Math.min(1, opts.velocity ?? 0.8));
  const rnd = opts.random ?? Math.random;
  const degrees = SCALES[scale];

  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const stepDur = beatSec / 4;
  const targetCount = Math.round(density * bars);

  const chosen = new Set<number>();
  let guard = 0;
  while (chosen.size < targetCount && guard < totalSteps * 4) {
    guard += 1;
    const step = Math.floor(rnd() * totalSteps);
    // Prefer on-beat / off-beat variety but allow rests by skipping some
    if (rnd() < 0.22) continue;
    chosen.add(step);
  }

  const notes: PreviewNote[] = [];
  const sortedSteps = [...chosen].sort((a, b) => a - b);
  for (const step of sortedSteps) {
    const deg = degrees[Math.floor(rnd() * degrees.length)]!;
    const octave = Math.floor(rnd() * 3) - 1; // -1..1
    const midi = clampMidi(baseMidi - (baseMidi % 12) + rootPc + deg + octave * 12);
    const lenSteps = 1 + (rnd() < 0.35 ? 1 : 0) + (rnd() < 0.15 ? 2 : 0);
    notes.push({
      midi,
      time: step * stepDur,
      duration: Math.max(0.05, lenSteps * stepDur * 0.92),
      velocity: velocity * (0.75 + rnd() * 0.25),
    });
  }

  return notes;
}
