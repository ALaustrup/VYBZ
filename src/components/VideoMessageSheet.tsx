/**
 * Offline cam fallback — record up to 30s HQ video message for when they return.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Square, Video, X, Send } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

const MAX_SEC = 30;

export function VideoMessageSheet({
  open,
  threadId,
  peerName,
  onClose,
  onSent,
}: {
  open: boolean;
  threadId: string;
  peerName: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const { showToast, celebrate } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false); setRecording(false); setElapsed(0);
    setBlob(null); setError(null); setSending(false);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setError("Couldn't open camera — allow cam & mic, then try again.");
      }
    })();

    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      if (recRef.current && recRef.current.state !== "inactive") {
        try { recRef.current.stop(); } catch { /* ignore */ }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function stopTicker() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream || recording || blob) return;
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
    try {
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stopTicker();
        setRecording(false);
        const b = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(b);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setBlob(b);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.muted = false;
          void videoRef.current.play().catch(() => {});
        }
      };
      rec.start(250);
      recRef.current = rec;
      setRecording(true);
      setElapsed(0);
      const started = Date.now();
      tickRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - started) / 1000);
        setElapsed(sec);
        if (sec >= MAX_SEC) stopRecording();
      }, 200);
    } catch {
      setError("Recording isn't supported on this browser.");
    }
  }

  function stopRecording() {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  }

  function retake() {
    setBlob(null);
    setElapsed(0);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      void videoRef.current.play().catch(() => {});
    }
  }

  async function send() {
    if (!blob || sending) return;
    setSending(true);
    const url = await api.uploadChatMedia(blob, "webm");
    if (!url) {
      showToast("Couldn't upload that video");
      setSending(false);
      return;
    }
    await api.sendMessage(threadId, "Video message", { kind: "video", mediaUrl: url });
    celebrate("Video message sent — they'll see it when they're back");
    setSending(false);
    onSent?.();
    onClose();
  }

  const left = Math.max(0, MAX_SEC - elapsed);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[92] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={sending ? undefined : onClose} />
          <motion.div
            role="dialog"
            aria-label={`Video message for @${peerName}`}
            data-dark-stage
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl sm:rounded-3xl"
          >
            <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold text-white">Video message</p>
                <p className="text-[12px] text-white/45">
                  @{peerName} is offline — leave up to {MAX_SEC}s. They&apos;ll get it the moment they return.
                </p>
              </div>
              <button type="button" onClick={onClose} disabled={sending} aria-label="Close"
                className="rounded-full p-2 text-white/50 hover:bg-white/8 disabled:opacity-40">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="relative aspect-[9/14] max-h-[min(62dvh,520px)] bg-black sm:aspect-video sm:max-h-[50dvh]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={!blob}
                controls={!!blob}
                className={cx("h-full w-full object-cover", !blob && "scale-x-[-1]")}
              />
              {recording && (
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-wild/90 px-2.5 py-1 text-[11px] font-bold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  {elapsed}s · {left}s left
                </div>
              )}
              {!ready && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
                  <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
                </div>
              )}
            </div>

            {error && <p className="px-4 py-2 text-[12px] text-wild">{error}</p>}

            <div className="flex items-center justify-center gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {!blob ? (
                recording ? (
                  <button type="button" onClick={stopRecording}
                    className="flex items-center gap-2 rounded-full bg-wild/90 px-5 py-3 text-sm font-semibold text-white active:scale-95">
                    <Square className="h-4 w-4 fill-current" /> Stop
                  </button>
                ) : (
                  <button type="button" disabled={!ready} onClick={startRecording}
                    className="flex items-center gap-2 rounded-full bg-feel px-5 py-3 text-sm font-semibold text-ink-950 active:scale-95 disabled:opacity-40">
                    <Video className="h-4 w-4" /> Record (max {MAX_SEC}s)
                  </button>
                )
              ) : (
                <>
                  <button type="button" disabled={sending} onClick={retake}
                    className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-40">
                    Retake
                  </button>
                  <button type="button" disabled={sending} onClick={() => void send()}
                    className="flex items-center gap-2 rounded-full bg-feel px-5 py-3 text-sm font-semibold text-ink-950 active:scale-95 disabled:opacity-40">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
