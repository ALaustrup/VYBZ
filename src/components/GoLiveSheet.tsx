import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2, Monitor, Radio, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { useReduceFx } from "@/lib/display";
import { setLivePreviewHandoff } from "@/lib/livePreviewHandoff";
import { overlayVariants, sheetVariants, springSoft, withReduce } from "@/lib/motion";
import { cx } from "@/lib/utils";
import type { LiveSource } from "@/types";

/**
 * Go-live sheet — Studio Glass. Captures camera and/or display for local preview,
 * creates a live_sessions row (LiveKit SFU + optional Bunny HLS/VOD), then hands
 * the MediaStream to LiveWatch for publish.
 */
export function GoLiveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { showToast, profile } = useSession();
  const reduce = useReduceFx();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOff = useRef(false);
  const [source, setSource] = useState<LiveSource>("camera");
  const [title, setTitle] = useState("");
  const [intent, setIntent] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [gates, setGates] = useState<api.InfraGatesStatus | null>(null);

  useEffect(() => {
    if (!open) {
      if (!handedOff.current) stopPreview();
      handedOff.current = false;
      setTitle("");
      setIntent("");
      setSource("camera");
      setErr(null);
      setBusy(false);
      setGates(null);
      return;
    }
    void api.fetchInfraGates().then(setGates);
  }, [open]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => {});
    }
  }, [previewing]);

  function stopPreview() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPreviewing(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startPreview() {
    setErr(null);
    stopPreview();
    try {
      let stream: MediaStream;
      if (source === "display") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else if (source === "both") {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const desk = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Prefer display as main video; keep cam audio if display has none.
        const tracks = [
          ...desk.getVideoTracks(),
          ...(desk.getAudioTracks().length ? desk.getAudioTracks() : cam.getAudioTracks()),
        ];
        cam.getVideoTracks().forEach((t) => t.stop());
        stream = new MediaStream(tracks);
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      streamRef.current = stream;
      setPreviewing(true);
    } catch {
      setErr("Couldn't access that source. Check permissions and try again.");
    }
  }

  async function goLive() {
    setBusy(true);
    setErr(null);
    try {
      if (!previewing) await startPreview();
      const session = await api.startLiveSession({
        title: title.trim() || undefined,
        source,
        intent: intent.trim() || profile?.profile?.roleLabel || undefined,
      });
      if (!session) {
        setErr("Couldn't start the stream. Try again.");
        setBusy(false);
        return;
      }
      // Hand preview tracks to LiveWatch for LiveKit publish (do not stop them here).
      if (streamRef.current) {
        setLivePreviewHandoff(streamRef.current);
        streamRef.current = null;
        handedOff.current = true;
      }
      showToast("You're live");
      onClose();
      navigate(`/live/${session.id}`);
    } catch {
      setErr("Couldn't start the stream.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={withReduce(reduce, { duration: 0.22 })}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={withReduce(reduce, springSoft)}
            className="fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl"
          >
            <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-white/20" />
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">Go live</h2>
                <p className="text-[12px] text-white/40">Ultra public live — camera, display, or both via SFU.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>
            <div className="mx-5 h-px bg-[var(--hairline)]" />

            <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--hairline)] bg-ink-950/60">
                <video ref={videoRef} muted playsInline className={cx("h-full w-full object-cover", !previewing && "hidden")} />
                {!previewing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30">
                    <Radio className="h-8 w-8" />
                    <p className="text-xs">Preview your source</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 border-b border-[var(--hairline)]">
                {([
                  { id: "camera" as const, label: "Camera", icon: Camera },
                  { id: "display" as const, label: "Display", icon: Monitor },
                  { id: "both" as const, label: "Both", icon: Radio },
                ]).map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => { setSource(id); stopPreview(); }}
                    className={cx("relative flex items-center gap-1.5 pb-2.5 text-[13px] font-medium transition",
                      source === id ? "text-white" : "text-white/40 hover:text-white/70")}>
                    <Icon className="h-3.5 w-3.5" /> {label}
                    {source === id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
                  </button>
                ))}
              </div>

              <button type="button" onClick={() => void startPreview()} className="btn btn-ghost w-full py-3 text-sm">
                {previewing ? "Refresh preview" : "Start preview"}
              </button>

              <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                placeholder="Title (optional)"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
              <input value={intent} onChange={(e) => setIntent(e.target.value.slice(0, 80))}
                placeholder="Intent — e.g. Seeking a vocalist"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />

              {err && <p className="text-xs font-medium text-wild">{err}</p>}
              {gates && (
                <ul className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/50">
                  <li>
                    <span className={gates.turnConfigured ? "text-emerald-300/90" : "text-amber-200/80"}>
                      {gates.turnConfigured ? "TURN ready" : "TURN not provisioned"}
                    </span>
                    {" — "}STUN always on; TURN unlocks strict-NAT 1:1 reliability.
                  </li>
                  <li>
                    <span className={gates.bunnyLiveConfigured ? "text-emerald-300/90" : "text-amber-200/80"}>
                      {gates.bunnyLiveConfigured ? "Bunny Stream ready" : "Bunny Stream not configured"}
                    </span>
                    {" — "}OBS RTMP / HLS only when Stream library secrets exist.
                  </li>
                </ul>
              )}
              <p className="text-[11px] leading-relaxed text-white/35">
                Public ultra tier for all creators — expires after 24 hours. In-app publish uses LiveKit when configured; OBS RTMP remains optional for Bunny HLS/VOD.
              </p>
            </div>

            <div className="shrink-0 border-t border-[var(--hairline)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => void goLive()} disabled={busy}
                className="btn btn-primary w-full py-3.5">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Radio className="h-4 w-4" /> Go live</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
