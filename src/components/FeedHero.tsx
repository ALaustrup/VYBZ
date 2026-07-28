import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Target, UserPlus, X } from "lucide-react";
import * as api from "@/lib/api";
import { openFreeDm } from "@/lib/freeConnect";
import { useMessagePopout } from "@/lib/messagePopout";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { confidenceRead } from "@/lib/confidence";
import { craftScope } from "@/lib/profileFields";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";
import type { CollabMatch } from "@/types";

const DISMISS_UNTIL_KEY = "vybz.heroDismissedUntil";
const LEGACY_DISMISS_KEY = "vybz.heroDismissed";
const SOFT_MS = 24 * 60 * 60 * 1000;

function readDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_UNTIL_KEY) || 0);
    if (until > Date.now()) return true;
    // Migrate forever-dismiss → soft 24h window once
    if (localStorage.getItem(LEGACY_DISMISS_KEY) === "1") {
      localStorage.removeItem(LEGACY_DISMISS_KEY);
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + SOFT_MS));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Home match teaser — soft-dismiss (24h), not forever. Reappears so Network
 * stays a daily pull without gamification junk.
 */
export function FeedHero() {
  const navigate = useNavigate();
  const { openThread } = useMessagePopout();
  const { profile, showToast } = useSession();
  const [matches, setMatches] = useState<CollabMatch[] | null>(null);
  const reduce = useReduceFx();
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    const craft = craftScope(profile?.profile?.profession);
    api.collabMatches(3, craft).then(setMatches);
  }, [profile?.profile?.profession]);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + SOFT_MS));
      localStorage.removeItem(LEGACY_DISMISS_KEY);
    } catch { /* ignore */ }
  }
  async function connect(m: CollabMatch) {
    await api.connect(m.userId);
    void api.logMatchFeedback(m.userId, "connect", "connect_page");
    showToast(`Connection sent to ${m.username ?? "creator"}`);
    setMatches((list) => (list ?? []).filter((x) => x.userId !== m.userId));
  }

  const name = profile?.username ?? "creator";
  const needsAvatar = !profile?.avatarUrl;
  const top = matches ?? [];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-4 border-b border-[var(--hairline)] pb-4"
    >
      <button onClick={dismiss} aria-label="Dismiss for today" className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full text-white/35 hover:text-white/70">
        <X className="h-3.5 w-3.5" />
      </button>

      <p className="font-display text-[15px] font-semibold text-white">
        Welcome back, {name}
      </p>

      {matches === null ? (
        <p className="mt-1 text-[13px] text-white/40">Finding creators near your taste…</p>
      ) : top.length > 0 ? (
        <>
          <p className="mb-3 mt-1 text-[12px] text-white/40">Creators who fit your craft right now.</p>
          <div className="divide-y divide-[var(--hairline)]">
            {top.map((m) => {
              const r = confidenceRead(m.confidence);
              return (
                <div key={m.userId} className="flex items-center gap-2.5 py-2.5">
                  <button type="button" onClick={() => navigate(`/u/${m.userId}`)} className="shrink-0"><Avatar name={m.username} id={m.userId} size="sm" /></button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => navigate(`/u/${m.userId}`)} className="block truncate text-sm font-semibold text-white">{m.username ?? "Creator"}</button>
                    <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                      {Math.round(m.fit * 100)}% fit
                      <span className={cx("font-medium", r.tone)}>{r.label}</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => connect(m)} aria-label="Connect" className="btn btn-ghost h-8 w-8 p-0"><UserPlus className="h-3.5 w-3.5" /></button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await openFreeDm(m.userId, openThread);
                      if (!ok) showToast("Couldn't open message");
                    }}
                    aria-label="Message — free"
                    className="btn btn-primary h-8 w-8 p-0"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => navigate("/connect")} className="mt-2 flex items-center gap-1 text-[12px] font-medium text-white/45 hover:text-white/80">
            Open Network <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <p className="mb-2.5 mt-1 text-[12px] text-white/40">Add genres and roles on your profile — collab suggestions appear here.</p>
          <button type="button" onClick={() => navigate("/profile/edit")} className="flex items-center gap-2 text-[13px] font-medium text-white/70 hover:text-white">
            <Target className="h-3.5 w-3.5 shrink-0 text-veil-300" /> Edit music profile <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {needsAvatar && (
        <button type="button" onClick={() => navigate("/profile/edit")} className="mt-3 flex w-full items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60">
          Add a profile photo so collaborators recognize you
        </button>
      )}
    </motion.div>
  );
}
