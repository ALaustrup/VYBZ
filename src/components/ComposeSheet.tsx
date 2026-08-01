import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { overlayVariants, sheetVariants, springSoft, withReduce } from "@/lib/motion";
import { useReduceFx } from "@/lib/display";
import { AudioLines, Globe, Loader2, Lock, Pause, Play, Send, Trash2, Users, X } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { softUploadHint } from "@/components/ProBadge";
import { OriginalityClaim } from "@/components/OriginalityClaim";
import { VisualPicker } from "@/components/VisualPicker";
import { Waveform } from "@/components/Waveform";
import {
  AUDIO_ACCEPT, audioMeta, computeWaveform, placeholderWaveform, qualityLabel,
  sha256Hex, acousticSignature,
} from "@/lib/waveform";
import {
  isVideoFile, prepareUploadFile,
} from "@/lib/audioEdit";
import { playTrack, patchCurrentTrack, usePlayer, seekFraction } from "@/lib/audioBus";
import { MUSICAL_KEYS } from "@/lib/profileFields";
import { readId3Tags, titleFromFilename } from "@/lib/id3Tags";
import {
  buildPlaybackCustomization,
  type PlaybackCustomization,
} from "@/lib/playbackCustomization";
import { takeStudioBackdropHandoff } from "@/lib/studioBackdropHandoff";
import { cx, paletteFor } from "@/lib/utils";
import type { AssetKind, PostAudience, PostFx, ReleaseType } from "@/types";

const KINDS: { id: AssetKind; label: string }[] = [
  { id: "track", label: "Track" }, { id: "loop", label: "Loop" }, { id: "sample", label: "Sample" },
  { id: "oneshot", label: "One-shot" }, { id: "stem", label: "Stem" }, { id: "acapella", label: "Acapella" },
  { id: "midi", label: "MIDI" }, { id: "preset", label: "Preset" }, { id: "project", label: "Project" },
];
const RELEASE_TYPES: { id: ReleaseType; label: string }[] = [
  { id: "original", label: "Original" }, { id: "remix", label: "Remix" }, { id: "cover", label: "Cover" },
  { id: "edit", label: "Edit" }, { id: "mashup", label: "Mashup" }, { id: "live", label: "Live" },
  { id: "instrumental", label: "Instrumental" }, { id: "bootleg", label: "Bootleg" },
];
const PREVIEW_ID = "compose-preview";
const MAX_AUDIO_BYTES = 1024 * 1024 * 1024;
/** Short loop / still for VDock + DropStage — public CDN via bunny-upload kind=post. */
const MAX_BACKDROP_BYTES = 80 * 1024 * 1024;
function prettyBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

interface AudioState {
  file: File; url: string; ext: string; peaks: number[];
  duration: number; format: string; lossless: boolean; sampleRate: number;
  fromVideo: boolean;
}

export function ComposeSheet({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) {
  const { showToast, celebrate, profile } = useSession();
  const reduce = useReduceFx();
  const [title, setTitle] = useState("");
  const [album, setAlbum] = useState("");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [audio, setAudio] = useState<AudioState | null>(null);
  const [kind, setKind] = useState<AssetKind>("track");
  const [releaseType, setReleaseType] = useState<ReleaseType>("original");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [ownershipClaim, setOwnershipClaim] = useState(false);
  const [fx] = useState<PostFx>("glow");
  const [audience, setAudience] = useState<PostAudience>("public");
  const [creditedArtist, setCreditedArtist] = useState("");
  const [vdockVisualId, setVdockVisualId] = useState<string | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [backdropPreview, setBackdropPreview] = useState<string | null>(null);
  const [backdropFit, setBackdropFit] = useState<"cover" | "contain">("cover");
  const [backdropDim, setBackdropDim] = useState(0.35);
  const [decoding, setDecoding] = useState(false);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [autoDetected, setAutoDetected] = useState<string[]>([]);
  const [id3Meta, setId3Meta] = useState<{ genre?: string | null; year?: number | null }>({});
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const player = usePlayer();
  const previewPlaying = player.track?.id === PREVIEW_ID && player.playing;
  const previewProgress = player.track?.id === PREVIEW_ID && (player.duration || audio?.duration)
    ? player.currentTime / (player.duration || audio!.duration) : 0;
  const accent = paletteFor(seed)[0];

  const playback = useMemo((): PlaybackCustomization => {
    return buildPlaybackCustomization({
      reactiveStyle: fx,
      vdockVisualId: backdropPreview ? undefined : (vdockVisualId ?? undefined),
      // Preview uses object URL; real CDN URL is set at post time
      backdropUrl: backdropPreview ?? undefined,
      backdropFit,
      backdropDim,
    }, fx);
  }, [fx, vdockVisualId, backdropPreview, backdropFit, backdropDim]);

  useEffect(() => {
    if (!open) return;
    setTitle(""); setAlbum(""); setSeed(Math.floor(Math.random() * 1e6)); setAudio(null);
    setKind("track"); setReleaseType("original"); setBpm(""); setMusicalKey("");
    setOwnershipClaim(false);
    setAudience("public"); setCreditedArtist("");
    setVdockVisualId(null);
    setBackdropFile(null);
    setBackdropFit("cover"); setBackdropDim(0.35);
    setBackdropPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setDecoding(false); setPosting(false); setProgress(null); setAutoDetected([]);
    setId3Meta({}); setArtworkUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });

    let cancelled = false;
    void (async () => {
      try {
        const handoff = await takeStudioBackdropHandoff();
        if (cancelled || !handoff) return;
        const file = handoff.file;
        if (file.size > MAX_BACKDROP_BYTES) {
          showToast(`Visual max is ${prettyBytes(MAX_BACKDROP_BYTES)}.`);
          return;
        }
        setVdockVisualId(null);
        setBackdropFile(file);
        setBackdropPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(file);
        });
        showToast("Studio loop attached as custom backdrop");
      } catch {
        /* ignore missing IndexedDB */
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => () => {
    if (artworkUrl) URL.revokeObjectURL(artworkUrl);
  }, [artworkUrl]);

  useEffect(() => () => {
    if (backdropPreview) URL.revokeObjectURL(backdropPreview);
  }, [backdropPreview]);

  useEffect(() => {
    if (!open || player.track?.id !== PREVIEW_ID) return;
    patchCurrentTrack({
      accent,
      fx,
      playback,
      seed,
    });
  }, [playback, open, accent, fx, seed, player.track?.id]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      showToast(`That file is ${prettyBytes(file.size)} — max is 1 GB.`);
      return;
    }
    const soft = softUploadHint(file.size, profile?.profile);
    if (soft) showToast(soft);
    setDecoding(true);
    try {
      const fromVideo = isVideoFile(file);
      const [tags, meta, wf] = await Promise.all([
        readId3Tags(file).catch(() => ({
          title: null, artist: null, album: null, genre: null, genreMatched: null,
          year: null, bpm: null, artworkUrl: null,
        })),
        Promise.resolve(audioMeta(file)),
        computeWaveform(file, 800, true).catch(() => null),
      ]);
      const url = URL.createObjectURL(file);
      const ext = (file.name.split(".").pop() || "audio").toLowerCase();
      const duration = wf?.duration ?? 0;
      setAudio({
        file, url, ext,
        peaks: wf?.peaks ?? placeholderWaveform(seed),
        duration, format: fromVideo ? "video" : meta.format,
        lossless: fromVideo ? false : meta.lossless,
        sampleRate: wf?.sampleRate ?? 0,
        fromVideo,
      });

      setArtworkUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return tags.artworkUrl;
      });

      const auto: string[] = [];
      if (tags.title) { setTitle(tags.title.slice(0, 80)); auto.push("title"); }
      else setTitle(titleFromFilename(file.name).slice(0, 80));
      if (tags.artist) { setCreditedArtist(tags.artist.slice(0, 80)); auto.push("artist"); }
      if (tags.album) { setAlbum(tags.album.slice(0, 80)); auto.push("album"); }
      if (tags.bpm) { setBpm(String(tags.bpm)); auto.push("tempo"); }
      else if (wf?.bpm) { setBpm(String(wf.bpm)); auto.push("tempo"); }
      if (wf?.key && MUSICAL_KEYS.includes(wf.key)) { setMusicalKey(wf.key); auto.push("key"); }
      setId3Meta({ genre: tags.genreMatched ?? tags.genre, year: tags.year });
      if (tags.genre || tags.year) auto.push("tags");
      if (fromVideo) auto.push("video");
      setAutoDetected(auto);
    } catch {
      showToast("Couldn't read that file. Try WAV/MP3, or MP4 with an audio track.");
    } finally {
      setDecoding(false);
    }
  }

  function preview() {
    if (!audio) return;
    playTrack({
      id: PREVIEW_ID, url: audio.url, title: title || "Preview", artist: creditedArtist || "You",
      waveform: audio.peaks, durationSec: audio.duration,
      quality: qualityLabel(audio.format, audio.sampleRate, audio.lossless), lossless: audio.lossless,
      seed, accent, fx, playback,
    });
  }

  function handleBackdrop(file: File) {
    if (file.size > MAX_BACKDROP_BYTES) {
      showToast(`Visual max is ${prettyBytes(MAX_BACKDROP_BYTES)}.`);
      return;
    }
    const ok =
      file.type.startsWith("video/") ||
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";
    if (!ok) {
      showToast("Use MP4/WebM video or JPG/PNG/WebP still.");
      return;
    }
    setVdockVisualId(null);
    setBackdropFile(file);
    setBackdropPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearBackdrop() {
    setBackdropFile(null);
    setBackdropPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  async function post() {
    if (!audio || posting) return;
    if (!ownershipClaim) {
      showToast("Check the originality box — VYBZ is for your own music.");
      return;
    }
    setPosting(true);
    setProgress(0);
    try {
      const prepared = await prepareUploadFile({
        file: audio.file,
        range: {
          startSec: 0,
          endSec: audio.duration || 0,
        },
        targetFormat: audio.fromVideo ? "wav" : "original",
        baseName: title || audio.file.name,
      });
      const uploadExt = prepared.format || "wav";
      const path = await api.uploadAudio(prepared.file, uploadExt, (pct) => {
        setProgress(backdropFile ? Math.round(pct * 0.7) : pct);
      });
      if (!path) { showToast("Upload failed — check your connection."); return; }

      let backdropUrl: string | undefined;
      if (backdropFile) {
        setProgress(70);
        backdropUrl = await api.uploadPostMedia(backdropFile, (pct) => {
          setProgress(70 + Math.round(pct * 0.28));
        });
      }
      setProgress(null);

      const peaks = audio.peaks;
      const [sha256, fingerprint] = await Promise.all([
        sha256Hex(prepared.file).catch(() => undefined),
        acousticSignature(peaks).catch(() => undefined),
      ]);
      const playbackFinal = buildPlaybackCustomization({
        ...playback,
        vdockVisualId: backdropUrl ? undefined : (vdockVisualId ?? undefined),
        backdropUrl,
        backdropFit: backdropUrl ? backdropFit : undefined,
        backdropDim: backdropUrl ? backdropDim : undefined,
      }, fx);
      // Don't persist blob: preview URLs
      if (playbackFinal.backdropUrl?.startsWith("blob:")) delete playbackFinal.backdropUrl;

      const drop = await api.createDrop({
        title: title.trim() || undefined, seed, assetKind: kind, audioUrl: path,
        waveform: peaks, durationSec: prepared.durationSec, bpm: bpm ? Number(bpm) : undefined,
        musicalKey: musicalKey || undefined, audioFormat: prepared.format,
        sampleRate: prepared.sampleRate || undefined,
        lossless: prepared.lossless, license: "collab-only", sha256, fingerprint, fx, audience,
        playbackCustomization: playbackFinal,
        creditedArtist: creditedArtist.trim() || undefined,
        album: album.trim() || undefined,
        releaseType,
      });
      if (!drop) { showToast("Couldn't post that drop."); return; }
      celebrate(audience === "private" ? "Private drop saved" : "Your drop is live");
      onClose();
      onPosted();
    } catch (err) {
      showToast((err as Error).message || "Couldn't prepare that upload.");
    } finally {
      setPosting(false);
      setProgress(null);
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
            className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={withReduce(reduce, springSoft)}
            className="fixed inset-x-0 bottom-0 z-[85] mx-auto flex max-h-[min(94dvh,100dvh)] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl"
            data-dark-stage
          >
            <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-white/20" />
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">New drop</h2>
                <p className="text-[12px] text-white/40">Trim, convert, then release.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>
            <div className="mx-5 h-px bg-[var(--hairline)]" />

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
              <div className="relative mb-4 block h-[26dvh] max-h-56 min-h-[10rem] w-full overflow-hidden rounded-2xl border border-[var(--hairline)] bg-ink-950/50">
                {artworkUrl && (
                  <img src={artworkUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" draggable={false} />
                )}
                {audio ? (
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    <span className="flex items-center gap-1.5 self-start text-[11px] font-medium text-white/55">
                      <AudioLines className="h-3.5 w-3.5 text-veil-300" />
                      {audio.fromVideo ? "Video → audio" : (qualityLabel(audio.format, audio.sampleRate, audio.lossless) || "Audio")}
                    </span>
                    <button type="button" onClick={preview} aria-label={previewPlaying ? "Pause" : "Play"}
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition active:scale-90">
                      {previewPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
                    </button>
                    <Waveform peaks={audio.peaks} progress={previewProgress} accent={accent} height={40}
                      onSeek={player.track?.id === PREVIEW_ID ? (f) => seekFraction(f) : undefined} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AudioLines className="h-10 w-10 text-white/15" />
                  </div>
                )}
              </div>

              <input ref={fileRef} type="file" accept={AUDIO_ACCEPT} onChange={handleFile} className="hidden" />
              {!audio ? (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={decoding}
                  className="btn btn-primary mb-3 w-full py-3.5 disabled:opacity-60">
                  <AudioLines className="h-4 w-4" />{decoding ? "Reading…" : "Upload audio or video"}
                </button>
              ) : (
                <div className="mb-3 space-y-3">
                  <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-[var(--hairline)]">
                    {KINDS.map((k) => (
                      <button key={k.id} type="button" onClick={() => setKind(k.id)}
                        className={cx("relative shrink-0 pb-2.5 text-xs font-medium transition",
                          kind === k.id ? "text-white" : "text-white/40 hover:text-white/70")}>
                        {k.label}
                        {kind === k.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-white/60">Release type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RELEASE_TYPES.map((r) => (
                        <button key={r.id} type="button" onClick={() => setReleaseType(r.id)}
                          className={cx("forge-chip", releaseType === r.id ? "forge-chip--active" : "")}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="forge-field w-24 !py-2">
                      <input type="number" inputMode="numeric" value={bpm} onChange={(e) => setBpm(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                        placeholder="BPM" />
                    </div>
                    <div className="forge-field min-w-0 flex-1 !py-2">
                      <select value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)}
                        className="w-full bg-transparent text-sm text-white/85 outline-none">
                        <option value="">Key (optional)</option>
                        {MUSICAL_KEYS.map((k) => <option key={k} value={k} className="bg-ink-900">{k}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => {
                      setAudio(null); setAutoDetected([]); setId3Meta({}); setAlbum("");
                      setArtworkUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
                    }} aria-label="Remove"
                      className="forge-card-icon flex w-11 shrink-0 items-center justify-center text-white/55 transition active:scale-95 hover:text-wild"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {autoDetected.length > 0 && (
                    <p className="flex items-center gap-1 text-[11px] text-veil-200">
                      <AudioLines className="h-3 w-3" /> From file: {autoDetected.join(", ")} — edit if needed
                    </p>
                  )}
                  {(id3Meta.genre || id3Meta.year) && (
                    <p className="text-[11px] text-white/40">
                      {[id3Meta.genre, id3Meta.year].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div>
                    <p className="nexus-eyebrow mb-2">Originality</p>
                    <OriginalityClaim checked={ownershipClaim} onChange={setOwnershipClaim} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-white/60">Song title</label>
                    <div className="forge-field">
                      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                        placeholder="Song title…" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-white/60">Album / EP / Single</label>
                    <div className="forge-field">
                      <input value={album} onChange={(e) => setAlbum(e.target.value.slice(0, 80))}
                        placeholder="Leave blank for Single" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-white/60">Artist name</label>
                    <div className="forge-field">
                      <input value={creditedArtist} onChange={(e) => setCreditedArtist(e.target.value.slice(0, 80))}
                        placeholder="Artist / band credited on the card" />
                    </div>
                  </div>

                  <VisualPicker
                    selectedId={vdockVisualId}
                    customPreview={backdropPreview}
                    customIsVideo={!!backdropFile?.type.startsWith("video/")}
                    backdropFit={backdropFit}
                    backdropDim={backdropDim}
                    onSelectCatalog={setVdockVisualId}
                    onCustomFile={handleBackdrop}
                    onClearCustom={clearBackdrop}
                    onFitChange={setBackdropFit}
                    onDimChange={setBackdropDim}
                    onBeforeTutorial={onClose}
                  />

                  <div>
                    <p className="mb-1.5 text-[12px] font-semibold text-white/60">Audience</p>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setAudience("public")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "public" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Globe className="h-3.5 w-3.5" /> Public</button>
                      <button type="button" onClick={() => setAudience("followers")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "followers" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Users className="h-3.5 w-3.5" /> Network</button>
                      <button type="button" onClick={() => setAudience("private")} className={cx("flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[12px] font-semibold transition", audience === "private" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}><Lock className="h-3.5 w-3.5" /> Private</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[var(--hairline)] bg-ink-900/95 px-5 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
              {progress !== null && (
                <div className="mb-2.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                    <span>{progress < 100 ? "Uploading…" : "Finalizing…"}{audio ? ` · ${prettyBytes(audio.file.size)}` : ""}</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-veil-400 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              <button type="button" onClick={post} disabled={!audio || posting || !ownershipClaim} className="btn btn-primary w-full py-3.5 disabled:opacity-50">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Release your drop</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
