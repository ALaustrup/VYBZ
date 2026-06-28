import { useEffect, useState } from "react";
import { EyeOff, Heart } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { cx, formatCount, haptic } from "@/lib/utils";
import { playSound } from "@/lib/sound";
import type { Confession, Reaction } from "@/types";

type VoteBarSize = "sm" | "md" | "lg";

interface VoteBarProps {
  confession: Confession;
  /** Visual scale: sm = mosaic tile, md = reader/feed row, lg = post detail. */
  size?: VoteBarSize;
  className?: string;
}

const SIZES: Record<
  VoteBarSize,
  { btn: string; icon: string; text: string; gap: string }
> = {
  sm: { btn: "px-2 py-1 gap-1", icon: "h-3.5 w-3.5", text: "text-[11px]", gap: "gap-1.5" },
  md: { btn: "px-2.5 py-1.5 gap-1.5", icon: "h-4 w-4", text: "text-xs", gap: "gap-2" },
  lg: { btn: "px-4 py-2.5 gap-2", icon: "h-5 w-5", text: "text-sm", gap: "gap-3" },
};

/**
 * The core MYVYB mechanic, made universally accessible: Vyb (boost) / Fail
 * (bury) on any post, from any feed style — tiles, reader rows, and the post
 * detail. Self-contained: reads the caster's prior reaction from the store,
 * casts via recordSwipe, and stops propagation so it never triggers the card's
 * open/navigation handler. You can't vote on your own posts.
 */
export function VoteBar({ confession, size = "md", className }: VoteBarProps) {
  const { recordSwipe, swiped, isMine } = useApp();
  const s = SIZES[size];
  const mine = isMine(confession.id);

  // The caster's persisted reaction (survives across the session).
  const prior = swiped.find((x) => x.confessionId === confession.id)?.reaction ?? null;
  // Optimistic, cleared once the server tally catches up (counts change).
  const [optimistic, setOptimistic] = useState<Reaction | null>(null);
  useEffect(() => {
    setOptimistic(null);
  }, [confession.feels, confession.wilds]);

  const active = optimistic ?? prior;
  const feels = confession.feels + (optimistic === "feel" ? 1 : 0);
  const wilds = confession.wilds + (optimistic === "wild" ? 1 : 0);

  function cast(reaction: Reaction, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (mine || active === reaction) return;
    haptic(reaction === "feel" ? 12 : [6, 18]);
    playSound("tap");
    setOptimistic(reaction);
    recordSwipe(confession, reaction);
  }

  // Read-only tallies for your own posts — you can't vote on yourself.
  if (mine) {
    return (
      <div className={cx("flex items-center", s.gap, s.text, "text-white/50", className)}>
        <span className="flex items-center gap-1">
          <EyeOff className={cx(s.icon, "text-shroud")} />
          {formatCount(wilds)}
        </span>
        <span className="flex items-center gap-1">
          <Heart className={cx(s.icon, "text-feel-400")} />
          {formatCount(feels)}
        </span>
      </div>
    );
  }

  return (
    <div className={cx("flex items-center", s.gap, className)}>
      <button
        type="button"
        aria-label="Fail"
        aria-pressed={active === "wild"}
        onClick={(e) => cast("wild", e)}
        className={cx(
          "flex items-center rounded-full border font-semibold transition active:scale-90",
          s.btn,
          s.text,
          active === "wild"
            ? "border-shroud/60 bg-shroud/20 text-shroud shadow-glow-shroud"
            : "border-white/10 bg-white/[0.04] text-white/65 hover:border-shroud/40 hover:text-shroud"
        )}
      >
        <EyeOff className={s.icon} />
        {formatCount(wilds)}
      </button>
      <button
        type="button"
        aria-label="Vyb"
        aria-pressed={active === "feel"}
        onClick={(e) => cast("feel", e)}
        className={cx(
          "flex items-center rounded-full border font-semibold transition active:scale-90",
          s.btn,
          s.text,
          active === "feel"
            ? "border-feel/60 bg-feel/20 text-feel shadow-glow-feel"
            : "border-white/10 bg-white/[0.04] text-white/65 hover:border-feel/40 hover:text-feel"
        )}
      >
        <Heart className={cx(s.icon, active === "feel" && "fill-feel")} />
        {formatCount(feels)}
      </button>
    </div>
  );
}
