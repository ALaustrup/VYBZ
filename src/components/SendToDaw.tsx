import { useEffect, useRef, useState } from "react";
import { Plug, Square, Play, Loader2 } from "lucide-react";
import { useMidiOutputs, streamNotes } from "@/lib/webMidi";
import { connectBridge, onBridgePresence, sendMidiToBridge } from "@/lib/vybzBridge";
import type { MidiNote } from "@/lib/audioToMidi";
import { cx } from "@/lib/utils";

/** Stream extracted MIDI notes to a DAW via a Web MIDI output (virtual port). */
export function SendToDaw({ notes, className }: { notes: MidiNote[]; className?: string }) {
  const { supported, outputs, ready, error, request, accessRef } = useMidiOutputs();
  const [open, setOpen] = useState(false);
  const [outId, setOutId] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [bridgeOk, setBridgeOk] = useState(false);
  const [alsoBridge, setAlsoBridge] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number>();

  useEffect(() => { if (outputs.length && !outId) setOutId(outputs[0].id); }, [outputs, outId]);
  useEffect(() => () => { stopRef.current?.(); clearTimeout(timerRef.current); }, []);
  useEffect(() => {
    connectBridge();
    return onBridgePresence(setBridgeOk);
  }, []);

  async function openPicker() { setOpen(true); if (!ready) await request(); }

  function play() {
    const access = accessRef.current;
    if (!access || !outId) return;
    stopRef.current = streamNotes(access, outId, notes);
    if (alsoBridge && bridgeOk) {
      sendMidiToBridge(notes.map((n) => ({
        midi: n.midi, time: n.time, duration: n.duration, velocity: n.velocity,
      })));
    }
    setStreaming(true);
    const end = Math.max(0, ...notes.map((n) => n.time + n.duration)) * 1000 + 700;
    timerRef.current = window.setTimeout(() => setStreaming(false), end);
  }
  function stop() { stopRef.current?.(); clearTimeout(timerRef.current); setStreaming(false); }

  if (!supported) {
    return <span className={cx("text-[11px] text-white/40", className)}>Send-to-DAW needs desktop Chrome or Edge</span>;
  }
  if (!open) {
    return (
      <button onClick={openPicker} className={cx("flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/85 active:scale-95", className)}>
        <Plug className="h-3.5 w-3.5" /> Send to DAW
      </button>
    );
  }
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {error ? (
        <span className="text-[11px] text-wild">{error}</span>
      ) : !ready ? (
        <span className="flex items-center gap-1.5 text-[11px] text-white/50"><Loader2 className="h-3 w-3 animate-spin" /> Requesting MIDI access…</span>
      ) : outputs.length === 0 ? (
        <span className="text-[11px] leading-snug text-white/50">
          No MIDI outputs found. Create a virtual MIDI port (<span className="text-white/70">IAC Driver</span> on macOS / <span className="text-white/70">loopMIDI</span> on Windows), route it to a DAW track, then reopen.
        </span>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <select value={outId} onChange={(e) => setOutId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white focus:border-veil-400/60 focus:outline-none">
              {outputs.map((o) => <option key={o.id} value={o.id} className="bg-ink-900">{o.name}</option>)}
            </select>
            {streaming ? (
              <button onClick={stop} className="flex items-center gap-1 rounded-full bg-wild/25 px-3 py-1.5 text-xs font-semibold text-wild active:scale-95"><Square className="h-3 w-3" /> Stop</button>
            ) : (
              <button onClick={play} className="flex items-center gap-1 rounded-full bg-feel/25 px-3 py-1.5 text-xs font-semibold text-feel active:scale-95"><Play className="h-3 w-3" /> Stream</button>
            )}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-white/50">
            <input type="checkbox" checked={alsoBridge} onChange={(e) => setAlsoBridge(e.target.checked)} disabled={!bridgeOk} />
            Also send to VYBZ Bridge{bridgeOk ? "" : " (companion offline — run tools/vybz-bridge)"}
          </label>
        </>
      )}
    </div>
  );
}
