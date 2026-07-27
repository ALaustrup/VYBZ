import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, Sparkles, Star, Target, Users, Flag } from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { FreeConnectActions } from "@/components/FreeConnectActions";
import { useResolvedCosmetics, Flair, CosmeticAvatarShell } from "@/lib/cosmetics";
import { FLAGS } from "@/lib/flags";
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
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-4 pt-1.5">
      <div className="mb-3 flex items-start gap-3">
        <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
          <Avatar url={p.avatarUrl} name={p.username} id={id} size="lg" square />
        </CosmeticAvatarShell>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Flair data={cosmetics.flair} />
            <ProfessionBadges primary={f.profession} all={f.professions} />
            <RoleClassBadge roleClass={f.roleClass} />
            <ProBadge profile={f} />
          </div>
          {p.location && <p className="mt-1 text-[12px] text-white/40">{p.location}</p>}
          {stats && (stats.ratings > 0 || stats.drops > 0 || stats.connections > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
              {stats.reputation >= 0.5 && <span className="flex items-center gap-1 font-medium text-white/65"><Star className="h-3 w-3" /> Proven</span>}
              {stats.ratings > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-white/50" />{stats.avgRating.toFixed(1)} · {stats.ratings}</span>}
              <span>{stats.drops} {stats.drops === 1 ? "drop" : "drops"}</span>
              {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats.connections}</span>}
            </div>
          )}
        </div>
        {!isMe && (
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            <button type="button" onClick={() => setReportOpen(true)} aria-label="Report user" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass text-white/40 hover:text-white/70 active:scale-90"><Flag className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetKind="user" targetId={id} targetLabel={p.username ? `@${p.username}` : undefined} />

      {p.bio && <p className="mb-3 text-sm leading-relaxed text-white/65">{p.bio}</p>}

      {/* Living canvas cut — public-safe vibes only (no Focus / private prefs). */}
      {(f.lookingFor?.length || f.meetupIntents?.length || f.interests?.length) ? (
        <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <p className="eyebrow mb-2">Open to</p>
          <div className="flex flex-wrap gap-1.5">
            {(f.lookingFor ?? []).map((x) => (
              <span key={`lf-${x}`} className="rounded-full bg-feel/15 px-2.5 py-1 text-[11px] font-medium text-feel/90 ring-1 ring-feel/25">{x}</span>
            ))}
            {(f.meetupIntents ?? []).map((x) => (
              <span key={`mu-${x}`} className="rounded-full bg-aqua/15 px-2.5 py-1 text-[11px] font-medium text-aqua/90 ring-1 ring-aqua/25">{x}</span>
            ))}
            {(f.interests ?? []).slice(0, 8).map((x) => (
              <span key={`in-${x}`} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/60 ring-1 ring-white/10">{x}</span>
            ))}
          </div>
        </div>
      ) : null}

      {!isMe && (
        <div className="mb-4">
          <FreeConnectActions peerId={id} peerName={p.username} variant="bar" />
          <p className="mt-1.5 text-center text-[11px] text-white/35">Message, voice, and cam are free forever</p>
          {FLAGS.tips && (
            <div className="mt-3 flex justify-center border-t border-white/5 pt-3">
              <TipButton userId={id} username={p.username} />
            </div>
          )}
        </div>
      )}

      <div className="mb-4 space-y-1.5">
        {p.offers.length > 0 && <Row icon={<Sparkles className="h-3.5 w-3.5 text-white/35" />} label="Brings" items={p.offers} />}
        {p.seeks.length > 0 && <Row icon={<Target className="h-3.5 w-3.5 text-white/35" />} label="Seeks" items={p.seeks} />}
        {f.genres?.length ? <Row label="Genres" items={f.genres} /> : null}
        {/* Romantic prefs / birthYear / age / Focus never marketed here beyond Open to chips */}
      </div>

      <AffiliateLinks userId={id} editable={isMe} />

      <div className="mb-4">
        <ArtistRoster userId={id} editable={isMe} drops={drops} />
      </div>

      <div className="mb-4">
        <Discography credits={credits} isOwner={isMe} />
      </div>

      <div className="mb-4">
        <p className="eyebrow mb-2">Projects</p>
        <ProjectsPanel userId={id} editable={isMe} />
      </div>

      {drops.length > 0 && (
        <>
          <p className="eyebrow mb-2">Drops</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {drops.map((d) => (
              <TrackCard key={d.id} compact drop={{ ...d, authorUsername: p.username }} queue={drops} />
            ))}
          </div>
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
