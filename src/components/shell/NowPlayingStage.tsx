import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Radio, Sparkles, Video } from "lucide-react";
import { getSnapshot, usePlayer } from "@/lib/audioBus";
import * as api from "@/lib/api";
import { BACKEND_ENABLED } from "@/lib/supabase";
import { bindStageVideo } from "@/lib/stageVideoSync";
import { vdockVisual } from "@/lib/vdockVisualManifest";
import { formatVcAddress } from "@/lib/vc";
import type { LiveSessionCard } from "@/types";

/**
 * Cinema strip under the app bar — slave to VDock AudioBus.
 * Priority: artist live stream → uploader Vizualz / custom visual → idle.
 */
export function NowPlayingStage() {
  const navigate = useNavigate();
  const player = usePlayer();
  const track = player.track;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liveMatch, setLiveMatch] = useState<LiveSessionCard | null>(null);
  const [checkingLive, setCheckingLive] = useState(false);

  const catalog = vdockVisual(track?.playback?.vdockVisualId);
  const customUrl = track?.playback?.backdropUrl;
  const fit = track?.playback?.backdropFit ?? "cover";
  const dim = track?.playback?.backdropDim ?? 0.2;

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

  // Live takes priority over track visuals — poll gently while a drop is loaded.
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

  // Load media only when the visual asset changes — never on play/pause.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !visualSrc || looksLikeImage) return;
    v.load();
  }, [visualSrc?.key, looksLikeImage]);

  // Slave playhead / play-state to AudioBus.
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

    // Timeline assets soft-seek; loop Vizualz only need play/pause.
    if (visualSrc.mode !== "timeline" || !player.playing) return;

    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [
    visualSrc,
    looksLikeImage,
    liveMatch,
    player.playing,
    player.loading,
    track?.id,
  ]);

  const mode: "live" | "visual" | "idle" = liveMatch
    ? "live"
    : visualSrc
      ? "visual"
      : "idle";

  return (
    <section
      className="now-playing-stage relative w-full shrink-0 overflow-hidden border-b border-white/10"
      aria-label="Now playing stage"
      data-mode={mode}
    >
      <div className="relative mx-auto aspect-[21/9] max-h-[min(36vw,14rem)] w-full bg-ink-950 sm:max-h-[16rem]">
        {mode === "live" && liveMatch && (
          <>
            {liveMatch.avatarUrl ? (
              <img
                src={liveMatch.avatarUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-wild/40 via-ink-900 to-ink-950" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-wild">
                  <Radio className="h-3 w-3" /> Live now
                  {checkingLive && <Loader2 className="h-3 w-3 animate-spin opacity-60" />}
                </p>
                <p className="truncate font-display text-[15px] font-semibold text-white sm:text-lg">
                  {liveMatch.title || track?.title || "Live"}
                </p>
                <p className="truncate text-[11px] text-white/55">
                  {formatVcAddress(liveMatch.username) || liveMatch.displayName || track?.artist}
                  {liveMatch.viewerCount > 0 ? ` · ${liveMatch.viewerCount} watching` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/live/${liveMatch.id}`)}
                className="btn btn-primary shrink-0 px-3 py-2 text-xs"
              >
                Join live
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
                style={{ objectFit: fit, opacity: player.playing ? 1 : 0.72 }}
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
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: `rgba(6,10,20,${dim})` }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-ink-950/25" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200/80">
                <Video className="h-3 w-3" /> Track visual
              </p>
              <p className="truncate font-display text-[14px] font-semibold text-white sm:text-[16px]">
                {track?.title}
              </p>
              <p className="truncate text-[11px] text-white/50">{track?.artist}</p>
            </div>
          </>
        )}

        {mode === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_center,rgba(0,194,255,0.12),transparent_60%),#070b14]">
            <Sparkles className="h-7 w-7 text-cyan-300/50" />
            <p className="font-display text-[14px] font-semibold text-white/70">
              {track ? "No stage visual for this track" : "Play something to light the stage"}
            </p>
            <p className="max-w-sm px-6 text-center text-[11px] text-white/35">
              {track
                ? "When the artist goes live, their stream takes over. Otherwise their Vizualz fill this view with VDock."
                : "Uploader visuals follow the VDock clock — play, pause, and seek together."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
