/**
 * OR-036 Midi Maker gate — built-in oscillator preview + random phrase generator.
 * Law 1: no invented musical quality scores; disclose Web Audio triangle preview.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import { generateRandomMidiPhrase } from "@/features/tools/midiRandom";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-036 Midi Maker preview + random", () => {
  it("ships oscillator preview and random generator wiring", () => {
    const page = read("src/features/tools/MidiMakerPage.tsx");
    const preview = read("src/features/tools/midiPreview.ts");
    const random = read("src/features/tools/midiRandom.ts");
    expect(preview).toContain("playMidiPreview");
    expect(preview).toContain("AudioContext");
    expect(preview).toContain("triangle");
    expect(random).toContain("generateRandomMidiPhrase");
    expect(page).toContain("generateRandomMidiPhrase");
    expect(page).toContain('data-testid="midi-random-generate"');
    expect(page).toContain('data-testid="midi-preview-play"');
    expect(page).toContain('data-testid="midi-preview-disclosure"');
    expect(page).toMatch(/triangle oscillator|Web Audio/i);
    expect(page).not.toMatch(/distribute to Spotify|DSP delivery|guaranteed placement/i);
  });

  it("random generator stays within MIDI bounds", () => {
    const notes = generateRandomMidiPhrase({ bars: 2, density: 10, bpm: 100 });
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) {
      expect(n.midi).toBeGreaterThanOrEqual(0);
      expect(n.midi).toBeLessThanOrEqual(127);
    }
  });

  it("routes Midi Maker in the suite Create rail", () => {
    const apps = read("src/shell/suiteApps.ts");
    const app = read("src/App.tsx");
    expect(apps).toMatch(/id:\s*"midi-maker"[\s\S]{0,80}path:\s*"\/tools\/midi"/);
    expect(app).toContain("MidiMakerPage");
    expect(app).toContain('path="/tools/midi"');
  });

  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("or036MidiMaker");
  });
});
