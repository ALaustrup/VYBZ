import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LifeBuoy,
  MessageCircle,
  Radio,
  Shuffle,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { cx } from "@/lib/utils";

/**
 * Never Alone — a calm, ever-present indicator of how alive MYVYB is for you
 * right now. It never shows emptiness: at zero it invites you to find people
 * rather than reporting "0 online". Tapping it opens Smart Routing.
 */
export function PresencePill({ variant = "pill" }: { variant?: "pill" | "card" }) {
  const { ambientPresence, openConnectNow } = useApp();
  const online = ambientPresence?.online ?? 0;
  const live = ambientPresence?.live ?? 0;
  const lively = online > 0 || live > 0;

  if (variant === "card") {
    return (
      <button
        onClick={openConnectNow}
        className="glass-panel w-full p-4 text-left transition hover:bg-black/25"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-white/45">
            Around you now
          </span>
          <PulseDot active={lively} />
        </div>
        <p className="mt-2 font-display text-2xl font-bold text-white">
          {lively ? `${online} here now` : "Let's find your people"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip icon={Radio} label={`${live} live`} />
          <Chip icon={Shuffle} label={`${ambientPresence?.roulette ?? 0} waiting`} />
          <Chip icon={Users} label={`${online} online`} />
        </div>
        <span className="mt-3 block w-full rounded-lg bg-veil-500 py-2.5 text-center font-display text-sm font-semibold text-white shadow-glow">
          Find someone now
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={openConnectNow}
      aria-label="Find someone to connect with"
      className="flex h-10 items-center gap-1.5 rounded-full bg-white/[0.04] px-3 text-white/80 transition active:scale-95"
    >
      <PulseDot active={lively} />
      <span className="text-xs font-semibold tabular-nums">
        {lively ? online : "Find people"}
      </span>
    </button>
  );
}

function PulseDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
      )}
      <span
        className={cx(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          active ? "bg-emerald-400" : "bg-white/30"
        )}
      />
    </span>
  );
}

function Chip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-white/65">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

/**
 * Smart Routing — when a user wants company, send them to the liveliest place
 * available right now instead of letting them bounce off an empty surface.
 */
export function ConnectNowSheet() {
  const {
    connectNowOpen,
    closeConnectNow,
    ambientPresence,
    openLifeline,
    openCompanions,
  } = useApp();
  const navigate = useNavigate();

  const live = ambientPresence?.live ?? 0;
  const roulette = ambientPresence?.roulette ?? 0;
  const online = ambientPresence?.online ?? 0;

  function go(path: string) {
    closeConnectNow();
    navigate(path);
  }

  // Pick the liveliest destination: a live stream first, then a waiting chat
  // partner, then the always-on rooms.
  function connectMe() {
    if (live > 0) return go("/live");
    if (roulette > 0) return go("/chat#random");
    return go("/chat#rooms");
  }

  function support() {
    closeConnectNow();
    openLifeline();
  }

  return (
    <AnimatePresence>
      {connectNowOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeConnectNow}
            className="fixed inset-0 z-[62] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[62] mx-auto max-w-md rounded-t-3xl border-t border-white/10 bg-ink-900 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5"
          >
            <button
              onClick={closeConnectNow}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-white">
              You're not alone here
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              {online > 0
                ? `${online} ${online === 1 ? "person is" : "people are"} around right now. Want to meet someone?`
                : "There's always a way to connect. Pick where you'd like to start."}
            </p>

            <button
              onClick={connectMe}
              className="mt-5 w-full rounded-lg bg-veil-500 py-3.5 font-display font-semibold text-white shadow-glow transition active:scale-[0.98]"
            >
              Connect me now
            </button>

            <div className="mt-3 space-y-2">
              <RouteRow
                icon={Radio}
                title="Watch someone live"
                meta={live > 0 ? `${live} live now` : "Be the first on"}
                onClick={() => go("/live")}
              />
              <RouteRow
                icon={Shuffle}
                title="Meet someone random"
                meta={roulette > 0 ? `${roulette} waiting` : "Jump the queue"}
                onClick={() => go("/chat#random")}
              />
              <RouteRow
                icon={Sparkles}
                title="Browse people by vibe"
                meta="Matched to you"
                onClick={() => go("/connect")}
              />
              <RouteRow
                icon={MessageCircle}
                title="Talk to a companion"
                meta="AI · always here for you"
                onClick={() => {
                  closeConnectNow();
                  openCompanions();
                }}
              />
            </div>

            <button
              onClick={support}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/70 transition active:scale-[0.98]"
            >
              <LifeBuoy className="h-4 w-4" /> Need someone to talk to?
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function RouteRow({
  icon: Icon,
  title,
  meta,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07] active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-veil-500/15 text-veil-200">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-semibold text-white">
          {title}
        </span>
        <span className="block truncate text-[11px] text-white/45">{meta}</span>
      </span>
    </button>
  );
}
