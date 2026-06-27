import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  CornerDownRight,
  Eye,
  EyeOff,
  Heart,
  MapPin,
  MessagesSquare,
} from "lucide-react";
import type { Confession, Reaction } from "@/types";
import { VeiledArt } from "@/components/VeiledArt";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { VeiledVideo } from "@/components/VeiledVideo";
import { Handle } from "@/components/Handle";
import { IdentityMeta } from "@/components/IdentityMeta";
import { useApp } from "@/store/AppStore";
import { fontClassFor, textFxClassFor } from "@/lib/expression";
import { proximityLabel } from "@/lib/geo";
import { cx, distanceMiles, formatCount, timeAgo } from "@/lib/utils";

interface SwipeCardProps {
  confession: Confession;
  /** Stack offset index: 0 is the active top card. */
  index: number;
  active: boolean;
  /** +1 flings right (Feel), -1 flings left (Veil) when the card unmounts. */
  exitDirection: number;
  onSwipe: (reaction: Reaction) => void;
}

// Horizontal distance (px) past which a release commits to a reaction.
const SWIPE_THRESHOLD = 120;

export function SwipeCard({
  confession,
  index,
  active,
  exitDirection,
  onSwipe,
}: SwipeCardProps) {
  const { openConnection, comments, displayLevel, isNsfwHidden, unveilNsfw } =
    useApp();
  const x = useMotionValue(0);
  const [ripple, setRipple] = useState<Reaction | null>(null);
  const [showAftermath, setShowAftermath] = useState(false);

  // Media is clear by default; the crowd's Veils blur it for everyone, and
  // AI-suggested NSFW media is softly blurred until you personally Unveil it.
  const nsfwHidden = isNsfwHidden(confession);
  const level = displayLevel(confession);
  const commentCount = (comments[confession.id] ?? []).length;

  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);
  const feelOpacity = useTransform(x, [20, 140], [0, 1]);
  const veilOpacity = useTransform(x, [-140, -20], [1, 0]);
  const feelGlow = useTransform(x, [0, 160], [0, 1]);
  const veilGlow = useTransform(x, [-160, 0], [1, 0]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const committed =
      Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 700;
    if (!committed) return;
    // "feel" = Feel (boost), "wild" = Veil (blurs for everyone).
    const reaction: Reaction = offset > 0 ? "feel" : "wild";
    setRipple(reaction);
    window.setTimeout(() => setRipple(null), 600);
    window.setTimeout(() => onSwipe(reaction), 180);
  }

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : 0,
        zIndex: 30 - index,
      }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={{
        scale: 1 - index * 0.05,
        y: index * 18,
        opacity: index > 2 ? 0 : 1,
      }}
      exit={{
        x: exitDirection * (window.innerWidth || 500),
        opacity: 0,
        rotate: exitDirection * 18,
        transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 shadow-card">
        {confession.mediaKind === "video" && confession.photo ? (
          <VeiledVideo
            src={confession.photo}
            level={level}
            nsfw={nsfwHidden}
            clipStart={confession.clipStart}
            clipEnd={confession.clipEnd}
            paused={!active}
          />
        ) : confession.photo ? (
          <VeiledPhoto src={confession.photo} level={level} nsfw={nsfwHidden} />
        ) : (
          <VeiledArt seed={confession.seed} level={level} />
        )}

        {/* Reaction drag overlays (live feedback while swiping). */}
        {active && (
          <>
            <motion.div
              style={{ opacity: feelGlow }}
              className="pointer-events-none absolute inset-0 bg-feel/20"
            />
            <motion.div
              style={{ opacity: veilGlow }}
              className="pointer-events-none absolute inset-0 bg-shroud/25"
            />
            <motion.div
              style={{ opacity: feelOpacity, rotate: -12 }}
              className="pointer-events-none absolute left-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-feel px-4 py-2 font-display text-2xl font-bold uppercase tracking-wide text-feel shadow-glow-feel"
            >
              <Heart className="h-6 w-6" /> Feel
            </motion.div>
            <motion.div
              style={{ opacity: veilOpacity, rotate: 12 }}
              className="pointer-events-none absolute right-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-shroud px-4 py-2 font-display text-2xl font-bold uppercase tracking-wide text-shroud shadow-glow-shroud"
            >
              <EyeOff className="h-6 w-6" /> Veil
            </motion.div>
          </>
        )}

        {/* Commit ripple. */}
        {ripple && (
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ backgroundColor: ripple === "feel" ? "#34f5a0" : "#6366f1" }}
          />
        )}

        {/* NSFW: per-user reveal. AI only suggests — nothing is enforced. */}
        {nsfwHidden && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
              NSFW
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                unveilNsfw(confession.id);
              }}
              className="flex items-center gap-1.5 rounded-full border border-white/40 bg-black/45 px-4 py-2 text-sm font-semibold text-white backdrop-blur active:scale-95"
            >
              <Eye className="h-4 w-4" /> Unveil
            </button>
            <span className="text-[11px] text-white/60">Possibly sensitive</span>
          </div>
        )}

        <div className="absolute inset-0 flex flex-col p-5">
          {/* Top meta row. */}
          <div className="flex items-center justify-end">
            {confession.featured && (
              <span className="glass rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-glow">
                ✦ Featured
              </span>
            )}
          </div>

          {/* Center swipe hint. */}
          <div className="flex flex-1 items-center justify-center">
            {active && !nsfwHidden && (
              <div className="pointer-events-none flex flex-col items-center gap-2 text-center opacity-60">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">
                  Swipe → Feel · ← Veil
                </p>
              </div>
            )}
          </div>

          {/* Confession content (anchored to the bottom). */}
          <div>
            <p
              className={cx(
                fontClassFor(confession.fontStyle),
                textFxClassFor(confession.textFx),
                "text-[22px] leading-snug text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]"
              )}
            >
              {confession.text}
            </p>

            <div className="mt-4 flex items-center justify-between text-sm text-white/75">
              <Handle
                username={confession.username}
                emoji={confession.alias}
                size={18}
              />
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {proximityLabel(distanceMiles(confession.distance))}
              </span>
            </div>

            <IdentityMeta
              gender={confession.gender}
              age={confession.age}
              location={confession.location}
              className="mt-2"
            />

            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-feel">
                <Heart className="h-4 w-4" />
                {formatCount(confession.feels)}
              </span>
              <span className="flex items-center gap-1.5 text-shroud">
                <EyeOff className="h-4 w-4" />
                {formatCount(confession.wilds)}
              </span>
              <span className="ml-auto text-white/45">
                {timeAgo(confession.createdAt)}
              </span>
            </div>

            {/* Consequence card — "What happened next?". */}
            {confession.aftermath && (
              <div className="mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAftermath((s) => !s);
                  }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-glow"
                >
                  <CornerDownRight className="h-4 w-4" />
                  What happened next?
                </button>
                <AnimatePresence>
                  {showAftermath && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2 text-sm italic leading-snug text-white/80"
                    >
                      {confession.aftermath}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Connect bar — open the public comments thread. */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                openConnection(confession.id);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-veil-400/40 bg-veil-500/15 py-3 font-display font-semibold text-veil-100 transition active:scale-[0.98]"
            >
              <MessagesSquare className="h-4 w-4" />
              <span className="flex items-center gap-1.5">
                Comment
                <Handle
                  username={confession.username}
                  emoji={confession.alias}
                  size={16}
                />
              </span>
              {commentCount > 0 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                  {commentCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
