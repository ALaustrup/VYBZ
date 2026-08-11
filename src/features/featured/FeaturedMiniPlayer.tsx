import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { FEATURED_SIGNIN_TRACK } from "@/features/featured/featuredTracks";
import { mintFeaturedPlayUrl } from "@/features/featured/mintFeaturedPlayUrl";
import {
  getSnapshot,
  patchCurrentTrack,
  playTrack,
  toggle,
  usePlayer,
  type PlayerTrack,
} from "@/lib/audioBus";
import { supabase } from "@/lib/supabase";
import { catalogSignal } from "@/lib/vdock/playbackSignal";
import { cx } from "@/lib/utils";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Compact featured player for pre-login shells — fixed bottom, away from auth controls.
 * Plays curated platform music through AudioBus so brand marks stay audio-reactive.
 */
export function FeaturedMiniPlayer({ className }: { className?: string }) {
  const trackMeta = FEATURED_SIGNIN_TRACK;
  const player = usePlayer();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const startedRef = useRef(false);

  const isThis =
    player.track?.id === trackMeta.id ||
    (player.track?.id?.startsWith("featured:") && player.track.title === trackMeta.title);
  const playing = isThis && player.playing;
  const current = isThis ? player.currentTime : 0;
  const duration = isThis
    ? player.duration || trackMeta.durationSec
    : trackMeta.durationSec;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  useEffect(() => {
    let cancelled = false;
    startedRef.current = false;

    (async () => {
      setStatus("loading");
      const url = await mintFeaturedPlayUrl(trackMeta.assetPath);
      if (cancelled) return;
      if (!url) {
        setStatus("error");
        return;
      }

      const next: PlayerTrack = {
        id: trackMeta.id,
        url,
        title: trackMeta.title,
        artist: trackMeta.artist,
        durationSec: trackMeta.durationSec,
        signal: catalogSignal(),
      };

      // Do not steal if something else is already playing (e.g. signed-in radio).
      const snap = getSnapshot();
      if (snap.track && snap.playing && snap.track.id !== trackMeta.id) {
        setStatus("ready");
        return;
      }

      playTrack(next);
      startedRef.current = true;
      setStatus("ready");

      // Measured waveform improves brand reactive pulse (optional — anon read).
      if (supabase) {
        void supabase
          .from("assets")
          .select("waveform")
          .eq("id", trackMeta.assetId)
          .maybeSingle()
          .then(({ data }) => {
            if (cancelled || !data?.waveform || !Array.isArray(data.waveform)) return;
            if (getSnapshot().track?.id !== trackMeta.id) return;
            patchCurrentTrack({ waveform: data.waveform as number[] });
          });
      }

      // Detect autoplay block after a short settle.
      window.setTimeout(() => {
        if (cancelled) return;
        const after = getSnapshot();
        if (after.track?.id === trackMeta.id && !after.playing) {
          setAutoplayBlocked(true);
        }
      }, 400);
    })();

    return () => {
      cancelled = true;
    };
  }, [trackMeta]);

  function onToggle() {
    if (status === "error") return;
    const snap = getSnapshot();
    if (snap.track?.id === trackMeta.id) {
      void toggle();
      setAutoplayBlocked(false);
      return;
    }
    // Reload if another track replaced us.
    void (async () => {
      const url = await mintFeaturedPlayUrl(trackMeta.assetPath);
      if (!url) {
        setStatus("error");
        return;
      }
      playTrack({
        id: trackMeta.id,
        url,
        title: trackMeta.title,
        artist: trackMeta.artist,
        durationSec: trackMeta.durationSec,
        signal: catalogSignal(),
      });
      setAutoplayBlocked(false);
    })();
  }

  return (
    <div
      className={cx(
        // Corner-docked, not centred: pre-login controls sit in a centred column,
        // so a centred bar would always cover them on short viewports. z-30 keeps
        // it above those panels (z-10) rather than hidden behind them.
        "pointer-events-auto fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-30 w-[min(15rem,calc(100vw-1.5rem))] sm:left-4",
        className,
      )}
      data-testid="featured-mini-player"
      data-track={trackMeta.id}
      data-status={status}
    >
      <div className="flex items-center gap-2.5 rounded-full border border-white/12 bg-ink-950/80 py-1.5 pl-1.5 pr-3.5 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.85)] backdrop-blur-md">
        <button
          type="button"
          onClick={onToggle}
          disabled={status === "loading"}
          aria-label={playing ? `Pause ${trackMeta.title}` : `Play ${trackMeta.title}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/14 bg-white/8 text-white transition hover:bg-white/14 disabled:opacity-50"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Play className="h-3.5 w-3.5 translate-x-[1px]" aria-hidden />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight text-white/90">
            {status === "error" ? "Featured unavailable" : trackMeta.title}
          </p>
          <p className="truncate text-[10px] leading-tight text-white/45">
            {status === "error"
              ? "Playback failed"
              : autoplayBlocked
                ? "Tap to play"
                : `${trackMeta.artist} · ${formatTime(current)}`}
          </p>
          <div className="mt-1 h-[2px] overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div
              className="h-full rounded-full bg-[rgb(var(--accent-rgb))] transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
