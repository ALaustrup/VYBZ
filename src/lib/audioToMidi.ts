// ---------------------------------------------------------------------------
// Audio → MIDI (Phase H3). Turns any audio (a recorded live-session clip, a drop,
// an upload) into a downloadable MIDI file using Spotify's open-source Basic Pitch
// (polyphonic note detection — melody + harmony) running fully client-side. Heavy
// deps (TensorFlow.js) are dynamically imported so they never touch the main bundle.
// ---------------------------------------------------------------------------

const MODEL_URL = "/models/basic-pitch/model.json";
const TARGET_RATE = 22050; // Basic Pitch expects 22.05 kHz mono

export interface MidiResult {
  blob: Blob;
  noteCount: number;
  durationSec: number;
}

async function toMonoResampled(buf: ArrayBuffer): Promise<AudioBuffer> {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const actx = new AC();
  try {
    const decoded = await actx.decodeAudioData(buf.slice(0));
    const Off = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
    const off = new Off(1, frames, TARGET_RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start(0);
    return await off.startRendering();
  } finally {
    void actx.close();
  }
}

/**
 * Convert audio (URL or Blob) to a MIDI file. `onProgress` reports 0..1.
 */
export async function audioToMidi(input: string | Blob, onProgress?: (p: number) => void): Promise<MidiResult> {
  const [{ BasicPitch, noteFramesToTime, addPitchBendsToNoteEvents, outputToNotesPoly }, { Midi }] = await Promise.all([
    import("@spotify/basic-pitch"),
    import("@tonejs/midi"),
  ]);

  const arr = typeof input === "string" ? await (await fetch(input)).arrayBuffer() : await input.arrayBuffer();
  const audio = await toMonoResampled(arr);

  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];
  const bp = new BasicPitch(MODEL_URL);
  await bp.evaluateModel(
    audio,
    (f: number[][], o: number[][], c: number[][]) => { frames.push(...f); onsets.push(...o); contours.push(...c); },
    (p: number) => onProgress?.(Math.max(0, Math.min(1, p))),
  );

  const notes = noteFramesToTime(addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, 0.5, 0.3, 5)));

  const midi = new Midi();
  midi.header.setTempo(120);
  const track = midi.addTrack();
  track.name = "VYBZ audio-to-MIDI";
  for (const n of notes) {
    track.addNote({
      midi: n.pitchMidi,
      time: n.startTimeSeconds,
      duration: Math.max(0.03, n.durationSeconds),
      velocity: Math.max(0.1, Math.min(1, n.amplitude)),
    });
  }

  const blob = new Blob([Uint8Array.from(midi.toArray())], { type: "audio/midi" });
  return { blob, noteCount: notes.length, durationSec: audio.duration };
}
