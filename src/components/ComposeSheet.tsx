import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  Camera,
  Eye,
  HeartHandshake,
  ImagePlus,
  Phone,
  Send,
  ShieldAlert,
  Shuffle,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { VeiledArt } from "@/components/VeiledArt";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { VeiledVideo } from "@/components/VeiledVideo";
import { VideoTrimmer } from "@/components/VideoTrimmer";
import { Gyro3D } from "@/components/Gyro3D";
import {
  MAX_VIDEO_BYTES,
  maxClipSeconds,
  isVideoFile,
  probeVideo,
  processImage,
} from "@/lib/media";
import {
  DEFAULT_FONT,
  DEFAULT_FX,
  FONT_STYLES,
  TEXT_FX,
  fontClassFor,
  textFxClassFor,
} from "@/lib/expression";
import { CRISIS_RESOURCES, detectsCrisis } from "@/lib/safety";
import { cx } from "@/lib/utils";
import { playSound } from "@/lib/sound";

const MAX_LENGTH = 280;
const MIN_LENGTH = 12;

interface Media {
  url: string;
  kind: "image" | "video";
}

/**
 * Compose flow (top → bottom): the confession words first, then typography, then
 * premium expression (V¢-paid text effects + a 3D media view), then a Media
 * section for genuine uploads — captured live from the camera or chosen from the
 * device's storage. The background veils with the community while the words stay
 * legible — Whisper's soul, MYVYB's twist.
 */
export function ComposeSheet() {
  const {
    composeOpen,
    closeCompose,
    addConfession,
    showToast,
    isPremium,
    openLifeline,
  } = useApp();
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [media, setMedia] = useState<Media | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [clipStart, setClipStart] = useState(0);
  const [nsfw, setNsfw] = useState(false);
  const [posting, setPosting] = useState(false);
  // Expression.
  const [fontStyle, setFontStyle] = useState<string>(DEFAULT_FONT);
  const [textFx, setTextFx] = useState<string>(DEFAULT_FX);
  const [view3d, setView3d] = useState(false);
  // Two inputs: one opens the camera (capture), one opens device storage.
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (composeOpen) {
      setText("");
      setSeed(Math.floor(Math.random() * 1_000_000));
      setMedia(null);
      setVideoDuration(0);
      setClipStart(0);
      setNsfw(false);
      setPosting(false);
      setFontStyle(DEFAULT_FONT);
      setTextFx(DEFAULT_FX);
      setView3d(false);
    }
  }, [composeOpen]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (isVideoFile(file)) {
        // Storage cap: reject oversized clips up front instead of failing the
        // upload silently later (which would leave a broken post).
        if (file.size > MAX_VIDEO_BYTES) {
          showToast(
            `That video is too large (max ${Math.round(
              MAX_VIDEO_BYTES / (1024 * 1024)
            )} MB). Try a shorter or lower-res clip.`
          );
          return;
        }
        const meta = await probeVideo(file);
        const url = URL.createObjectURL(file);
        setVideoDuration(meta.duration);
        setClipStart(0);
        setMedia({ url, kind: "video" });
      } else {
        const out = await processImage(file);
        setMedia({ url: out.dataUrl, kind: "image" });
      }
    } catch {
      showToast("Couldn't read that file. Try another.");
    }
  }

  function removeMedia() {
    setMedia(null);
    setVideoDuration(0);
    setClipStart(0);
    setNsfw(false);
  }

  const canPost = text.trim().length >= MIN_LENGTH && !posting;
  const showCrisisHelp = detectsCrisis(text);
  // Clip length scales with tier: standard up to 1:20, Godmode longer.
  const maxClip = maxClipSeconds(isPremium);
  const needsTrim = media?.kind === "video" && videoDuration > maxClip;
  const clipEnd =
    media?.kind === "video"
      ? Math.min(videoDuration, clipStart + maxClip)
      : undefined;
  const previewLevel = nsfw ? 0.06 : media ? 1 : 0.9;
  const previewTextClass = cx(fontClassFor(fontStyle), textFxClassFor(textFx));
  const gyroPreview = view3d && !!media;

  async function handlePost() {
    if (!canPost) return;
    setPosting(true);
    // Fire-and-forget: the store owns the media upload plus a global progress
    // indicator, so it keeps running even after the sheet closes and the user
    // navigates away. We close immediately for a snappy, premium feel.
    void addConfession({
      text,
      photo: media?.url,
      mediaKind: media?.kind,
      clipStart: media?.kind === "video" ? clipStart : undefined,
      clipEnd: media?.kind === "video" ? clipEnd : undefined,
      nsfw: nsfw || undefined,
      fontStyle: fontStyle !== DEFAULT_FONT ? fontStyle : undefined,
      textFx: textFx !== DEFAULT_FX ? textFx : undefined,
      view3d: view3d || undefined,
    });
    playSound("post");
    closeCompose();
    navigate("/local");
  }

  return (
    <AnimatePresence>
      {composeOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCompose}
            className="fixed inset-0 z-[55] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl"
          >
            <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-white/20" />

            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-display text-xl font-bold text-gradient">
                  New post
                </h2>
                <p className="text-[11px] text-white/40">
                  Share it with your area — anonymously.
                </p>
              </div>
              <button
                onClick={closeCompose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {/* Live preview — scales with the viewport so it fits short and
                  tall devices alike (never crowds the controls on small phones,
                  never wastes space on large ones). */}
              <div className="relative mb-4 block h-[32dvh] max-h-64 min-h-[11rem] w-full overflow-hidden rounded-2xl border border-white/10">
                {gyroPreview ? (
                  <Gyro3D className="absolute inset-0" enabled>
                    {media?.kind === "video" ? (
                      <VeiledVideo
                        src={media.url}
                        level={previewLevel}
                        nsfw={nsfw}
                        clipStart={clipStart}
                        clipEnd={clipEnd}
                      />
                    ) : (
                      <VeiledPhoto src={media!.url} level={previewLevel} nsfw={nsfw} />
                    )}
                  </Gyro3D>
                ) : media?.kind === "video" ? (
                  <VeiledVideo
                    src={media.url}
                    level={previewLevel}
                    nsfw={nsfw}
                    clipStart={clipStart}
                    clipEnd={clipEnd}
                  />
                ) : media?.kind === "image" ? (
                  <VeiledPhoto src={media.url} level={previewLevel} nsfw={nsfw} />
                ) : (
                  <VeiledArt seed={seed} level={0.9} />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                  <p
                    className={cx(
                      previewTextClass,
                      "line-clamp-3 text-base font-semibold leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
                    )}
                  >
                    {text.trim() || "Your confession will glow here…"}
                  </p>
                </div>
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {view3d && (
                    <span className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                      <Box className="h-3 w-3" /> 3D
                    </span>
                  )}
                  {nsfw && (
                    <span className="rounded-full bg-wild/80 px-2 py-0.5 text-[10px] font-bold text-white">
                      NSFW
                    </span>
                  )}
                </div>
                {/* Reshuffle the generative backdrop for text-only posts. */}
                {!media && (
                  <button
                    type="button"
                    onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
                    className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition active:scale-95"
                  >
                    <Shuffle className="h-3.5 w-3.5" /> Shuffle art
                  </button>
                )}
              </div>

              {/* 1) Confession text — the words come first. */}
              <div className="relative mb-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
                  placeholder="Whisper the thing you've never said out loud…"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[15px] leading-relaxed text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none focus:ring-1 focus:ring-veil-400/40"
                />
                <span
                  className={cx(
                    "absolute bottom-3 right-3 text-[11px]",
                    text.length >= MAX_LENGTH ? "text-wild" : "text-white/35"
                  )}
                >
                  {text.length}/{MAX_LENGTH}
                </span>
              </div>

              {/* 2) Font style — directly under the text input (free). */}
              <div className="mb-3">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-white/70">
                  <Type className="h-3.5 w-3.5 text-veil-200" /> Font style
                </span>
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                  {FONT_STYLES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontStyle(f.id)}
                      className={cx(
                        "shrink-0 rounded-full px-3.5 py-1.5 text-xs transition active:scale-95",
                        f.className,
                        fontStyle === f.id
                          ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                          : "bg-white/[0.04] text-white/55"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3) Expression — text effects + 3D view, free for everyone. */}
              <div className="mb-3 rounded-2xl border border-veil-400/15 bg-veil-500/[0.05] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-veil-100/90">
                    <Sparkles className="h-3.5 w-3.5" /> Effects
                  </span>
                </div>

                {/* Text effects. */}
                <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
                  {TEXT_FX.map((fx) => {
                    const active = textFx === fx.id;
                    return (
                      <button
                        key={fx.id}
                        type="button"
                        onClick={() => setTextFx(fx.id)}
                        title={fx.hint}
                        className={cx(
                          "flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
                          active
                            ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                            : "bg-white/[0.04] text-white/55"
                        )}
                      >
                        {fx.label}
                      </button>
                    );
                  })}
                </div>

                {/* 3D gyroscopic media view. */}
                <button
                  type="button"
                  onClick={() => setView3d((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-left"
                >
                  <span className="flex items-center gap-1.5 text-sm text-white/80">
                    <Box
                      className={cx(
                        "h-4 w-4",
                        view3d ? "text-veil-200" : "text-white/40"
                      )}
                    />
                    3D gyroscopic view
                  </span>
                  <span
                    className={cx(
                      "relative h-6 w-11 rounded-full transition-colors",
                      view3d ? "bg-veil-500" : "bg-white/15"
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={cx(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
                        view3d ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>
              </div>

              {/* 4) Media — your own photo or video, captured or from storage. */}
              <div className="mb-4 rounded-2xl border border-veil-400/20 bg-veil-500/[0.06] p-3">
                <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-veil-100">
                  <ImagePlus className="h-3.5 w-3.5" /> Add a photo or video
                </span>

                {/* Camera capture (mobile opens the camera directly). */}
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={handleFile}
                  className="hidden"
                />
                {/* Device storage / gallery picker. */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFile}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/75 transition active:scale-[0.98]"
                  >
                    <Camera className="h-4 w-4" /> Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/75 transition active:scale-[0.98]"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {media ? "Replace" : "Library"}
                  </button>
                  {media && (
                    <button
                      type="button"
                      onClick={removeMedia}
                      aria-label="Remove media"
                      className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 transition active:scale-[0.95] hover:text-wild"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-white/40">
                  Genuine moments only — captured live or from your device.
                </p>
              </div>

              {/* Trimmer for long videos. */}
              {needsTrim && media && (
                <VideoTrimmer
                  src={media.url}
                  duration={videoDuration}
                  start={clipStart}
                  maxSeconds={maxClip}
                  onChange={setClipStart}
                />
              )}

              {/* Optional self-mark sensitive (uploaded media only). */}
              {media && (
                <button
                  type="button"
                  onClick={() => setNsfw((v) => !v)}
                  className="mb-4 flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-3"
                >
                  <span className="flex items-center gap-1.5 text-sm text-white/80">
                    <ShieldAlert
                      className={cx("h-4 w-4", nsfw ? "text-wild" : "text-white/40")}
                    />
                    Mark media as sensitive (NSFW)
                  </span>
                  <span
                    className={cx(
                      "relative h-6 w-11 rounded-full transition-colors",
                      nsfw ? "bg-veil-500" : "bg-white/15"
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={cx(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow",
                        nsfw ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>
              )}

              {/* Supportive, non-blocking crisis help. */}
              <AnimatePresence>
                {showCrisisHelp && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mb-4 rounded-2xl border border-feel/30 bg-feel/10 p-4"
                  >
                    <div className="flex items-start gap-2.5">
                      <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-feel" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          You're not alone.
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-white/65">
                          If you're going through something heavy, support is
                          available right now — free and confidential.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              closeCompose();
                              openLifeline();
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-feel px-3 py-1.5 text-xs font-semibold text-black shadow-glow active:scale-95"
                          >
                            <HeartHandshake className="h-3.5 w-3.5" /> Talk to someone now
                          </button>
                          <a
                            href={CRISIS_RESOURCES.callHref}
                            className="flex items-center gap-1.5 rounded-full bg-feel/20 px-3 py-1.5 text-xs font-semibold text-feel"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call or text 988
                          </a>
                          <a
                            href={CRISIS_RESOURCES.findHelpHref}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70"
                          >
                            Find a helpline
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-start gap-1.5 text-xs text-white/45">
                <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-veil-300" />
                Posted anonymously. Your profile details (if public) appear with
                your expression.
              </div>
            </div>

            {/* Sticky action footer — keeps the primary CTA in reach while the
                body scrolls, mirroring the create/edit layout pattern. */}
            <div className="shrink-0 border-t border-white/10 bg-ink-900/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              <button
                onClick={handlePost}
                disabled={!canPost}
                className="btn btn-primary w-full py-3.5"
              >
                <Send className="h-4 w-4" />
                {posting
                  ? "Releasing…"
                  : text.trim().length >= MIN_LENGTH
                    ? "Release it to your area"
                    : `Write ${Math.max(0, MIN_LENGTH - text.trim().length)} more characters`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
