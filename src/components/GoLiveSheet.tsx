import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Globe2, Loader2, Monitor, Radio, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { useReduceFx } from "@/lib/display";
import { setLivePreviewHandoff } from "@/lib/livePreviewHandoff";
import { overlayVariants, sheetVariants, springSoft, withReduce } from "@/lib/motion";
import { cx } from "@/lib/utils";
import type { LiveAudience, LiveSource } from "@/types";

type WizardStep = "source" | "audience" | "details";

/**
 * Go-live wizard — source → Circle | World → title/intent → Go.
 */
export function GoLiveSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { showToast, profile } = useSession();
  const reduce = useReduceFx();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOff = useRef(false);
  const [step, setStep] = useState<WizardStep>("source");
  const [source, setSource] = useState<LiveSource>("camera");
  const [audience, setAudience] = useState<LiveAudience>("world");
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
      setAudience("world");
      setStep("source");
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
  }, [previewing, step]);

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
        visibility: audience,
      });
      if (!session) {
        setErr("Couldn't start the stream. Try again.");
        setBusy(false);
        return;
      }
      if (streamRef.current) {
        setLivePreviewHandoff(streamRef.current);
        streamRef.current = null;
        handedOff.current = true;
      }
      showToast(audience === "circle" ? "Live to your circle" : "Live to the world");
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
                <p className="text-[12px] text-white/40">
                  {step === "source" ? "1 · Source" : step === "audience" ? "2 · Audience" : "3 · Details"}
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>
            <div className="mx-5 h-px bg-[var(--hairline)]" />

            <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {step === "source" && (
                <>
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-[var(--hairline)] bg-ink-950/60">
                    <video ref={videoRef} muted playsInline className={cx("h-full w-full object-cover", !previewing && "hidden")} />
                    {!previewing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30">
                        <Radio className="h-8 w-8" />
                        <p className="text-xs">Preview</p>
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
                        {source === id && <span className="absolute inset-x-0 bottom-0 h-px bg-[rgb(var(--neon-cyan)/0.7)]" />}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => void startPreview()} className="btn btn-ghost w-full py-3 text-sm">
                    {previewing ? "Refresh preview" : "Start preview"}
                  </button>
                </>
              )}

              {step === "audience" && (
                <div className="grid gap-3">
                  {([
                    { id: "circle" as const, label: "Circle", hint: "Accepted connections only", icon: Users },
                    { id: "world" as const, label: "World", hint: "Public listing", icon: Globe2 },
                  ]).map(({ id, label, hint, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAudience(id)}
                      className={cx(
                        "flex items-center gap-3 rounded-2xl border p-4 text-left transition active:scale-[0.99]",
                        audience === id
                          ? "border-[rgb(var(--neon-cyan)/0.6)] bg-[rgb(var(--neon-cyan)/0.12)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20",
                      )}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-[rgb(var(--neon-cyan))]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block font-display text-base font-semibold text-white">{label}</span>
                        <span className="block text-[12px] text-white/45">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {step === "details" && (
                <>
                  <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                    placeholder="Title (optional)"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
                  <input value={intent} onChange={(e) => setIntent(e.target.value.slice(0, 80))}
                    placeholder="Intent — e.g. Seeking a vocalist"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
                  <p className="text-[12px] text-white/40">
                    {audience === "circle" ? "👁 Circle" : "🌍 World"}
                    {" · "}
                    {source}
                  </p>
                  {gates && (
                    <ul className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/50">
                      <li>
                        <span className={gates.turnConfigured ? "text-emerald-300/90" : "text-amber-200/80"}>
                          {gates.turnConfigured ? "TURN ready" : "TURN not provisioned"}
                        </span>
                      </li>
                      <li>
                        <span className={gates.bunnyLiveConfigured ? "text-emerald-300/90" : "text-amber-200/80"}>
                          {gates.bunnyLiveConfigured ? "Bunny Stream ready" : "Bunny optional"}
                        </span>
                      </li>
                    </ul>
                  )}
                </>
              )}

              {err && <p className="text-xs font-medium text-wild">{err}</p>}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-[var(--hairline)] px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {step !== "source" && (
                <button
                  type="button"
                  onClick={() => setStep(step === "details" ? "audience" : "source")}
                  className="btn btn-ghost flex-1 py-3.5"
                >
                  Back
                </button>
              )}
              {step === "source" && (
                <button type="button" onClick={() => setStep("audience")} className="btn btn-primary flex-1 py-3.5">
                  Next
                </button>
              )}
              {step === "audience" && (
                <button type="button" onClick={() => setStep("details")} className="btn btn-primary flex-1 py-3.5">
                  Next
                </button>
              )}
              {step === "details" && (
                <button type="button" onClick={() => void goLive()} disabled={busy} className="btn btn-primary flex-1 py-3.5">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Radio className="h-4 w-4" /> Go</>}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
