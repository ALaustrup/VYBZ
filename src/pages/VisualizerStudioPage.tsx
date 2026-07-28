import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Film,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Music2,
  Pause,
  Play,
  SkipBack,
  Sparkles,
  Upload,
  Waves,
} from "lucide-react";
import { StudioPreview } from "@/components/visualizer/StudioPreview";
import { pause as pauseGlobalPlayer } from "@/lib/audioBus";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import { AUDIO_ACCEPT } from "@/lib/waveform";
import {
  DEFAULT_STUDIO_SETTINGS,
  REACTIVE_STYLES,
  downloadBlob,
  extForMime,
  loadStudioDraftMeta,
  pickRecorderMime,
  recordStudioLoop,
  saveStudioDraftMeta,
  type StudioBands,
  type StudioReactiveSettings,
} from "@/lib/visualizerStudio";
import { cx } from "@/lib/utils";

const MEDIA_ACCEPT = "video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp";
const MAX_MEDIA_BYTES = 80 * 1024 * 1024;
const MAX_AUDIO_BYTES = 200 * 1024 * 1024;

function prettyBytes(n: number): string {
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function emptyBands(): StudioBands {
  return { bass: 0, mid: 0, high: 0, level: 0 };
}

/**
 * Simple audio-reactive visualizer editor —
 * upload media, attach music, tune FX, export a muted VDock loop.
 */
export function VisualizerStudioPage() {
  const navigate = useNavigate();
  const { showToast, celebrate } = useSession();

  const [settings, setSettings] = useState<StudioReactiveSettings>(() => {
    const draft = loadStudioDraftMeta();
    return { ...DEFAULT_STUDIO_SETTINGS, ...draft };
  });

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"video" | "image" | null>(null);
  const [mediaTick, setMediaTick] = useState(0);

  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [timeSec, setTimeSec] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bands, setBands] = useState<StudioBands>(emptyBands);
  const [freqs, setFreqs] = useState<Uint8Array | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState<number | null>(null);

  const mediaVideoRef = useRef<HTMLVideoElement>(null);
  const mediaImageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const freqBufRef = useRef<Uint8Array | null>(null);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  useRegisterAppBar({ title: "Visualizer studio" }, []);

  useEffect(() => {
    saveStudioDraftMeta(settings);
  }, [settings]);

  useEffect(() => () => {
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    void audioCtxRef.current?.close().catch(() => undefined);
  }, [mediaUrl, musicUrl]);

  const patch = useCallback((partial: Partial<StudioReactiveSettings>) => {
    setSettings((s) => ({ ...s, ...partial }));
  }, []);

  function ensureAnalyser(el: HTMLAudioElement) {
    if (analyserRef.current && sourceRef.current) return;
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = audioCtxRef.current ?? new AC();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      // One MediaElementSource per element — only wire once
      if (!sourceRef.current) {
        const src = ctx.createMediaElementSource(el);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.35;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        sourceRef.current = src;
        analyserRef.current = analyser;
        freqBufRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
    } catch {
      /* analyser optional */
    }
  }

  function sampleBands(): StudioBands {
    const analyser = analyserRef.current;
    const buf = freqBufRef.current;
    if (!analyser || !buf) return emptyBands();
    analyser.getByteFrequencyData(buf as unknown as Uint8Array<ArrayBuffer>);
    const n = buf.length;
    const avg = (lo: number, hi: number) => {
      let s = 0;
      let c = 0;
      for (let i = Math.floor(lo * n); i < Math.floor(hi * n) && i < n; i++) {
        s += buf[i];
        c++;
      }
      return c ? s / (c * 255) : 0;
    };
    const bass = avg(0, 0.09);
    const mid = avg(0.09, 0.38);
    const high = avg(0.38, 0.9);
    const level = Math.min(1, (bass * 1.3 + mid + high * 0.7) / 3);
    setFreqs(new Uint8Array(buf));
    return { bass, mid, high, level };
  }

  // Sync preview clock + analyser while playing
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = audioRef.current;
      if (a) {
        setTimeSec(a.currentTime);
        setBands(sampleBands());
        // Loop within studio loop window for visual rhythm
        const loop = settings.loopSec;
        if (a.currentTime >= loop) {
          a.currentTime = 0;
          if (mediaKind === "video" && mediaVideoRef.current) {
            mediaVideoRef.current.currentTime = 0;
          }
        }
      } else {
        setTimeSec((t) => {
          const next = t + 1 / 60;
          return next >= settings.loopSec ? 0 : next;
        });
        setBands({
          bass: 0.12 + 0.08 * Math.sin(Date.now() / 280),
          mid: 0.1 + 0.06 * Math.sin(Date.now() / 410),
          high: 0.08 + 0.05 * Math.sin(Date.now() / 190),
          level: 0.12 + 0.08 * Math.sin(Date.now() / 320),
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, settings.loopSec, mediaKind]);

  async function togglePlay() {
    const a = audioRef.current;
    if (playing) {
      a?.pause();
      mediaVideoRef.current?.pause();
      setPlaying(false);
      return;
    }
    pauseGlobalPlayer();
    if (a && musicUrl) {
      ensureAnalyser(a);
      if (audioCtxRef.current?.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      try {
        await a.play();
      } catch {
        showToast("Couldn't start audio — try tapping Play again");
        return;
      }
    }
    if (mediaKind === "video" && mediaVideoRef.current) {
      mediaVideoRef.current.muted = true;
      void mediaVideoRef.current.play().catch(() => undefined);
    }
    setPlaying(true);
  }

  function seek(frac: number) {
    const t = Math.max(0, Math.min(1, frac)) * (duration || settings.loopSec);
    if (audioRef.current) audioRef.current.currentTime = t;
    if (mediaVideoRef.current) mediaVideoRef.current.currentTime = t;
    setTimeSec(t);
  }

  function onMediaFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) {
      showToast(`Media max is ${prettyBytes(MAX_MEDIA_BYTES)}`);
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      showToast("Use MP4/WebM or JPG/PNG/WebP");
      return;
    }
    setMediaUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setMediaFile(file);
    setMediaKind(isVideo ? "video" : "image");
    setPlaying(false);
    setTimeSec(0);
  }

  function onMusicFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      showToast(`Audio max is ${prettyBytes(MAX_AUDIO_BYTES)}`);
      return;
    }
    // Reset analyser graph when swapping audio element source
    sourceRef.current = null;
    analyserRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;

    setMusicUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setMusicFile(file);
    setPlaying(false);
    setTimeSec(0);
    setDuration(0);
  }

  async function exportLoop() {
    if (!canvasRef.current) {
      showToast("Preview not ready");
      return;
    }
    if (!mediaUrl) {
      showToast("Upload media first");
      return;
    }
    setExporting(true);
    setExportPct(0);
    pauseGlobalPlayer();

    const wasPlaying = playing;
    const a = audioRef.current;
    const loopSec = Math.max(4, Math.min(12, settings.loopSec));

    try {
      // Rewind and play music so reactivity drives the recorded frames
      if (a && musicUrl) {
        ensureAnalyser(a);
        a.currentTime = 0;
        if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
        await a.play().catch(() => undefined);
      }
      if (mediaKind === "video" && mediaVideoRef.current) {
        mediaVideoRef.current.currentTime = 0;
        mediaVideoRef.current.muted = true;
        await mediaVideoRef.current.play().catch(() => undefined);
      }
      setPlaying(true);

      const blob = await recordStudioLoop({
        canvas: canvasRef.current,
        durationSec: loopSec,
        onProgress: setExportPct,
      });

      a?.pause();
      mediaVideoRef.current?.pause();
      setPlaying(false);

      const nameBase = (mediaFile?.name || "vybz-visual").replace(/\.[^.]+$/, "");
      const filename = `${nameBase}-vdock.${extForMime(blob.type || pickRecorderMime())}`;
      downloadBlob(blob, filename);
      celebrate("Visualizer exported");
      showToast("Muted loop downloaded — upload it under Custom in Compose");
    } catch (err) {
      showToast((err as Error).message || "Export failed");
      setPlaying(wasPlaying);
    } finally {
      setExporting(false);
      setExportPct(null);
    }
  }

  const progress = duration > 0 ? timeSec / Math.min(duration, settings.loopSec) : timeSec / settings.loopSec;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/80"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold text-white">Visualizer studio</h1>
          <p className="text-[12px] text-white/45">
            Upload media · attach music · tune audio-reactive FX · export a muted VDock loop
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/visuals/tutorial")}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white"
        >
          <GraduationCap className="h-3.5 w-3.5" /> Specs
        </button>
      </div>

      {/* Preview stage */}
      <section className="overflow-hidden rounded-2xl border border-white/12 bg-ink-950/80 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
        <div className="relative aspect-video w-full bg-black">
          <StudioPreview
            key={`${mediaUrl ?? "none"}-${mediaTick}`}
            mediaEl={mediaKind === "video" ? mediaVideoRef.current : mediaImageRef.current}
            mediaKind={mediaKind}
            bands={bands}
            freqs={freqs}
            settings={settings}
            timeSec={timeSec}
            canvasRef={canvasRef}
            className="absolute inset-0 h-full w-full object-contain"
          />
          {!mediaUrl && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
              <Film className="h-10 w-10 opacity-40" />
              <p className="text-sm">Drop media to start</p>
            </div>
          )}
        </div>

        {/* Hidden media / audio elements */}
        {mediaUrl && mediaKind === "video" && (
          <video
            ref={mediaVideoRef}
            src={mediaUrl}
            muted
            playsInline
            loop
            className="hidden"
            onLoadedMetadata={(e) => {
              setDuration(e.currentTarget.duration || 0);
              setMediaTick((n) => n + 1);
            }}
            onLoadedData={() => setMediaTick((n) => n + 1)}
          />
        )}
        {mediaUrl && mediaKind === "image" && (
          <img
            ref={mediaImageRef}
            src={mediaUrl}
            alt=""
            className="hidden"
            onLoad={() => setMediaTick((n) => n + 1)}
          />
        )}
        {musicUrl && (
          <audio
            ref={audioRef}
            src={musicUrl}
            preload="auto"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onEnded={() => {
              setPlaying(false);
              mediaVideoRef.current?.pause();
            }}
          />
        )}

        {/* Transport */}
        <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seek(0)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/10"
              aria-label="Restart"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void togglePlay()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/25 text-white ring-1 ring-cyan-300/40 transition active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={Math.max(0, Math.min(1, progress))}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1.5 flex-1 accent-cyan-300"
              aria-label="Timeline"
            />
            <span className="w-16 text-right font-mono text-[11px] text-white/45">
              {fmt(timeSec)}/{fmt(Math.min(duration || settings.loopSec, settings.loopSec))}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LevelChip label="Bass" value={bands.bass} color="#00C2FF" />
            <LevelChip label="Mid" value={bands.mid} color="#00D68F" />
            <LevelChip label="High" value={bands.high} color="#A855F7" />
            <span className="ml-auto text-[11px] text-white/35">
              Export window · {settings.loopSec}s muted loop
            </span>
          </div>
        </div>
      </section>

      {/* Assets */}
      <section className="grid gap-3 sm:grid-cols-2">
        <AssetCard
          icon={mediaKind === "image" ? ImageIcon : Film}
          title="Visual media"
          body={mediaFile ? mediaFile.name : "Video or still for the dock backdrop"}
          cta={mediaFile ? "Replace" : "Upload media"}
          onClick={() => mediaInputRef.current?.click()}
          active={!!mediaFile}
        />
        <AssetCard
          icon={Music2}
          title="Music (preview)"
          body={musicFile ? musicFile.name : "Drives reactivity while you edit — not in the export"}
          cta={musicFile ? "Replace track" : "Attach music"}
          onClick={() => musicInputRef.current?.click()}
          active={!!musicFile}
        />
        <input
          ref={mediaInputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          className="hidden"
          onChange={(e) => {
            onMediaFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={musicInputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            onMusicFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </section>

      {/* Reactive style */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-white/70">
          <Waves className="h-3.5 w-3.5 text-cyan-200" /> Reactive style
        </p>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {REACTIVE_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ style: s.id })}
              className={cx(
                "min-w-[6.5rem] shrink-0 rounded-xl border px-3 py-2.5 text-left transition",
                settings.style === s.id
                  ? "border-cyan-300/45 bg-cyan-500/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white/85",
              )}
            >
              <span className="block text-[12px] font-semibold">{s.label}</span>
              <span className="mt-0.5 block text-[10px] text-white/40">{s.blurb}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Slider
            label="Intensity"
            value={settings.intensity}
            onChange={(v) => patch({ intensity: v })}
          />
          <Slider
            label="Bass punch"
            value={settings.bassPunch}
            onChange={(v) => patch({ bassPunch: v })}
          />
          <Slider
            label="Color wash"
            value={settings.colorWash}
            onChange={(v) => patch({ colorWash: v })}
          />
          <Slider
            label="Bar amount"
            value={settings.barAmount}
            onChange={(v) => patch({ barAmount: v })}
          />
          <Slider
            label="Dim"
            value={settings.dim}
            onChange={(v) => patch({ dim: v })}
          />
          <label className="flex flex-col gap-1.5 text-[11px] text-white/55">
            Loop length
            <input
              type="range"
              min={4}
              max={12}
              step={1}
              value={settings.loopSec}
              onChange={(e) => patch({ loopSec: Number(e.target.value) })}
              className="accent-cyan-300"
            />
            <span className="font-mono text-white/70">{settings.loopSec}s</span>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-white/45">Accent</span>
          {["#00C2FF", "#00D68F", "#A855F7", "#FF4D2E", "#F0FF5A"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => patch({ accent: c })}
              className={cx(
                "h-7 w-7 rounded-full border-2 transition",
                settings.accent === c ? "border-white scale-110" : "border-transparent opacity-80",
              )}
              style={{ background: c }}
              aria-label={`Accent ${c}`}
            />
          ))}
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => patch({ fit: "cover" })}
              className={cx(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                settings.fit === "cover" ? "bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-300/40" : "text-white/50",
              )}
            >
              Cover
            </button>
            <button
              type="button"
              onClick={() => patch({ fit: "contain" })}
              className={cx(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                settings.fit === "contain" ? "bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-300/40" : "text-white/50",
              )}
            >
              Fit
            </button>
          </div>
        </div>
      </section>

      {/* Export */}
      <section className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
              <Sparkles className="h-4 w-4 text-cyan-200" /> Export muted VDock loop
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/55">
              Records the reactive preview at 1280×720. Music stays out of the file so it won’t clash with playback in VDock. Then upload under <strong className="font-semibold text-white/80">Custom</strong> when releasing a drop.
            </p>
            {exportPct != null && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-white/50">
                  <span>Recording…</span>
                  <span className="tabular-nums">{exportPct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${exportPct}%` }} />
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={exporting || !mediaUrl}
            onClick={() => void exportLoop()}
            className="btn btn-primary shrink-0 gap-2 px-4 py-3 disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Exporting…" : "Export loop"}
          </button>
        </div>
      </section>
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function LevelChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-semibold text-white/70">
      {label}
      <span className="h-1.5 w-8 overflow-hidden rounded-full bg-white/15">
        <span
          className="block h-full rounded-full transition-[width] duration-75"
          style={{ width: `${Math.round(value * 100)}%`, background: color }}
        />
      </span>
    </span>
  );
}

function AssetCard({
  icon: Icon,
  title,
  body,
  cta,
  onClick,
  active,
}: {
  icon: typeof Film;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition",
        active
          ? "border-cyan-300/35 bg-cyan-500/10"
          : "border-dashed border-white/15 bg-white/[0.03] hover:border-white/30",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-cyan-200">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-white">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-white/45">{body}</span>
        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-200">
          <Upload className="h-3 w-3" /> {cta}
        </span>
      </span>
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-[11px] text-white/55">
      <span className="flex justify-between">
        {label}
        <span className="font-mono text-white/70">{Math.round(value * 100)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-cyan-300"
      />
    </label>
  );
}
