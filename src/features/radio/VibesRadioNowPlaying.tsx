import { Radio } from "lucide-react";
import { useVibesRadioNowPlaying } from "@/features/radio/useVibesRadioNowPlaying";
import { cx } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  greeting: "Station ID",
  interstitial: "Station ID",
  user_track: "Now playing",
  artist_cue: "Artist cue",
  stinger: "Stinger",
};

/**
 * Compact now-playing strip for landing / auth — measured fields only.
 */
export function VibesRadioNowPlaying({ className }: { className?: string }) {
  const sync = useVibesRadioNowPlaying();
  if (!sync) {
    return (
      <div
        className={cx(
          "flex items-center gap-2 rounded-2xl border border-white/10 bg-ink-950/50 px-3 py-2 text-left text-white/45 backdrop-blur-md",
          className,
        )}
        data-testid="vibes-radio-now-playing"
        data-state="idle"
      >
        <Radio className="h-4 w-4 shrink-0" aria-hidden />
        <p className="text-[12px]">Vibes Radio · tuning…</p>
      </div>
    );
  }

  const dur = sync.metadata?.durationSec ?? sync.durationSec;
  const durLabel = Number.isFinite(dur) ? `${dur.toFixed(1)}s` : "Not measured";

  return (
    <div
      className={cx(
        "flex items-start gap-2.5 rounded-2xl border border-white/10 bg-ink-950/55 px-3 py-2.5 text-left backdrop-blur-md",
        className,
      )}
      data-testid="vibes-radio-now-playing"
      data-kind={sync.kind}
    >
      <Radio className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--accent-rgb))]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
          Vibes Radio · {KIND_LABEL[sync.kind] ?? sync.kind}
        </p>
        <p className="truncate font-display text-sm font-semibold text-white/90">{sync.title}</p>
        <p className="truncate text-[12px] text-white/50">
          {sync.artist || "VYBZ"}
          <span className="text-white/30"> · </span>
          {durLabel}
          {sync.metadata?.format ? (
            <>
              <span className="text-white/30"> · </span>
              {sync.metadata.format.toUpperCase()}
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
