import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, MessageCircle, Sparkles, Star, Target, UserPlus, Users, Flag } from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { useResolvedCosmetics, Flair } from "@/lib/cosmetics";
import * as api from "@/lib/api";
import { TrackCard } from "@/components/TrackCard";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
import { ProfessionBadges } from "@/components/ProfessionBadges";
import { RoleClassBadge } from "@/components/RoleClassBadge";
import { TipButton } from "@/components/TipButton";
import { Discography } from "@/components/Discography";
import { AffiliateLinks } from "@/components/AffiliateLinks";
import { ArtistRoster } from "@/components/ArtistRoster";
import { ProBadge } from "@/components/ProBadge";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { useRegisterAppBar } from "@/lib/appBarBridge";
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
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    Promise.all([api.getPublicProfile(id), api.dropsBy(id, 20), api.getCreatorStats(id), api.creatorCredits(id)]).then(([prof, d, s, c]) => {
      setP(prof); setDrops(d); setStats(s); setCredits(c); setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    const t = searchParams.get("tip");
    if (t === "success") showToast("Thanks for supporting this creator!");
    if (t === "success" || t === "cancel") { searchParams.delete("tip"); setSearchParams(searchParams, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useRegisterAppBar({
    title: p?.username ? `@${p.username}` : "Creator",
    subtitle: p?.profile?.roleLabel || undefined,
  }, [p?.username, p?.profile?.roleLabel]);

  const cosmetics = useResolvedCosmetics(p?.equippedCosmetics);
  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  if (!p) return <div className="flex h-full items-center justify-center text-white/50">Profile not found.</div>;
  const isMe = userId === id;
  const f = p.profile ?? {};

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-6 pt-2">
      <div className="mb-5 flex items-start gap-4">
        <Avatar url={p.avatarUrl} name={p.username} id={id} size="lg" square />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-[1.65rem] font-semibold tracking-tight text-white">{p.username}</h1>
            <Flair data={cosmetics.flair} />
          </div>
          {f.roleLabel && <p className="truncate text-sm text-white/55">{f.roleLabel}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ProfessionBadges primary={f.profession} all={f.professions} />
            <RoleClassBadge roleClass={f.roleClass} />
            <ProBadge profile={f} />
          </div>
          {p.location && <p className="mt-1 text-sm text-white/40">{p.location}</p>}
        </div>
        {!isMe && (
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <TipButton userId={id} username={p.username} />
            <button type="button" onClick={() => setReportOpen(true)} aria-label="Report user" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass text-white/40 hover:text-white/70 active:scale-90"><Flag className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <div className="mb-5 h-px w-full bg-[var(--hairline)]" />

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetKind="user" targetId={id} targetLabel={p.username ? `@${p.username}` : undefined} />

      {stats && (stats.ratings > 0 || stats.drops > 0 || stats.connections > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
          {stats.reputation >= 0.5 && <span className="flex items-center gap-1 font-medium text-white/65"><Star className="h-3 w-3" /> Proven</span>}
          {stats.ratings > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-white/50" />{stats.avgRating.toFixed(1)} · {stats.ratings}</span>}
          <span>{stats.drops} {stats.drops === 1 ? "drop" : "drops"}</span>
          {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{stats.connections}</span>}
        </div>
      )}
      {p.bio && <p className="mb-5 text-sm leading-relaxed text-white/65">{p.bio}</p>}

      {!isMe && (
        <div className="mb-5 flex gap-2">
          <button type="button" onClick={async () => { await api.connect(id); showToast("Connection sent"); }} className="btn btn-ghost flex-1"><UserPlus className="h-4 w-4" /> Connect</button>
          <button type="button" onClick={async () => { const t = await api.startDm(id); if (t) navigate(`/messages/${t}`); }} className="btn btn-primary flex-1"><MessageCircle className="h-4 w-4" /> Message</button>
        </div>
      )}

      <div className="mb-5 space-y-2">
        {p.offers.length > 0 && <Row icon={<Sparkles className="h-3.5 w-3.5 text-white/35" />} label="Brings" items={p.offers} />}
        {p.seeks.length > 0 && <Row icon={<Target className="h-3.5 w-3.5 text-white/35" />} label="Seeks" items={p.seeks} />}
        {f.genres?.length ? <Row label="Genres" items={f.genres} /> : null}
      </div>

      <AffiliateLinks userId={id} editable={isMe} />

      <div className="mb-5">
        <ArtistRoster userId={id} editable={isMe} drops={drops} />
      </div>

      <div className="mb-5">
        <Discography credits={credits} isOwner={isMe} />
      </div>

      <div className="mb-6">
        <p className="eyebrow mb-3">Projects</p>
        <ProjectsPanel userId={id} editable={isMe} />
      </div>

      {drops.length > 0 && (
        <>
          <p className="eyebrow mb-3">Drops</p>
          <div className="grid gap-4 sm:grid-cols-2">{drops.map((d) => <TrackCard key={d.id} drop={{ ...d, authorUsername: p.username }} queue={drops} />)}</div>
        </>
      )}
    </div>
  );
}

function Row({ icon, label, items }: { icon?: React.ReactNode; label: string; items: string[] }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]">
      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-white/35">{icon}{label}</span>
      <span className="text-white/65">{items.join(" · ")}</span>
    </p>
  );
}
