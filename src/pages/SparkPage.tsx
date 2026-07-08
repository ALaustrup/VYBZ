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
  Disc3,
  Flame,
  Loader2,
  Music2,
  Repeat,
  Sparkles,
  Target,
  UserPlus,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { EmptyState } from "@/components/EmptyState";
import { fetchCollabMatches, type CollabMatch } from "@/lib/backend";
import { haptic } from "@/lib/utils";
import { playSound } from "@/lib/sound";

const SWIPE = 110;

// A deterministic premium gradient per creator, so each card feels distinct.
function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `linear-gradient(160deg, hsl(${h} 70% 22%) 0%, hsl(${(h + 40) % 360} 65% 12%) 60%, #060810 100%)`;
}

/**
 * Spark — swipe the complementary-collaborator deck (VYBZ, §7.5). Candidates come
 * from `collab_matches`: creators who offer what you seek and/or seek what you
 * offer, best-fit first. Swipe right to connect (a two-way fit celebrates as a
 * mutual match), left to pass. This is the matchmaking engine as a deck.
 */
export function SparkPage() {
  const { hasWallet, openAccountGate, backendEnabled, creatorRoles, addFriendById } =
    useApp();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<CollabMatch[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<CollabMatch | null>(null);
  const busyRef = useRef(false);

  const hasIdentity =
    creatorRoles.offers.length > 0 || creatorRoles.seeks.length > 0;

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchCollabMatches(30);
    setDeck(list);
    setIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (backendEnabled && hasIdentity) void load();
    else setLoading(false);
  }, [backendEnabled, hasIdentity, load]);

  const act = useCallback(
    (cand: CollabMatch, connect: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      haptic(connect ? 14 : 8);
      playSound(connect ? "post" : "tap");
      setIdx((i) => i + 1);
      if (connect) {
        addFriendById(cand.userId, { alias: cand.username || cand.alias });
        // A two-way fit is an instant, high-confidence collab match.
        if (cand.mutual) setMatch(cand);
      }
      setDeck((d) => {
        if (idx + 2 >= d.length) void load();
        return d;
      });
      busyRef.current = false;
    },
    [idx, load, addFriendById]
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
            body="Connect the backend to swipe complementary collaborators — creators who have what you want and want what you bring."
          />
        ) : !hasIdentity ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-veil-500/15">
              <Target className="h-8 w-8 text-veil-200" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Set your roles to Spark
            </h2>
            <p className="mt-2 max-w-xs text-sm text-white/55">
              Add the roles you bring and the ones you're looking for — that's
              what surfaces complementary creators to swipe.
            </p>
            <button onClick={() => navigate("/profile")} className="btn btn-primary mt-6 px-6">
              Set up roles
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
              Check back soon — complementary creators join all the time.
            </p>
            <button onClick={load} className="btn btn-ghost mt-5 px-5 text-xs">
              Refresh
            </button>
          </div>
        ) : (
          <div className="relative mx-auto h-full max-w-sm">
            <AnimatePresence>
              {deck
                .slice(idx, idx + 2)
                .reverse()
                .map((cand) => {
                  const depth = deck.indexOf(cand) - idx;
                  return (
                    <SparkCard key={cand.userId} cand={cand} depth={depth} onAct={act} />
                  );
                })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mutual-fit celebration. */}
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
                <Repeat className="h-10 w-10 text-feel" />
              </div>
              <h2 className="font-display text-3xl font-bold text-gradient">
                Mutual fit
              </h2>
              <p className="mt-2 max-w-xs text-sm text-white/60">
                You and {match.username || match.alias} each have what the other
                is looking for.
              </p>
              <div className="mt-7 flex w-full max-w-xs flex-col gap-2">
                <button
                  onClick={() => {
                    setMatch(null);
                    navigate(hasWallet ? `/u/${match.userId}` : "/profile");
                    if (!hasWallet) openAccountGate();
                  }}
                  className="btn btn-primary w-full"
                >
                  <UserPlus className="h-4 w-4" /> View profile
                </button>
                <button onClick={() => setMatch(null)} className="btn btn-ghost w-full">
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
  cand: CollabMatch;
  depth: number;
  onAct: (c: CollabMatch, connect: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-12, 0, 12]);
  const connectOpacity = useTransform(x, [20, 130], [0, 1]);
  const passOpacity = useTransform(x, [-130, -20], [1, 0]);
  const active = depth === 0;
  const name = cand.username || cand.alias;

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
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4 opacity-20">
          <span className="font-display text-[10rem] font-black leading-none text-white">
            {(name || "?").charAt(0).toUpperCase()}
          </span>
        </div>

        {active && (
          <>
            <motion.div
              style={{ opacity: connectOpacity, rotate: -12 }}
              className="pointer-events-none absolute left-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-feel px-4 py-2 font-display text-2xl font-bold uppercase text-feel shadow-glow-feel"
            >
              <UserPlus className="h-6 w-6" /> Connect
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity, rotate: 12 }}
              className="pointer-events-none absolute right-6 top-10 flex items-center gap-1.5 rounded-2xl border-2 border-white/50 px-4 py-2 font-display text-2xl font-bold uppercase text-white/70"
            >
              <X className="h-6 w-6" /> Pass
            </motion.div>
          </>
        )}

        <div className="relative mt-auto flex flex-col gap-2.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-16">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-white">{name}</h2>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-semibold text-white/70">
                {Math.round(cand.fit * 100)}% fit
              </span>
              {cand.mutual && (
                <span className="flex items-center gap-1 rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel">
                  <Repeat className="h-3 w-3" /> Mutual
                </span>
              )}
            </div>
          </div>

          {cand.offersYouSeek.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-xs">
              <Music2 className="h-3.5 w-3.5 text-feel" />
              <span className="text-white/45">Has what you want:</span>
              <span className="font-semibold text-feel">
                {cand.offersYouSeek.join(" · ")}
              </span>
            </p>
          )}
          {cand.seeksYouOffer.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-xs">
              <Target className="h-3.5 w-3.5 text-aqua-300" />
              <span className="text-white/45">Wants what you bring:</span>
              <span className="font-semibold text-aqua-200">
                {cand.seeksYouOffer.join(" · ")}
              </span>
            </p>
          )}

          {(cand.shared_genres.length > 0 || cand.shared_daws.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {cand.shared_genres.slice(0, 3).map((g) => (
                <span key={`g-${g}`} className="rounded-full bg-veil-500/30 px-2.5 py-1 text-[11px] font-medium text-white">
                  {g}
                </span>
              ))}
              {cand.shared_daws.slice(0, 2).map((d) => (
                <span key={`d-${d}`} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                  <Disc3 className="h-2.5 w-2.5" /> {d}
                </span>
              ))}
            </div>
          )}
        </div>

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
              aria-label="Connect"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-feel text-black shadow-glow-feel active:scale-90"
            >
              <UserPlus className="h-7 w-7" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
