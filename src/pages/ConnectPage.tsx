import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Flame, Loader2, MessageCircle, Music2, Repeat, Sparkles, Star, Target, UserPlus, Users, ArrowRight } from "lucide-react";
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
      <PageHeader
        title="Find"
        subtitle="Creators who complement you — ranked both ways"
      />

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        <div className="mb-6 flex gap-6 border-b border-[var(--hairline)] pb-3">
          <button
            type="button"
            onClick={() => navigate("/spark")}
            className="group flex items-center gap-2 text-[13px] font-medium text-white/55 transition hover:text-white"
          >
            <Flame className="h-3.5 w-3.5 text-veil-300" />
            Spark
            <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/opportunities")}
            className="group flex items-center gap-2 text-[13px] font-medium text-white/55 transition hover:text-white"
          >
            <Briefcase className="h-3.5 w-3.5 text-white/40" />
            Opportunities
            <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
          </button>
        </div>

        <p className="eyebrow mb-3">Collaborators for you</p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matches yet"
            body="Add what you offer and who you’re looking for on your profile. Complementary creators show up here first."
            action={
              <button type="button" onClick={() => navigate("/profile/edit")} className="btn btn-primary mt-1 h-9 px-4 py-0 text-xs">
                Edit profile
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {matches.map((m, i) => (
              <div key={m.userId} style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }} className="reveal py-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/u/${m.userId}`)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-veil-500/20 font-display text-sm font-bold text-veil-100 ring-1 ring-white/10"
                  >
                    {(m.username || "?").charAt(0).toUpperCase()}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <button type="button" onClick={() => navigate(`/u/${m.userId}`)} className="truncate font-display text-[15px] font-semibold text-white">
                        {m.username || "Creator"}
                      </button>
                      {m.mutual && (
                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-feel">
                          <Repeat className="h-2.5 w-2.5" /> Mutual
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-white/40">
                      <span className="text-white/55">{Math.round(m.fit * 100)}% fit</span>
                      <ConfidenceRead confidence={m.confidence} />
                      {isAdjacentClass(m.roleClass) && (
                        <span className="text-white/45">{ROLE_CLASS_LABEL[m.roleClass as string] ?? m.roleClass}</span>
                      )}
                      {m.reputation >= 0.5 && (
                        <span className="flex items-center gap-0.5 text-white/45"><Star className="h-2.5 w-2.5" /> Proven</span>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => connect(m)} aria-label="Connect" className="btn btn-ghost h-9 w-9 shrink-0 p-0">
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => message(m)} aria-label="Message" className="btn btn-primary h-9 w-9 shrink-0 p-0">
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2.5 space-y-1 pl-14">
                  {m.sharedDisciplines.length > 0 && <Why icon={<Sparkles className="h-3 w-3 text-white/35" />} label="You both do" items={m.sharedDisciplines} />}
                  {m.offersYouSeek.length > 0 && <Why icon={<Music2 className="h-3 w-3 text-feel/80" />} label="Has what you want" items={m.offersYouSeek} />}
                  {m.seeksYouOffer.length > 0 && <Why icon={<Target className="h-3 w-3 text-white/35" />} label="Wants what you bring" items={m.seeksYouOffer} />}
                  {(m.sharedGenres.length > 0 || m.sharedDaws.length > 0) && (
                    <p className="text-[11px] text-white/35">
                      {[...m.sharedGenres.slice(0, 3), ...m.sharedDaws.slice(0, 2)].join(" · ")}
                    </p>
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

function ConfidenceRead({ confidence }: { confidence: number }) {
  const r = confidenceRead(confidence);
  return (
    <span title={`Match confidence ${r.pct}%`} className={cx("font-medium", r.tone)}>
      {r.label}
    </span>
  );
}

function Why({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/45">
      {icon}
      <span className="text-white/30">{label}</span>
      <span className="font-medium text-white/65">{items.join(" · ")}</span>
    </p>
  );
}
