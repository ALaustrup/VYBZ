// ---------------------------------------------------------------------------
// Web MIDI → DAW bridge (Phase H4). Streams note events (e.g. from the audio→MIDI
// extractor) out a browser MIDI output port. Point that port at a virtual MIDI
// cable (IAC on macOS / loopMIDI on Windows) routed into a DAW track and the DAW
// records the performance live. Web MIDI is desktop Chrome/Edge/Opera only.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import type { MidiNote } from "@/lib/audioToMidi";

export interface MidiOut { id: string; name: string }

export function midiSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
}

export function useMidiOutputs() {
  const [supported] = useState(midiSupported());
  const [outputs, setOutputs] = useState<MidiOut[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessRef = useRef<MIDIAccess | null>(null);

  const list = useCallback((a: MIDIAccess) => {
    const outs: MidiOut[] = [];
    a.outputs.forEach((o) => outs.push({ id: o.id, name: o.name || o.id }));
    setOutputs(outs);
  }, []);

  const request = useCallback(async () => {
    if (!supported) { setError("Web MIDI isn't supported here — use desktop Chrome or Edge."); return; }
    try {
      const a = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = a;
      list(a);
      a.onstatechange = () => list(a);
      setReady(true);
    } catch (e) {
      setError((e as Error)?.message || "MIDI access was denied.");
    }
  }, [supported, list]);

  useEffect(() => () => { if (accessRef.current) accessRef.current.onstatechange = null; }, []);

  return { supported, outputs, ready, error, request, accessRef };
}

/**
 * Schedule note events out a MIDI output (timestamps are performance.now()-based,
 * so the browser queues them precisely). Returns a stop() that sends all-notes-off.
 */
export function streamNotes(access: MIDIAccess, outputId: string, notes: MidiNote[], channel = 0): () => void {
  const out = access.outputs.get(outputId);
  if (!out) return () => {};
  const t0 = performance.now() + 150; // small lead so nothing schedules in the past
  for (const n of notes) {
    const on = t0 + n.time * 1000;
    const off = on + Math.max(30, n.duration * 1000);
    const vel = Math.round(Math.max(0.05, Math.min(1, n.velocity)) * 127);
    out.send([0x90 | channel, n.midi & 0x7f, vel], on);
    out.send([0x80 | channel, n.midi & 0x7f, 0], off);
  }
  return () => {
    try {
      out.send([0xb0 | channel, 120, 0]); // all sound off
      out.send([0xb0 | channel, 123, 0]); // all notes off
    } catch { /* ignore */ }
  };
}
