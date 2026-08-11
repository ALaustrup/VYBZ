import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Gift, Loader2, MessageCircle, Radio, Star, Users, Flag, UserPlus } from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { useResolvedCosmetics, Flair, CosmeticAvatarShell, accentWashStyle } from "@/lib/cosmetics";
import * as api from "@/lib/api";
import { TrackCard, toPlayerTrack } from "@/components/TrackCard";
import { playTrack } from "@/lib/audioBus";
import { ProfessionBadges } from "@/components/ProfessionBadges";
import { RoleClassBadge } from "@/components/RoleClassBadge";
import { Discography } from "@/components/Discography";
import { AffiliateLinks } from "@/components/AffiliateLinks";
import { ArtistRoster } from "@/components/ArtistRoster";
import { ProBadge } from "@/components/ProBadge";
import { VcTipSheet } from "@/components/VcTipSheet";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { formatVcAddress } from "@/lib/vc";
import { openFreeDm } from "@/lib/freeConnect";
import { useMessagePopout } from "@/lib/messagePopout";
import type { Drop, CreatorStats, Credit, LiveSessionCard } from "@/types";

/** Public artist storefront — catalog, live-now, Follow / Message / tip. */
export function UserProfilePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const { openThread } = useMessagePopout();
  const [p, setP] = useState<api.PublicProfile | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [live, setLive] = useState<LiveSessionCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [busy, setBusy] = useState<"follow" | "msg" | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.getPublicProfile(id),
      api.dropsBy(id, 40),
      api.getCreatorStats(id),
      api.creatorCredits(id),
      api.listLiveSessions(40),
    ]).then(([prof, d, s, c, sessions]) => {
      if (!alive) return;
      setP(prof);
      setDrops(d);
      setStats(s);
      setCredits(c);
      setLive(sessions.find((x) => x.hostId === id) ?? null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    const t = searchParams.get("tip");
    if (t === "success") showToast("Thanks for the tip!");
    if (t === "success" || t === "cancel") {
      searchParams.delete("tip");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const addr = formatVcAddress(p?.username);
  useRegisterAppBar({
    title: addr || "Artist",
    subtitle: live ? "Live now" : (p?.profile?.roleLabel || "Music"),
  }, [addr, p?.profile?.roleLabel, live]);

  const cosmetics = useResolvedCosmetics(p?.equippedCosmetics);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (!p) {
    return <div className="flex h-full items-center justify-center text-white/50">Profile not found.</div>;
  }

  const profile = p;
  const isMe = userId === id;
  const f = profile.profile ?? {};
  const playable = drops.filter((d) => d.audioUrl);

  async function follow() {
    if (busy) return;
    setBusy("follow");
    await api.connect(id);
    setBusy(null);
    showToast(`Following ${addr || profile.username || "artist"}`);
  }

  async function message() {
    if (busy) return;
    setBusy("msg");
    const ok = await openFreeDm(id, openThread);
    setBusy(null);
    if (!ok) showToast("Couldn't open message");
  }

  function playAll() {
    if (!playable.length) return;
    const uname = profile.username;
    playTrack(
      toPlayerTrack({ ...playable[0], authorUsername: uname }),
      playable.map((d) => toPlayerTrack({ ...d, authorUsername: uname })),
    );
    showToast("Queued to VDock");
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-4 pt-1.5" style={accentWashStyle(cosmetics.accent)}>
      <div className="mb-3 flex items-start gap-3">
        <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
          <Avatar url={profile.avatarUrl} name={profile.username} id={id} size="lg" square />
        </CosmeticAvatarShell>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Flair data={cosmetics.flair} />
            <ProfessionBadges primary={f.profession} all={f.professions} />
            <RoleClassBadge roleClass={f.roleClass} />
            <ProBadge profile={f} />
            {live && (
              <span className="inline-flex items-center gap-1 rounded-full bg-wild/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <Radio className="h-3 w-3" /> Live
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[13px] text-cyan-200/90">{addr}</p>
          {profile.location && <p className="mt-0.5 text-[12px] text-white/40">{profile.location}</p>}
          {stats && (stats.ratings > 0 || stats.drops > 0 || stats.connections > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
              {stats.reputation >= 0.5 && <span className="flex items-center gap-1 font-medium text-white/65"><Star className="h-3 w-3" /> Proven</span>}
              {stats.ratings > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-white/50" />{stats.avgRating.toFixed(1)} · {stats.ratings}</span>}
              <span>{stats.drops} {stats.drops === 1 ? "track" : "tracks"}</span>
              {stats.connections > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{stats.connections}</span>}
            </div>
          )}
        </div>
        {!isMe && (
          <button type="button" onClick={() => setReportOpen(true)} aria-label="Report user" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass text-white/40 hover:text-white/70 active:scale-90">
            <Flag className="h-4 w-4" />
          </button>
        )}
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetKind="user" targetId={id} targetLabel={addr || undefined} />

      {profile.bio && <p className="mb-3 text-sm leading-relaxed text-white/65">{profile.bio}</p>}

      {f.genres?.length ? (
        <p className="mb-3 text-[13px] text-white/55">
          <span className="text-[11px] uppercase tracking-wider text-white/35">Genres </span>
          {f.genres.join(" · ")}
        </p>
      ) : null}

      {live && (
        <button
          type="button"
          onClick={() => navigate(`/live/${live.id}`)}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-wild/35 bg-wild/10 px-3 py-3 text-left active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-wild/25 text-wild">
            <Radio className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">{live.title || "Live now"}</span>
            <span className="block text-[11px] text-white/45">{live.viewerCount} watching · tap to join</span>
          </span>
        </button>
      )}

      {!isMe && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void follow()}
            className="btn btn-primary flex h-10 flex-1 items-center justify-center gap-1.5 py-0 text-xs disabled:opacity-40"
          >
            {busy === "follow" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Follow
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void message()}
            className="btn btn-ghost flex h-10 flex-1 items-center justify-center gap-1.5 py-0 text-xs disabled:opacity-40"
          >
            {busy === "msg" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
            Message
          </button>
          <button
            type="button"
            onClick={() => setTipOpen(true)}
            className="btn btn-ghost flex h-10 items-center justify-center gap-1.5 px-3 py-0 text-xs"
          >
            <Gift className="h-3.5 w-3.5" /> Tip
          </button>
        </div>
      )}

      {isMe && (
        <button type="button" onClick={() => navigate("/?tab=you")} className="btn btn-ghost mb-4 w-full py-2 text-xs">
          Edit your dashboard profile
        </button>
      )}

      {playable.length > 0 && (
        <button type="button" onClick={playAll} className="btn btn-primary mb-4 w-full py-2.5 text-sm">
          Play all on VDock · {playable.length} tracks
        </button>
      )}

      <AffiliateLinks userId={id} editable={isMe} />

      <div className="mb-4">
        <ArtistRoster userId={id} editable={isMe} drops={drops} />
      </div>

      <div className="mb-4">
        <Discography credits={credits} isOwner={isMe} />
      </div>

      {drops.length > 0 && (
        <>
          <p className="eyebrow mb-2">Music</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {drops.map((d) => (
              <TrackCard
                key={d.id}
                compact
                drop={{ ...d, authorUsername: profile.username }}
                queue={drops}
                onOpenAuthor={isMe ? () => navigate("/?tab=you") : undefined}
              />
            ))}
          </div>
        </>
      )}

      <VcTipSheet
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        username={profile.username}
        displayName={profile.displayName}
        hostId={id}
      />
    </div>
  );
}
