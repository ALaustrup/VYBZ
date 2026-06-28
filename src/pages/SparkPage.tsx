import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  ArrowLeft,
  Flame,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { EmptyState } from "@/components/EmptyState";
import { fetchDatingDeck, sparkLike, type SparkCandidate } from "@/lib/backend";
import { cx, haptic } from "@/lib/utils";
import { playSound } from "@/lib/sound";

const SWIPE = 110;

// A deterministic premium gradient per user, so each card feels distinct.
function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `linear-gradient(160deg, hsl(${h} 70% 22%) 0%, hsl(${(h + 40) % 360} 65% 12%) 60%, #060810 100%)`;
}

/**
 * Spark — a minimal, interests-first dating deck. Swipe right to like, left to
 * pass. A mutual like is a match. Candidates come from `dating_deck` (same age
 * layer, ranked by locality + shared interests).
 */
export function SparkPage() {
  const { account, identity, openAccountGate, backendEnabled } = useApp();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<SparkCandidate[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<SparkCandidate | null>(null);
  const busyRef = useRef(false);

  const eligible =
    !!account && identity.age != null && identity.gender != null;

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchDatingDeck(24);
    setDeck(list);
    setIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (eligible && backendEnabled) void load();
    else setLoading(false);
  }, [eligible, backendEnabled, load]);

  const act = useCallback(
    async (cand: SparkCandidate, like: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      haptic(like ? 14 : 8);
      playSound(like ? "post" : "tap");
      setIdx((i) => i + 1);
      const matched = await sparkLike(cand.userId, like);
      if (matched) setMatch(cand);
      // Top up the deck as it runs low.
      setDeck((d) => {
        if (idx + 2 >= d.length) void load();
        return d;
      });
      busyRef.current = false;
    },
    [idx, load]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-1 pt-3">
        <button
          onClick={() => navigate("/connect")}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-gradient">
          <Flame className="h-5 w-5 text-veil-300" /> Spark
        </h1>
      </div>

      <div className="relative flex-1 px-4 pb-4 pt-2">
        {!backendEnabled ? (
          <EmptyState
            icon={Flame}
            title="Spark is offline"
            body="Connect the backend to discover people by vibe."
          />
        ) : !eligible ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-veil-500/15">
              <Flame className="h-8 w-8 text-veil-200" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Set up your profile to Spark
            </h2>
            <p className="mt-2 max-w-xs text-sm text-white/55">
              Add your age, sex & interests so we can match you by vibe.
            </p>
            <button
              onClick={() => (account ? navigate("/profile") : openAccountGate())}
              className="btn btn-primary mt-6 px-6"
            >
              {account ? "Complete profile" : "Join to Spark"}
            </button>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        ) : idx >= deck.length ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-veil-200" />
            <h2 className="font-display text-lg font-bold text-white">
              You're all caught up
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-white/55">
              Check back soon — new people join all the time.
            </p>
            <button onClick={load} className="btn btn-ghost mt-5 px-5 text-xs">
              Refresh
            </button>
          </div>
        ) : (
          <>
            <div className="relative mx-auto h-full max-w-sm">
              <AnimatePresence>
                {deck
                  .slice(idx, idx + 2)
                  .reverse()
                  .map((cand) => {
                    const depth = deck.indexOf(cand) - idx;
                    return (
                      <SparkCard
                        key={cand.userId}
                        cand={cand}
                        depth={depth}
                        onAct={act}
                      />
                    );
                  })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Match celebration. */}
      <AnimatePresence>
        {match && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] mx-auto flex max-w-md flex-col items-center justify-center bg-ink-950/92 px-8 text-center backdrop-blur-xl"
            onClick={() => setMatch(null)}
          >
            <motion.div
              initial={{ scale: 0.7, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
              className="flex flex-col items-center"
            >
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-feel/15 shadow-glow-feel">
                <Heart className="h-10 w-10 text-feel" />
              </div>
              <h2 className="font-display text-3xl font-bold text-gradient">
                It's a match
              </h2>
              <p className="mt-2 max-w-xs text-sm text-white/60">
                You and {match.username || match.alias} liked each other.
              </p>
              <div className="mt-7 flex w-full max-w-xs flex-col gap-2">
                <button
                  onClick={() => {
                    setMatch(null);
                    navigate(`/u/${match.userId}`);
                  }}
                  className="btn btn-primary w-full"
                >
                  <MessageCircle className="h-4 w-4" /> View profile
                </button>
                <button
                  onClick={() => setMatch(null)}
                  className="btn btn-ghost w-full"
                >
                  Keep swiping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SparkCard({
  cand,
  depth,
  onAct,
}: {
  cand: SparkCandidate;
  depth: number;
  onAct: (c: SparkCandidate, like: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-12, 0, 12]);
  const likeOpacity = useTransform(x, [20, 130], [0, 1]);
  const passOpacity = useTransform(x, [-130, -20], [1, 0]);
  const active = depth === 0;
  const interests = cand.details.interests ?? [];
  const shared = new Set(cand.sharedInterestNames.map((s) => s.toLowerCase()));

  function onEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > SWIPE || Math.abs(info.velocity.x) > 700) {
      onAct(cand, info.offset.x > 0);
    }
  }

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{ x: active ? x : 0, rotate: active ? rotate : 0, zIndex: 10 - depth }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onEnd}
      initial={false}
      animate={{ scale: 1 - depth * 0.04, y: depth * 14 }}
      exit={{ x: (x.get() >= 0 ? 1 : -1) * 600, opacity: 0, transition: { duration: 0.32 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-card"
        style={{ background: gradientFor(cand.userId) }}
      >
        {/* Big monogram backdrop. */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4 opacity-20">
          <span className="font-display text-[10rem] font-black leading-none text-white">
            {(cand.username || cand.alias || "?").charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Swipe verdict stamps. */}
        {active && (
          <>
            <motion.div
              style={{ opacity: likeOpacity, rotate: -12 }}
              className="pointer-events-none absolute left-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-feel px-4 py-2 font-display text-2xl font-bold uppercase text-feel shadow-glow-feel"
            >
              <Heart className="h-6 w-6" /> Like
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity, rotate: 12 }}
              className="pointer-events-none absolute right-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-white/50 px-4 py-2 font-display text-2xl font-bold uppercase text-white/70"
            >
              <X className="h-6 w-6" /> Pass
            </motion.div>
          </>
        )}

        {/* Details, anchored bottom. */}
        <div className="relative mt-auto flex flex-col gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-16">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-white">
              {cand.username || cand.alias}
              {cand.age != null && (
                <span className="ml-2 text-xl font-semibold text-white/70">
                  {cand.age}
                </span>
              )}
            </h2>
            {cand.sameArea && (
              <span className="flex items-center gap-1 rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel">
                <MapPin className="h-3 w-3" /> Nearby
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65">
            {cand.gender && <span className="capitalize">{cand.gender}</span>}
            {cand.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {cand.location}
              </span>
            )}
            {cand.details.pronouns && <span>{cand.details.pronouns}</span>}
          </div>

          {cand.details.bio && (
            <p className="line-clamp-2 text-sm leading-snug text-white/80">
              {cand.details.bio}
            </p>
          )}

          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {interests.slice(0, 6).map((it) => {
                const isShared = shared.has(it.toLowerCase());
                return (
                  <span
                    key={it}
                    className={cx(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      isShared
                        ? "bg-veil-500/40 text-white ring-1 ring-veil-300/60"
                        : "bg-white/10 text-white/70"
                    )}
                  >
                    {it}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Action buttons (for users who'd rather tap than swipe). */}
        {active && (
          <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 items-center justify-center gap-5 pb-0">
            <button
              onClick={() => onAct(cand, false)}
              aria-label="Pass"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-ink-900 text-white/70 shadow-lg active:scale-90"
            >
              <X className="h-6 w-6" />
            </button>
            <button
              onClick={() => onAct(cand, true)}
              aria-label="Like"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-feel text-black shadow-glow-feel active:scale-90"
            >
              <Heart className="h-7 w-7" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
