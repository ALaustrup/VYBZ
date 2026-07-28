import { useEffect, useRef, useState } from "react";
import { Radio, PhoneOff, Mic, MicOff, Check, X, Circle, Disc, Download, Loader2 } from "lucide-react";
import { LiveVisualizer } from "@/components/LiveVisualizer";
import { ExtractMidiButton } from "@/components/ExtractMidiButton";
import type { LiveSession } from "@/lib/liveSession";

/** Compact in-chat live surface (mic/desktop fallback). Cam uses CamCallOverlay. */
export function LiveSessionPanel({ session, peerName }: { session: LiveSession; peerName: string }) {
  const { state, isHost, source, stream, remoteStream, error, turnHint } = session;

  const [recording, setRecording] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (el && remoteStream) { el.srcObject = remoteStream; el.volume = 0.88; void el.play().catch(() => {}); }
  }, [remoteStream]);

  useEffect(() => {
    if (state === "idle" || state === "ended") {
      if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
      setRecording(false);
    }
  }, [state]);
  useEffect(() => () => { if (clipUrl) URL.revokeObjectURL(clipUrl); }, [clipUrl]);

  function toggleRecord() {
    if (recording) { recRef.current?.stop(); return; }
    if (!remoteStream) return;
    try {
      const rec = new MediaRecorder(remoteStream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setClipUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        setRecording(false);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch { /* recording unsupported */ }
  }

  if (error && (state === "idle" || state === "ended")) {
    return (
      <div className="mx-4 mb-2 rounded-xl border border-wild/30 bg-wild/[0.1] px-3 py-2 text-xs text-wild">
        {error}
        {turnHint && <span className="mt-1 block text-white/40">{turnHint}</span>}
      </div>
    );
  }
  if (state === "idle" || state === "prep" || source === "cam") return null;

  if (state === "incoming") {
    return (
      <div className="mx-4 mb-2 flex items-center gap-2 rounded-2xl border border-veil-400/25 bg-veil-500/[0.12] px-3 py-2.5 text-sm backdrop-blur-sm">
        <Radio className="h-4 w-4 shrink-0 animate-pulse text-veil-200" />
        <span className="min-w-0 flex-1 truncate text-white/90">
          <span className="font-semibold">{peerName}</span> wants to go live (
          {source === "desktop" ? "desktop audio" : "mic"})
        </span>
        <button type="button" onClick={() => void session.acceptCall()} className="flex shrink-0 items-center gap-1 rounded-full bg-feel/25 px-2.5 py-1 text-xs font-semibold text-feel active:scale-95">
          <Check className="h-3 w-3" /> Accept
        </button>
        <button type="button" onClick={session.declineCall} aria-label="Decline" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full glass text-white active:scale-95">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const connecting = state === "calling" || state === "connecting";
  const vizStream = remoteStream ?? stream;
  return (
    <div className="mx-4 mb-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
      {error && (
        <p className="mb-2 text-[11px] text-amber-200/90">{error}</p>
      )}
      <div className="mb-2 flex items-center gap-2">
        <Circle className={connecting ? "h-2.5 w-2.5 animate-pulse fill-amber-400 text-amber-400" : "h-2.5 w-2.5 fill-feel text-feel"} />
        <span className="flex-1 truncate font-display text-sm font-semibold text-white">
          {connecting ? (state === "calling" ? `Calling ${peerName}…` : "Connecting…") : `Live with ${peerName}`}
          <span className="ml-1.5 font-sans text-[11px] font-normal text-white/45">
            {source === "desktop" ? "desktop audio" : "microphone"}
          </span>
        </span>
        <button type="button" onClick={session.endCall} aria-label="End session" className="flex h-8 w-8 items-center justify-center rounded-full bg-wild/20 text-wild active:scale-90">
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>

      <div className="h-14 overflow-hidden rounded-xl bg-black/25">
        {vizStream
          ? <LiveVisualizer stream={vizStream} />
          : <div className="flex h-full items-center justify-center text-white/30"><Loader2 className="h-4 w-4 animate-spin" /></div>}
      </div>
      <audio ref={audioRef} autoPlay className="hidden" />

      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={session.toggleMute} className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/85 active:scale-95">
          {session.muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />} {session.muted ? "Unmute" : "Mute"}
        </button>
        {!isHost && (
          <button type="button" onClick={toggleRecord} disabled={state !== "connected"} className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/85 active:scale-95 disabled:opacity-40">
            <Disc className={recording ? "h-3.5 w-3.5 animate-pulse text-wild" : "h-3.5 w-3.5"} /> {recording ? "Stop" : "Record"}
          </button>
        )}
        {clipUrl && (
          <>
            <a href={clipUrl} download={`vybz-live-${peerName}.webm`} className="flex items-center gap-1.5 rounded-full bg-veil-500/20 px-3 py-1.5 text-xs font-semibold text-veil-100 active:scale-95">
              <Download className="h-3.5 w-3.5" /> Save clip
            </a>
            <ExtractMidiButton source={clipUrl} title={`live-${peerName}`} />
          </>
        )}
      </div>
    </div>
  );
}
