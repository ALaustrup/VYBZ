import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Flame, Loader2, MessageCircle, Music2, Repeat, Sparkles, Star, Target, UserPlus, Users } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import { confidenceRead } from "@/lib/confidence";
import { ROLE_CLASS_LABEL, isAdjacentClass } from "@/lib/profileFields";
import type { CollabMatch } from "@/types";

export function ConnectPage() {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [matches, setMatches] = useState<CollabMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.collabMatches(30).then((m) => { setMatches(m); setLoading(false); });
  }, []);

  async function connect(m: CollabMatch) {
    await api.connect(m.userId);
    void api.logMatchFeedback(m.userId, "connect", "connect_page");
    showToast(`Connection sent to ${m.username ?? "creator"}`);
  }
  async function message(m: CollabMatch) {
    const t = await api.startDm(m.userId);
    if (t) navigate(`/messages/${t}`);
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader icon={Users} title="Connect" subtitle="Complementary creators, ranked both directions" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-2">
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button onClick={() => navigate("/spark")} className="flex flex-col gap-1.5 rounded-2xl border border-veil-400/30 bg-gradient-to-br from-veil-500/25 to-wild/10 p-3.5 text-left transition active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900/60"><Flame className="h-5 w-5 text-veil-100" /></span>
            <p className="font-display text-sm font-bold text-white">Spark</p>
            <p className="text-[11px] leading-tight text-white/55">Swipe complementary creators</p>
          </button>
          <button onClick={() => navigate("/opportunities")} className="flex flex-col gap-1.5 rounded-2xl border border-aqua-400/30 bg-gradient-to-br from-aqua-400/20 to-glow/10 p-3.5 text-left transition active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900/60"><Briefcase className="h-5 w-5 text-aqua-200" /></span>
            <p className="font-display text-sm font-bold text-white">Opportunities</p>
            <p className="text-[11px] leading-tight text-white/55">Post &amp; find open roles</p>
          </button>
        </div>

        <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40"><Sparkles className="h-3.5 w-3.5 text-veil-300" /> Collaborators for you</p>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : matches.length === 0 ? (
          <EmptyState icon={Users} title="No matches yet" body="Set the roles you bring and seek on your profile. The moment complementary creators join, they surface here — best-fit first, both directions." />
        ) : (
          <div className="space-y-2.5">
            {matches.map((m, i) => (
              <div key={m.userId} style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }} className={cx("reveal rounded-2xl border p-3.5", m.mutual ? "border-feel/35 bg-gradient-to-br from-feel/10 to-aqua-400/[0.06]" : "border-white/8 bg-white/[0.03]")}>
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate(`/u/${m.userId}`)} className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold", m.mutual ? "bg-feel/25 text-white" : "bg-veil-500/20 text-veil-100")}>
                    {(m.username || "?").charAt(0).toUpperCase()}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/u/${m.userId}`)} className="truncate font-display font-semibold text-white">{m.username || "Creator"}</button>
                      {m.mutual && <span className="flex shrink-0 items-center gap-1 rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel"><Repeat className="h-2.5 w-2.5" /> Mutual</span>}
                      {isAdjacentClass(m.roleClass) && <span className="flex shrink-0 items-center gap-1 rounded-full bg-aqua-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aqua-100"><Briefcase className="h-2.5 w-2.5" /> {ROLE_CLASS_LABEL[m.roleClass as string] ?? m.roleClass}</span>}
                      {m.reputation >= 0.5 && <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300"><Star className="h-2.5 w-2.5" fill="currentColor" /> Proven</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-white/45">{Math.round(m.fit * 100)}% fit</p>
                      <ConfidencePill confidence={m.confidence} />
                    </div>
                  </div>
                  <button onClick={() => connect(m)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white active:scale-95"><UserPlus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => message(m)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-veil-500/20 px-3 py-1.5 text-xs font-semibold text-veil-100 active:scale-95"><MessageCircle className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {m.sharedDisciplines.length > 0 && <Why icon={<Sparkles className="h-3 w-3 text-veil-200" />} label="You both do" items={m.sharedDisciplines} tone="text-veil-100" />}
                  {m.offersYouSeek.length > 0 && <Why icon={<Music2 className="h-3 w-3 text-feel" />} label="Has what you want" items={m.offersYouSeek} tone="text-feel" />}
                  {m.seeksYouOffer.length > 0 && <Why icon={<Target className="h-3 w-3 text-aqua-300" />} label="Wants what you bring" items={m.seeksYouOffer} tone="text-aqua-200" />}
                  {(m.sharedGenres.length > 0 || m.sharedDaws.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {m.sharedGenres.slice(0, 3).map((g) => <span key={g} className="rounded-full bg-veil-500/20 px-2 py-0.5 text-[10px] font-medium text-veil-100">{g}</span>)}
                      {m.sharedDaws.slice(0, 2).map((d) => <span key={d} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80">{d}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const r = confidenceRead(confidence);
  return (
    <span
      title={`Match confidence ${r.pct}% — how much independent evidence backs this match`}
      className={cx("flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold", r.tone)}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {r.label}
    </span>
  );
}

function Why({ icon, label, items, tone }: { icon: React.ReactNode; label: string; items: string[]; tone: string }) {
  return (
    <p className="flex flex-wrap items-center gap-1 text-[11px] text-white/55">
      {icon}<span className="text-white/40">{label}:</span><span className={cx("font-semibold", tone)}>{items.join(" · ")}</span>
    </p>
  );
}
