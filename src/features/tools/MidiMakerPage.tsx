import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Plus, Shuffle, Square, Trash2, Upload, Play } from "lucide-react";
import { Midi } from "@tonejs/midi";
import { ToolWorkbench } from "@/components/ToolWorkbench";
import { audioToMidi } from "@/lib/audioToMidi";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import { PianoRoll, type PianoNote } from "@/features/tools/PianoRoll";
import { playMidiPreview, type MidiPreviewHandle } from "@/features/tools/midiPreview";
import {
  generateRandomMidiPhrase,
  type MidiScaleId,
} from "@/features/tools/midiRandom";

type Note = PianoNote;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteLabel(m: number): string {
  return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

function downloadMidi(notes: Note[], tempo: number, name: string) {
  const midi = new Midi();
  midi.header.setTempo(tempo);
  const track = midi.addTrack();
  track.name = "VYBZ Midi Maker";
  for (const n of notes) {
    track.addNote({
      midi: n.midi,
      time: n.time,
      duration: Math.max(0.05, n.duration),
      velocity: Math.max(0.05, Math.min(1, n.velocity)),
    });
  }
  const blob = new Blob([Uint8Array.from(midi.toArray())], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "vybz"}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Midi Maker — piano roll + built-in oscillator preview + random phrase generator.
 * Preview is local Web Audio (triangle) — not a sample library or DSP claim.
 */
export function MidiMakerPage() {
  const { showToast } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tempo, setTempo] = useState(120);
  const [title, setTitle] = useState("untitled");
  const [busy, setBusy] = useState(false);
  const [showList, setShowList] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [scale, setScale] = useState<MidiScaleId>("pentatonic");
  const [bars, setBars] = useState(2);
  const previewRef = useRef<MidiPreviewHandle | null>(null);

  useRegisterAppBar({ title: "Midi Maker" }, []);

  useEffect(() => {
    return () => {
      previewRef.current?.stop();
      previewRef.current = null;
    };
  }, []);

  const stopPreview = useCallback(() => {
    previewRef.current?.stop();
    previewRef.current = null;
    setPlaying(false);
  }, []);

  const startPreview = useCallback(() => {
    if (!notes.length) {
      showToast("Add notes to preview");
      return;
    }
    stopPreview();
    previewRef.current = playMidiPreview(notes);
    setPlaying(true);
    const endMs =
      Math.ceil(Math.max(...notes.map((n) => n.time + n.duration)) * 1000) + 120;
    window.setTimeout(() => {
      setPlaying(false);
      previewRef.current = null;
    }, endMs);
  }, [notes, showToast, stopPreview]);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => a.time - b.time || a.midi - b.midi),
    [notes]
  );

  const rollSeconds = useMemo(() => {
    if (!notes.length) return 8;
    const end = Math.max(...notes.map((n) => n.time + n.duration));
    return Math.max(8, Math.ceil(end + 1));
  }, [notes]);

  const addNote = useCallback(() => {
    setNotes((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        midi: 60,
        time: list.length ? Math.max(...list.map((n) => n.time + n.duration)) : 0,
        duration: 0.5,
        velocity: 0.8,
      },
    ]);
  }, []);

  const placeOnRoll = useCallback((midi: number, time: number) => {
    setNotes((list) => [
      ...list,
      { id: crypto.randomUUID(), midi, time, duration: 0.25, velocity: 0.85 },
    ]);
  }, []);

  const randomize = useCallback(() => {
    stopPreview();
    const phrase = generateRandomMidiPhrase({
      bpm: tempo,
      bars,
      scale,
      density: 8,
    });
    setNotes(
      phrase.map((n) => ({
        id: crypto.randomUUID(),
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        velocity: n.velocity,
      })),
    );
    if (!title || title === "untitled") setTitle(`random-${scale}-${bars}bar`);
    showToast(`Generated ${phrase.length} notes · ${scale} · ${bars} bar${bars === 1 ? "" : "s"}`);
  }, [bars, scale, showToast, stopPreview, tempo, title]);

  async function importAudio(file: File | undefined) {
    if (!file || !isAudioFile(file)) {
      showToast("Choose an audio file");
      return;
    }
    setBusy(true);
    try {
      const res = await audioToMidi(file);
      setNotes(
        res.notes.map((n) => ({
          id: crypto.randomUUID(),
          midi: n.midi,
          time: n.time,
          duration: Math.max(0.05, n.duration),
          velocity: n.velocity ?? 0.8,
        }))
      );
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "extract");
      showToast(`Extracted ${res.notes.length} notes`);
    } catch {
      showToast("Audio → MIDI failed");
    } finally {
      setBusy(false);
    }
  }

  async function importMidiFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const ab = await file.arrayBuffer();
      const midi = new Midi(ab);
      const bpm = midi.header.tempos[0]?.bpm;
      if (bpm) setTempo(Math.round(bpm));
      const next: Note[] = [];
      for (const track of midi.tracks) {
        for (const n of track.notes) {
          next.push({
            id: crypto.randomUUID(),
            midi: n.midi,
            time: n.time,
            duration: n.duration,
            velocity: n.velocity,
          });
        }
      }
      setNotes(next);
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "import");
      showToast(`Loaded ${next.length} notes`);
    } catch {
      showToast("Couldn't parse that MIDI file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolWorkbench
      wide
      eyebrow="Midi Maker"
      title="Piano roll desk"
      subtitle="Draw notes, generate a random phrase, or extract from audio. Preview uses a built-in triangle oscillator (local Web Audio). Export downloads a standard .mid file."
      testId="midi-maker"
    >
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addNote} className="btn btn-primary px-3 py-2 text-sm">
          <Plus className="h-4 w-4" /> Add note
        </button>
        <button
          type="button"
          data-testid="midi-random-generate"
          onClick={randomize}
          className="btn btn-ghost px-3 py-2 text-sm"
        >
          <Shuffle className="h-4 w-4" /> Random
        </button>
        <label className="btn btn-ghost cursor-pointer px-3 py-2 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          From audio
          <input
            type="file"
            accept={AUDIO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              void importAudio(f);
            }}
          />
        </label>
        <label className="btn btn-ghost cursor-pointer px-3 py-2 text-sm">
          <Upload className="h-4 w-4" /> Import .mid
          <input
            type="file"
            accept=".mid,.midi,audio/midi"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              void importMidiFile(f);
            }}
          />
        </label>
        <button
          type="button"
          disabled={!notes.length}
          onClick={() => downloadMidi(notes, tempo, title)}
          className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Export .mid
        </button>
        {playing ? (
          <button
            type="button"
            data-testid="midi-preview-stop"
            onClick={stopPreview}
            className="btn btn-ghost px-3 py-2 text-sm"
          >
            <Square className="h-4 w-4" /> Stop
          </button>
        ) : (
          <button
            type="button"
            data-testid="midi-preview-play"
            disabled={!notes.length}
            onClick={startPreview}
            className="btn btn-ghost px-3 py-2 text-sm disabled:opacity-40"
          >
            <Play className="h-4 w-4" /> Preview
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="btn btn-ghost px-3 py-2 text-sm"
        >
          {showList ? "Hide list" : "Edit list"}
        </button>
      </div>

      <div className="forge-glass relative grid grid-cols-2 gap-3 !rounded-2xl p-4 sm:grid-cols-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <label className="relative z-[1] block">
          <span className="text-[10px] uppercase text-white/35">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none"
          />
        </label>
        <label className="relative z-[1] block">
          <span className="text-[10px] uppercase text-white/35">Tempo (BPM)</span>
          <input
            type="number"
            min={40}
            max={240}
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value) || 120)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none"
          />
        </label>
        <label className="relative z-[1] block">
          <span className="text-[10px] uppercase text-white/35">Random scale</span>
          <select
            data-testid="midi-random-scale"
            value={scale}
            onChange={(e) => setScale(e.target.value as MidiScaleId)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="pentatonic">Pentatonic</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </label>
        <label className="relative z-[1] block">
          <span className="text-[10px] uppercase text-white/35">Random bars</span>
          <input
            type="number"
            min={1}
            max={8}
            data-testid="midi-random-bars"
            value={bars}
            onChange={(e) => setBars(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none"
          />
        </label>
      </div>

      <p className="text-[11px] text-white/35" data-testid="midi-preview-disclosure">
        Preview = local triangle oscillator via Web Audio — not a sampled instrument library.
      </p>

      <div className="forge-glass forge-plasma relative !rounded-2xl p-2">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <div className="relative z-[1]">
          <PianoRoll
            notes={notes}
            seconds={rollSeconds}
            onPlace={placeOnRoll}
            onRemove={(id) => setNotes((list) => list.filter((x) => x.id !== id))}
          />
        </div>
      </div>

      {showList && (
        <ul className="space-y-1.5">
          {sorted.map((n) => (
            <li
              key={n.id}
              className="forge-glass relative grid grid-cols-[3.5rem_1fr_1fr_1fr_1fr_auto] items-center gap-2 !rounded-xl px-2 py-1.5 text-[12px]"
            >
              <span className="forge-glass-edge pointer-events-none" aria-hidden />
              <span className="font-mono text-white/70">{noteLabel(n.midi)}</span>
              <label className="flex items-center gap-1 text-white/40">
                ♪
                <input
                  type="number"
                  className="w-full bg-transparent text-white outline-none"
                  value={n.midi}
                  min={0}
                  max={127}
                  onChange={(e) =>
                    setNotes((list) =>
                      list.map((x) =>
                        x.id === n.id ? { ...x, midi: Math.max(0, Math.min(127, Number(e.target.value) || 0)) } : x
                      )
                    )
                  }
                />
              </label>
              <label className="flex items-center gap-1 text-white/40">
                t
                <input
                  type="number"
                  step={0.01}
                  className="w-full bg-transparent text-white outline-none"
                  value={n.time}
                  onChange={(e) =>
                    setNotes((list) =>
                      list.map((x) => (x.id === n.id ? { ...x, time: Math.max(0, Number(e.target.value) || 0) } : x))
                    )
                  }
                />
              </label>
              <label className="flex items-center gap-1 text-white/40">
                d
                <input
                  type="number"
                  step={0.01}
                  className="w-full bg-transparent text-white outline-none"
                  value={n.duration}
                  onChange={(e) =>
                    setNotes((list) =>
                      list.map((x) =>
                        x.id === n.id ? { ...x, duration: Math.max(0.05, Number(e.target.value) || 0.05) } : x
                      )
                    )
                  }
                />
              </label>
              <label className="flex items-center gap-1 text-white/40" title="Velocity 1–127">
                v
                <input
                  type="number"
                  min={1}
                  max={127}
                  data-testid="midi-note-velocity"
                  className="w-full bg-transparent text-white outline-none"
                  value={Math.round(Math.max(0.05, Math.min(1, n.velocity)) * 127)}
                  onChange={(e) => {
                    const midiVel = Math.max(1, Math.min(127, Number(e.target.value) || 1));
                    setNotes((list) =>
                      list.map((x) => (x.id === n.id ? { ...x, velocity: midiVel / 127 } : x))
                    );
                  }}
                />
              </label>
              <button
                type="button"
                aria-label="Remove note"
                onClick={() => setNotes((list) => list.filter((x) => x.id !== n.id))}
                className="rounded-lg p-1.5 text-white/35 hover:text-wild"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-white/30">{notes.length} notes · single track</p>
    </ToolWorkbench>
  );
}
