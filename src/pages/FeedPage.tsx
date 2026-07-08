import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlignLeft, EyeOff, Heart, LayoutGrid, Layers, RotateCcw } from "lucide-react";
import { SwipeCard } from "@/components/SwipeCard";
import { WhisperCard } from "@/components/WhisperCard";
import { TrackCard } from "@/components/TrackCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { CONFESSIONS } from "@/data/confessions";
import { useApp } from "@/store/AppStore";
import { usePresence } from "@/lib/usePresence";
import type { Reaction } from "@/types";

// Engagement level at which reacting to a confession feels momentous.
const MILESTONE_FEELS = 9000;

type FeedView = "wall" | "stack" | "reader";

const VIEWS: { id: FeedView; label: string; icon: typeof LayoutGrid }[] = [
  { id: "wall", label: "Wall", icon: LayoutGrid },
  { id: "stack", label: "Stack", icon: Layers },
  { id: "reader", label: "Reader", icon: AlignLeft },
];

export function FeedPage() {
  const {
    recordSwipe,
    celebrate,
    pushNotification,
    backendConfessions,
    userConfessions,
    refreshConfessions,
    isMine,
    profileId,
    backendEnabled,
    displayLevel,
    isNsfwHidden,
    isHidden,
    openPost,
  } = useApp();
  const online = usePresence(profileId);
  // Default to the Whisper-style Wall: calm, intentional, image-forward.
  const [view, setView] = useState<FeedView>("wall");

  // Pull the freshest real confessions when the feed opens.
  useEffect(() => {
    refreshConfessions();
  }, [refreshConfessions]);
  // Backend-first: real confessions lead the deck. The curated demo set only
  // tops it up when there aren't enough real ones yet, so it fades out as the
  // community grows. Your own posts are excluded — you don't react to your own.
  const deck = useMemo(() => {
    const real = backendConfessions.filter((c) => !isMine(c.id) && !isHidden(c.id));
    if (!backendEnabled) return CONFESSIONS.filter((c) => !isHidden(c.id));
    return real.length >= 12 ? real : [...real, ...CONFESSIONS.filter((c) => !isHidden(c.id))];
  }, [backendConfessions, isMine, isHidden, backendEnabled]);
  const [current, setCurrent] = useState(0);
  const [exitDirection, setExitDirection] = useState(1);

  const remaining = deck.length - current;
  // Render the top three cards for a layered stack effect.
  const visible = deck.slice(current, current + 3);

  function react(reaction: Reaction) {
    const confession = deck[current];
    if (!confession) return;
    setExitDirection(reaction === "feel" ? 1 : -1);
    recordSwipe(confession, reaction);

    // Celebrate when the user touches a genuinely viral secret.
    if (confession.feels >= MILESTONE_FEELS || confession.featured) {
      celebrate(
        reaction === "feel"
          ? "You felt this one"
          : "You veiled it into the dark"
      );
      pushNotification({
        kind: "milestone",
        title: "You're part of the moment",
        body: `Your reaction joined ${confession.feels.toLocaleString()}+ others on a trending confession.`,
        confessionId: confession.id,
      });
    }

    setCurrent((c) => c + 1);
  }

  function reset() {
    setCurrent(0);
  }

  // World feed pacing: brand-new posts from OTHERS surface ~1 minute after they
  // appear, so the feed updates at a calm, readable cadence instead of flooding.
  // Your own posts are exempt — you see them the instant you post.
  const SETTLE_MS = 60_000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // The browse views (Wall / Reader) show the whole world feed — INCLUDING your
  // own posts — newest first, with the settle applied.
  const browseDeck = useMemo(() => {
    const seen = new Set<string>();
    const own = userConfessions;
    const real = backendEnabled ? [...own, ...backendConfessions] : own;
    // Top up with curated demo content while the community is small.
    const combined = real.length >= 8 ? real : [...real, ...CONFESSIONS];
    return combined
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .filter((c) => !isHidden(c.id))
      .filter((c) => displayLevel(c) > 0)
      .filter((c) => isMine(c.id) || now - c.createdAt >= SETTLE_MS)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [userConfessions, backendConfessions, backendEnabled, displayLevel, isMine, isHidden, now]);

  const switcher = (
    <div className="flex justify-center px-4 pt-2">
      <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 " +
              (view === id
                ? "bg-veil-500 text-white shadow-glow"
                : "text-white/55")
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  if (view === "wall") {
    return (
      <div className="flex h-full flex-col">
        {switcher}
        <PullToRefresh onRefresh={refreshConfessions} className="flex-1 px-4 pb-6 pt-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {browseDeck.map((c) =>
              c.mediaKind === "audio" ? (
                <TrackCard key={c.id} confession={c} queue={browseDeck} compact />
              ) : (
                <WhisperCard
                  key={c.id}
                  confession={c}
                  level={displayLevel(c)}
                  nsfwHidden={isNsfwHidden(c)}
                  variant="tile"
                  paused
                  onClick={() => openPost(c.id)}
                />
              )
            )}
          </div>
        </PullToRefresh>
      </div>
    );
  }

  if (view === "reader") {
    return (
      <div className="flex h-full flex-col">
        {switcher}
        <PullToRefresh
          onRefresh={refreshConfessions}
          className="mx-auto w-full max-w-2xl flex-1 px-4 pb-6 pt-3"
        >
          <div className="space-y-3">
            {browseDeck.map((c) =>
              c.mediaKind === "audio" ? (
                <TrackCard key={c.id} confession={c} queue={browseDeck} />
              ) : (
                <WhisperCard
                  key={c.id}
                  confession={c}
                  level={displayLevel(c)}
                  nsfwHidden={isNsfwHidden(c)}
                  variant="reader"
                  onClick={() => openPost(c.id)}
                />
              )
            )}
          </div>
        </PullToRefresh>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {switcher}
      {/* Card stack arena. */}
      <div className="relative flex-1 px-4 pt-2">
        <div className="relative mx-auto h-full max-w-md">
          <AnimatePresence>
            {visible
              .map((confession, i) => ({ confession, i }))
              .reverse()
              .map(({ confession, i }) => (
                <SwipeCard
                  key={confession.id}
                  confession={confession}
                  index={i}
                  active={i === 0}
                  exitDirection={exitDirection}
                  onSwipe={react}
                />
              ))}
          </AnimatePresence>

          {remaining === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full glass animate-pulse-glow">
                <span className="text-3xl">✦</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-gradient">
                You've seen them all
              </h2>
              <p className="mt-2 max-w-xs text-sm text-white/55">
                You've reached the end for now. New secrets surface constantly —
                circle back soon.
              </p>
              <button
                onClick={reset}
                className="mt-6 flex items-center gap-2 rounded-full bg-veil-500 px-6 py-3 font-semibold text-white shadow-glow transition active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                Replay the deck
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Action bar — large, thumb-friendly touch targets. */}
      <AnimatePresence>
        {remaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-end justify-center gap-8 px-6 pb-3 pt-5"
          >
            <div className="flex flex-col items-center gap-1.5">
              <button
                aria-label="Fail"
                onClick={() => react("wild")}
                className="group flex h-16 w-16 items-center justify-center rounded-full border border-shroud/40 bg-shroud/10 text-shroud transition active:scale-90 hover:shadow-glow-shroud"
              >
                <EyeOff className="h-7 w-7 transition group-active:scale-110" />
              </button>
              <span className="text-xs font-semibold text-shroud/90">Fail</span>
            </div>

            <div className="pb-5 text-center">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-white/40">
                {remaining} left
              </p>
              {online > 0 && (
                <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-feel">
                  <span className="h-1.5 w-1.5 rounded-full bg-feel" />
                  {online} online
                </p>
              )}
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <button
                aria-label="Vyb"
                onClick={() => react("feel")}
                className="group flex h-16 w-16 items-center justify-center rounded-full border border-feel/40 bg-feel/10 text-feel transition active:scale-90 hover:shadow-glow-feel"
              >
                <Heart className="h-7 w-7 transition group-active:scale-110" />
              </button>
              <span className="text-xs font-semibold text-feel/90">Vyb</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
