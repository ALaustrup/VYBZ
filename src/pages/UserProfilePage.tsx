import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle, Sparkles, Star, Target, UserPlus, Users, BadgeCheck, Flag } from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { useResolvedCosmetics, Flair } from "@/lib/cosmetics";
import * as api from "@/lib/api";
import { TrackCard } from "@/components/TrackCard";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import type { Drop, CreatorStats, Credit } from "@/types";

export function UserProfilePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const [p, setP] = useState<api.PublicProfile | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.getPublicProfile(id), api.dropsBy(id, 20), api.getCreatorStats(id), api.creatorCredits(id)]).then(([prof, d, s, c]) => {
      setP(prof); setDrops(d); setStats(s); setCredits(c); setLoading(false);
    });
  }, [id]);

  const cosmetics = useResolvedCosmetics(p?.equippedCosmetics);
  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  if (!p) return <div className="flex h-full items-center justify-center text-white/50">Profile not found.</div>;
  const isMe = userId === id;
  const f = p.profile ?? {};

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-6 pt-3">
      <button onClick={() => navigate(-1)} aria-label="Back" className="mb-3 flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
      <div className="mb-4 flex items-center gap-4">
        <Avatar url={p.avatarUrl} name={p.username} id={id} size="lg" square />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-2xl font-bold text-white">{p.username}</h1>
            <Flair data={cosmetics.flair} />
          </div>
          {f.roleLabel && <p className="truncate text-sm font-semibold text-veil-200">{f.roleLabel}</p>}
          {p.location && <p className="text-sm text-white/50">{p.location}</p>}
        </div>
        {!isMe && (
          <button onClick={() => setReportOpen(true)} aria-label="Report user" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass text-white/40 hover:text-white/70 active:scale-90"><Flag className="h-4 w-4" /></button>
        )}
      </div>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetKind="user" targetId={id} targetLabel={p.username ? `@${p.username}` : undefined} />
      {stats && (stats.ratings > 0 || stats.drops > 0 || stats.connections > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-white/60">
          {stats.reputation >= 0.5 && <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 font-bold uppercase tracking-wide text-amber-300"><Star className="h-3 w-3" fill="currentColor" /> Proven</span>}
          {stats.ratings > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />{stats.avgRating.toFixed(1)} · {stats.ratings} {stats.ratings === 1 ? "rating" : "ratings"}</span>}
          <span>{stats.drops} {stats.drops === 1 ? "drop" : "drops"}</span>
          {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{stats.connections}</span>}
        </div>
      )}
      {p.bio && <p className="mb-4 text-sm leading-relaxed text-white/75">{p.bio}</p>}
      {!isMe && (
        <div className="mb-4 flex gap-2">
          <button onClick={async () => { await api.connect(id); showToast("Connection sent"); }} className="btn btn-ghost flex-1"><UserPlus className="h-4 w-4" /> Connect</button>
          <button onClick={async () => { const t = await api.startDm(id); if (t) navigate(`/messages/${t}`); }} className="btn btn-primary flex-1"><MessageCircle className="h-4 w-4" /> Message</button>
        </div>
      )}
      <div className="mb-4 space-y-2">
        {p.offers.length > 0 && <Row icon={<Sparkles className="h-3.5 w-3.5 text-feel" />} label="Brings" items={p.offers} tone="bg-feel/15 text-feel" />}
        {p.seeks.length > 0 && <Row icon={<Target className="h-3.5 w-3.5 text-aqua-300" />} label="Seeks" items={p.seeks} tone="bg-aqua-400/15 text-aqua-200" />}
        {f.genres?.length ? <Row label="Genres" items={f.genres} tone="bg-veil-500/20 text-veil-100" /> : null}
      </div>
      {credits.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40"><BadgeCheck className="h-3.5 w-3.5 text-feel" /> Verified credits</p>
          <div className="space-y-1.5">
            {credits.map((c) => (
              <div key={c.projectId} className="flex items-center gap-2 rounded-xl border border-feel/15 bg-feel/[0.05] px-3 py-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-feel" />
                <span className="min-w-0 flex-1 truncate text-sm text-white/85">{c.title}</span>
                {c.role && <span className="shrink-0 text-[11px] text-white/50">{c.role}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">Spaces</p>
        <ProjectsPanel userId={id} editable={isMe} />
      </div>

      {drops.length > 0 && (
        <>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">Drops</p>
          <div className="grid gap-4 sm:grid-cols-2">{drops.map((d) => <TrackCard key={d.id} drop={{ ...d, authorUsername: p.username }} queue={drops} />)}</div>
        </>
      )}
    </div>
  );
}

function Row({ icon, label, items, tone }: { icon?: React.ReactNode; label: string; items: string[]; tone: string }) {
  return <div className="flex flex-wrap items-center gap-1.5"><span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">{icon}{label}</span>{items.map((i) => <span key={i} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{i}</span>)}</div>;
}
