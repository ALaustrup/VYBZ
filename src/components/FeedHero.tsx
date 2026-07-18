import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Sparkles, Target, UserPlus, X } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { confidenceRead } from "@/lib/confidence";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";
import type { CollabMatch } from "@/types";

const DISMISS_KEY = "vybz.heroDismissed";

/**
 * The post-login landing hero. Turns the top of the home feed into a launchpad:
 * a greeting, your strongest fresh matches (with the explainable confidence read)
 * for one-tap Connect/Message, and a gentle nudge to finish your profile so
 * matchmaking sharpens. Dismissible; reappears only if re-enabled.
 */
export function FeedHero() {
  const navigate = useNavigate();
  const { profile, showToast } = useSession();
  const [matches, setMatches] = useState<CollabMatch[] | null>(null);
  const reduce = useReduceFx();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => { api.collabMatches(3).then(setMatches); }, []);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
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
      className="accent-fade relative mb-4 overflow-hidden rounded-2xl border border-veil-400/25 bg-veil-radial p-4"
    >
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/5 hover:text-white/70">
        <X className="h-3.5 w-3.5" />
      </button>

      <p className="flex items-center gap-1.5 font-display text-[15px] font-bold text-white">
        <Sparkles className="h-4 w-4 text-veil-200" /> Welcome back, {name}
      </p>

      {matches === null ? (
        <p className="mt-1 text-[13px] text-white/45">Finding your best matches…</p>
      ) : top.length > 0 ? (
        <>
          <p className="mb-2.5 mt-1 text-[12px] text-white/50">Your strongest matches right now — connect while they're fresh.</p>
          <div className="space-y-2">
            {top.map((m) => {
              const r = confidenceRead(m.confidence);
              return (
                <div key={m.userId} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2">
                  <button onClick={() => navigate(`/u/${m.userId}`)} className="shrink-0"><Avatar name={m.username} id={m.userId} size="sm" /></button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate(`/u/${m.userId}`)} className="block truncate text-sm font-semibold text-white">{m.username ?? "Creator"}</button>
                    <p className="flex items-center gap-1.5 text-[11px] text-white/45">
                      {Math.round(m.fit * 100)}% fit
                      <span className={cx("flex items-center gap-1 font-semibold", r.tone)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{r.label}</span>
                    </p>
                  </div>
                  <button onClick={() => connect(m)} aria-label="Connect" className="flex shrink-0 items-center justify-center rounded-full bg-veil-500/25 px-2.5 py-1.5 text-veil-100 active:scale-95"><UserPlus className="h-3.5 w-3.5" /></button>
                  <button onClick={async () => { const t = await api.startDm(m.userId); if (t) navigate(`/messages/${t}`); }} aria-label="Message" className="flex shrink-0 items-center justify-center rounded-full bg-white/10 px-2.5 py-1.5 text-white/80 active:scale-95"><MessageCircle className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate("/connect")} className="mt-2.5 flex items-center gap-1 text-[12px] font-semibold text-veil-200 hover:text-veil-100">
            See all matches <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <p className="mb-2.5 mt-1 text-[12px] text-white/55">Tell us who you're looking for and your matches will appear here.</p>
          <button onClick={() => navigate("/profile/edit")} className="flex items-center gap-2 rounded-xl border border-aqua-400/25 bg-aqua-400/[0.08] px-3 py-2 text-left text-[13px] font-semibold text-aqua-100 active:scale-[0.99]">
            <Target className="h-4 w-4 shrink-0" /> Add the roles you're seeking <ArrowRight className="ml-auto h-4 w-4" />
          </button>
        </>
      )}

      {needsAvatar && (
        <button onClick={() => navigate("/profile/edit")} className="mt-2 flex w-full items-center gap-1.5 text-[11px] text-white/45 hover:text-white/70">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Add a profile photo so collaborators recognize you
        </button>
      )}
    </motion.div>
  );
}
