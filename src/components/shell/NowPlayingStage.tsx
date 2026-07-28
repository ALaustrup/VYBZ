import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pause, Play, Radio, Sparkles } from "lucide-react";
import { getSnapshot, readBands, toggle, usePlayer } from "@/lib/audioBus";
import * as api from "@/lib/api";
import { BACKEND_ENABLED } from "@/lib/supabase";
import { bindStageVideo } from "@/lib/stageVideoSync";
import { vdockVisual } from "@/lib/vdockVisualManifest";
import { useReduceFx } from "@/lib/display";
import type { LiveSessionCard } from "@/types";

/**
 * Frosted cinema stage under the app bar — soft glass + reactive wash.
 * Priority: artist live → uploader Vizualz / custom → idle glow.
 */
export function NowPlayingStage() {
  const navigate = useNavigate();
  const player = usePlayer();
  const track = player.track;
  const reduce = useReduceFx();
  const videoRef = useRef<HTMLVideoElement>(null);
  const washRef = useRef<HTMLCanvasElement>(null);
  const [liveMatch, setLiveMatch] = useState<LiveSessionCard | null>(null);
  const [checkingLive, setCheckingLive] = useState(false);

  const catalog = vdockVisual(track?.playback?.vdockVisualId);
  const customUrl = track?.playback?.backdropUrl;
  const fit = track?.playback?.backdropFit ?? "cover";
  const dim = track?.playback?.backdropDim ?? 0.18;

  const visualSrc = useMemo(() => {
    if (catalog) {
      return {
        key: catalog.id,
        webm: catalog.loopWebm,
        mp4: catalog.loopMp4,
        poster: catalog.previewUrl,
        mode: "loop" as const,
      };
    }
    if (customUrl) {
      return {
        key: customUrl,
        webm: null as string | null,
        mp4: customUrl,
        poster: null as string | null,
        mode: "timeline" as const,
      };
    }
    return null;
  }, [catalog, customUrl]);

  const looksLikeImage =
    !!customUrl && !catalog && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(customUrl);

  useEffect(() => {
    let alive = true;
    async function poll() {
      const authorId = track?.authorId;
      if (!authorId || !BACKEND_ENABLED) {
        if (alive) setLiveMatch(null);
        return;
      }
      setCheckingLive(true);
      try {
        const sessions = await api.listLiveSessions(24);
        if (!alive) return;
        setLiveMatch(sessions.find((s) => s.hostId === authorId) ?? null);
      } catch {
        if (alive) setLiveMatch(null);
      } finally {
        if (alive) setCheckingLive(false);
      }
    }
    void poll();
    const id = window.setInterval(() => void poll(), 25_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [track?.authorId, track?.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !visualSrc || looksLikeImage) return;
    v.load();
  }, [visualSrc?.key, looksLikeImage]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !visualSrc || looksLikeImage || liveMatch) return;
    const tick = () => {
      const snap = getSnapshot();
      bindStageVideo(v, {
        playing: snap.playing && !snap.loading,
        currentTime: snap.currentTime,
        mode: visualSrc.mode,
      });
    };
    tick();
    if (visualSrc.mode !== "timeline" || !player.playing) return;
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [visualSrc, looksLikeImage, liveMatch, player.playing, player.loading, track?.id]);

  // Soft audio-reactive wash over the stage (waveform bands — no MediaElement hijack).
  useEffect(() => {
    const canvas = washRef.current;
    if (!canvas || reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let running = true;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const draw = () => {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const bands = readBands();
      const level = player.playing ? bands.level : 0.12;
      const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.55);
      g.addColorStop(0, `rgba(120, 200, 255, ${0.22 + bands.bass * 0.35})`);
      g.addColorStop(0.45, `rgba(80, 160, 255, ${0.1 + bands.mid * 0.2})`);
      g.addColorStop(1, "rgba(10, 20, 40, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Arc pulse (reference-style circular energy)
      const r = Math.min(w, h) * (0.28 + level * 0.08);
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.42, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 230, 255, ${0.18 + bands.high * 0.35})`;
      ctx.lineWidth = 2 + bands.bass * 4;
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [player.playing, reduce, track?.id]);

  const mode: "live" | "visual" | "idle" = liveMatch
    ? "live"
    : visualSrc
      ? "visual"
      : "idle";

  return (
    <section
      className="now-playing-stage relative w-full shrink-0 overflow-hidden"
      aria-label="Now playing stage"
      data-mode={mode}
    >
      <div className="relative mx-auto aspect-[4/5] max-h-[min(52vh,22rem)] w-full max-w-lg sm:aspect-[16/10] sm:max-h-[20rem]">
        {/* Soft glass frame */}
        <div className="absolute inset-3 overflow-hidden rounded-[1.75rem] border border-white/25 shadow-[0_24px_60px_-28px_rgba(40,120,200,0.55)] sm:inset-4">
          <div className="absolute inset-0 bg-[#0a1428]" />

          {mode === "live" && liveMatch && (
            <>
              {liveMatch.avatarUrl ? (
                <img src={liveMatch.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/30 via-[#0a1428] to-[#071018]" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071018]/90 via-transparent to-white/5" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                <div className="min-w-0 glass-chip px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-200">
                    <Radio className="h-3 w-3" /> Live
                    {checkingLive && <Loader2 className="h-3 w-3 animate-spin opacity-60" />}
                  </p>
                  <p className="truncate font-display text-[15px] font-semibold text-white">
                    {liveMatch.title || track?.title || "Live"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/live/${liveMatch.id}`)}
                  className="glass-chip shrink-0 px-3 py-2 text-xs font-semibold text-white"
                >
                  Join
                </button>
              </div>
            </>
          )}

          {mode === "visual" && visualSrc && (
            <>
              {looksLikeImage ? (
                <img
                  src={visualSrc.mp4}
                  alt=""
                  className="absolute inset-0 h-full w-full"
                  style={{ objectFit: fit, opacity: player.playing ? 1 : 0.78 }}
                />
              ) : (
                <video
                  ref={videoRef}
                  key={visualSrc.key}
                  className="absolute inset-0 h-full w-full"
                  style={{ objectFit: fit }}
                  muted
                  playsInline
                  preload="metadata"
                  poster={visualSrc.poster ?? undefined}
                >
                  {visualSrc.webm && <source src={visualSrc.webm} type="video/webm" />}
                  <source src={visualSrc.mp4} type="video/mp4" />
                </video>
              )}
              <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(8,16,32,${dim})` }} />
              <canvas ref={washRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071018]/85 via-transparent to-white/10" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                <div className="glass-chip min-w-0 flex-1 px-3 py-2">
                  <p className="truncate font-display text-[15px] font-semibold text-white">{track?.title}</p>
                  <p className="truncate text-[11px] text-white/55">{track?.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggle()}
                  aria-label={player.playing ? "Pause" : "Play"}
                  className="glass-chip flex h-12 w-12 shrink-0 items-center justify-center text-white active:scale-95"
                >
                  {player.playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </button>
              </div>
            </>
          )}

          {mode === "idle" && (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(100,180,255,0.28),transparent_58%),linear-gradient(180deg,#1a3a68_0%,#0a1428_70%)]" />
              <canvas ref={washRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-70" aria-hidden />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="glass-chip flex h-14 w-14 items-center justify-center">
                  <Sparkles className="h-6 w-6 text-sky-100/80" />
                </span>
                <p className="font-display text-[16px] font-semibold text-white/90">
                  {track ? "No stage visual yet" : "Find Yours."}
                </p>
                <p className="max-w-xs text-[12px] leading-relaxed text-white/45">
                  {track
                    ? "When this artist goes live, the stream takes over. Otherwise their Vizualz fill this glass."
                    : "Play a drop — the stage becomes their world."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
