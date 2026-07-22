import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Globe, Image as ImageIcon, Loader2, Lock, Music2, Upload, Users, X, Zap } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import { isHubKind } from "@/components/projects/ProjectView";
import type { PostAudience, PostFx, PostKind, ProfileProject } from "@/types";

const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none";
const FX_OPTIONS: { id: PostFx; label: string }[] = [
  { id: "glow", label: "Glow" },
  { id: "aurora", label: "Aurora" },
  { id: "pulse", label: "Pulse" },
  { id: "bars", label: "Bars" },
  { id: "ripple", label: "Ripple" },
  { id: "off", label: "Off" },
];
const MAX_WORDS = 250;
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const acceptFor = (k: PostKind) => k === "audio" ? "audio/*" : k === "image" ? "image/*" : k === "video" ? "video/*" : "*/*";

/**
 * Guided "share something" composer: pick a format, upload media (with a live
 * preview + real progress), write up to 250 words, set audience + schedule, Do It.
 */
export function PostComposer({ project, onClose, onPosted }: { project: ProfileProject; onClose: () => void; onPosted: () => void }) {
  const { showToast } = useSession();
  const startKind: PostKind = project.kind === "music" ? "audio" : project.kind === "art" ? "image" : project.kind === "video" ? "video" : "text";
  const [kind, setKind] = useState<PostKind>(startKind);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [audience, setAudience] = useState<PostAudience>("public");
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState("");
  const [fx, setFx] = useState<PostFx>("glow");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hub = isHubKind(project.kind);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function pick(f: File) {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setProgress(0);
    try {
      const url = await api.uploadPostMedia(f, setProgress);
      setMediaUrl(url); setProgress(100);
    } catch { showToast("Upload failed — you can paste a URL instead."); setProgress(null); }
  }

  const needsMedia = kind === "audio" || kind === "image" || kind === "video";
  const uploading = progress !== null && progress < 100;
  const canPost = !busy && !uploading && (
    (kind === "text" && body.trim().length > 0) ||
    (kind === "link" && mediaUrl.trim().length > 0) ||
    (needsMedia && mediaUrl.trim().length > 0) ||
    body.trim().length > 0
  );

  async function doIt() {
    if (busy) return;
    setBusy(true);
    try {
      await api.createPost({
        projectId: project.id, kind,
        title: title.trim() || null, body: body.trim() || null,
        mediaUrl: (needsMedia) ? (mediaUrl.trim() || null) : null,
        linkUrl: kind === "link" ? (mediaUrl.trim() || null) : null,
        audience,
        scheduledAt: schedule && when ? new Date(when).toISOString() : null,
        fx: (kind === "audio" || kind === "video") ? fx : "off",
      });
      showToast(schedule && when ? "Scheduled ✦" : "Posted ✦");
      onPosted(); onClose();
    } catch { showToast("Couldn't post"); }
    finally { setBusy(false); }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="glass-panel relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
          <div className="flex items-center gap-2 border-b border-white/8 px-5 py-4">
            <h2 className="flex-1 font-display text-lg font-bold text-white">Share to {project.name}</h2>
            <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
          </div>

          <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Format */}
            {!hub && (
              <div className="flex flex-wrap gap-1.5">
                {(["audio", "image", "video", "text", "link"] as PostKind[]).map((k) => (
                  <button key={k} onClick={() => setKind(k)} className={cx("rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition active:scale-95", kind === k ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.05] text-white/60 hover:text-white/90")}>{k}</button>
                ))}
              </div>
            )}

            {/* Media */}
            {needsMedia && (
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept={acceptFor(kind)} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void pick(f); }} />
                {!file && !mediaUrl && (
                  <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 py-8 text-white/60 transition hover:border-veil-400/50 hover:text-white active:scale-[0.99]">
                    <Upload className="h-7 w-7" />
                    <span className="text-sm font-semibold">Upload {kind}</span>
                    <span className="text-[11px] text-white/40">or paste a URL below</span>
                  </button>
                )}
                {(file || mediaUrl) && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3">
                      {kind === "image" && (previewUrl || mediaUrl) ? (
                        <img src={previewUrl || mediaUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-veil-500/20 text-veil-100">{kind === "audio" ? <Music2 className="h-7 w-7" /> : <ImageIcon className="h-7 w-7" />}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white/85">{file?.name ?? "Media"}</p>
                        {progress !== null && progress < 100 ? (
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-veil-400 transition-all" style={{ width: `${progress}%` }} /></div>
                        ) : mediaUrl ? <p className="text-[11px] text-feel">Ready ✓</p> : null}
                      </div>
                      <button onClick={() => { setFile(null); setMediaUrl(""); setProgress(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }} className="rounded-full p-1.5 text-white/40 hover:text-wild"><X className="h-4 w-4" /></button>
                    </div>
                    {kind === "audio" && (previewUrl || mediaUrl) && <audio src={previewUrl || mediaUrl} controls className="mt-2 w-full" />}
                  </div>
                )}
                <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder={`${kind[0].toUpperCase()}${kind.slice(1)} URL`} className={inputCls} />
              </div>
            )}
            {kind === "link" && <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" className={inputCls} />}

            {/* Words */}
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Title (optional)" className={inputCls} />
            <div>
              <textarea value={body} onChange={(e) => { const v = e.target.value; setBody(wordCount(v) > MAX_WORDS ? v.trim().split(/\s+/).slice(0, MAX_WORDS).join(" ") : v); }} rows={4} placeholder="Say something… (up to 250 words)" className={cx(inputCls, "resize-none")} />
              <p className="mt-1 text-right text-[11px] text-white/40">{wordCount(body)}/{MAX_WORDS} words</p>
            </div>

            {/* Audience */}
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-white/60">Audience</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setAudience("public")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "public" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Globe className="h-3.5 w-3.5" /> Public</button>
                <button type="button" onClick={() => setAudience("followers")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "followers" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Users className="h-3.5 w-3.5" /> Network</button>
                <button type="button" onClick={() => setAudience("private")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "private" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Lock className="h-3.5 w-3.5" /> Private</button>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <button onClick={() => setSchedule((s) => !s)} className="flex items-center gap-2 text-[13px] font-semibold text-white/70"><Clock className="h-4 w-4" /> {schedule ? "Scheduled for later" : "Post now"} <span className={cx("relative ml-1 h-5 w-9 rounded-full transition", schedule ? "bg-veil-500" : "bg-white/15")}><span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", schedule ? "left-[18px]" : "left-0.5")} /></span></button>
              {schedule && <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={cx(inputCls, "mt-2")} />}
            </div>

            {/* Per-post audio-reactive effect (audio/video only) */}
            {(kind === "audio" || kind === "video") && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/60"><Zap className="h-3.5 w-3.5 text-veil-200" /> Audio-reactive effect</p>
                <p className="mb-2 text-[11px] text-white/40">When someone plays this, the whole app reacts with your chosen effect.</p>
                <div className="flex flex-wrap gap-1.5">
                  {FX_OPTIONS.map((o) => (
                    <button key={o.id} onClick={() => setFx(o.id)}
                      className={cx("rounded-full px-3 py-1.5 text-[12px] font-medium transition active:scale-95", fx === o.id ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.05] text-white/60 hover:text-white/90")}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/8 px-5 py-4">
            <button onClick={doIt} disabled={!canPost} className="btn btn-primary h-12 w-full py-0 text-[15px] font-bold disabled:opacity-40">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Do It"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
