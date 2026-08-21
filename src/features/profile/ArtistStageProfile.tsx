import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Flag,
  Gift,
  Loader2,
  MapPin,
  MessageCircle,
  Radio,
  Star,
  UserPlus,
} from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { toPlayerTrack } from "@/components/TrackCard";
import { playTrack } from "@/lib/audioBus";
import { ProfessionBadges } from "@/components/ProfessionBadges";
import { RoleClassBadge } from "@/components/RoleClassBadge";
import { Discography } from "@/components/Discography";
import { AffiliateLinks } from "@/components/AffiliateLinks";
import { ArtistRoster } from "@/components/ArtistRoster";
import { ProBadge } from "@/components/ProBadge";
import { TipButton } from "@/components/TipButton";
import { VcTipSheet } from "@/components/VcTipSheet";
import { Avatar } from "@/components/Avatar";
import { accentWashStyle, CosmeticAvatarShell, Flair, type ResolvedCosmetics } from "@/lib/cosmetics";
import { formatVcAddress } from "@/lib/vc";
import { cx, timeAgo } from "@/lib/utils";
import { SessionProvenanceBadge } from "@/features/provenance/SessionProvenanceBadge";
import type { WorkSessionLink } from "@/features/provenance/workAttestation";
import type { Credit, CreatorStats, Drop, ProfileProject, ProjectLink, ProjectPost } from "@/types";
import type { PublicProfile } from "@/lib/api";
import type { StorefrontPackPublic } from "@/features/storefront/types";
import type { StageNight } from "./stageNights";
import { collectStageWorks } from "./workKind";
import { WorkCard } from "./WorkCard";

export function ArtistStageProfile({
  id,
  profile,
  drops,
  stats,
  credits,
  nights,
  packs,
  projects,
  posts,
  projectLinks,
  sessionLinks,
  cosmetics,
  isMe,
  requested,
  busy,
  onConnect,
  onMessage,
  onBook,
}: {
  id: string;
  profile: PublicProfile;
  drops: Drop[];
  stats: CreatorStats | null;
  credits: Credit[];
  nights: StageNight[];
  packs: StorefrontPackPublic[];
  projects: ProfileProject[];
  posts: ProjectPost[];
  projectLinks: ProjectLink[];
  sessionLinks: WorkSessionLink[];
  cosmetics: ResolvedCosmetics;
  isMe: boolean;
  requested: boolean;
  busy: "follow" | "msg" | "book" | null;
  onConnect: () => void;
  onMessage: () => void;
  onBook: () => void;
}) {
  const navigate = useNavigate();
  const [tipOpen, setTipOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const f = profile.profile ?? {};
  const addr = formatVcAddress(profile.username);
  const playable = drops.filter((d) => d.audioUrl);
  const liveNow = nights.find((n) => n.status === "live") ?? null;
  const sealedFull = nights.filter((n) => n.sealed && n.strength === "full").length;
  const banner = profile.avatarUrl;
  const bio = (profile.bio || "").trim();
  const longBio = bio.length > 220;

  const works = useMemo(
    () =>
      collectStageWorks({
        drops,
        projects,
        posts,
        projectLinks,
        demoUrl: profile.musicUrl,
      }),
    [drops, projects, posts, projectLinks, profile.musicUrl],
  );

  const measuredCells = useMemo(() => {
    const cells: { label: string; value: string }[] = [];
    const sealed = nights.filter((n) => n.sealed).length;
    if (sealed > 0) cells.push({ label: "Sealed nights", value: String(sealed) });
    if (works.length > 0) cells.push({ label: "Works", value: String(works.length) });
    if (stats && stats.ratings > 0) {
      cells.push({ label: "Rated", value: `${stats.avgRating.toFixed(1)} · ${stats.ratings}` });
    }
    if (stats && stats.connections > 0) cells.push({ label: "Connections", value: String(stats.connections) });
    if (packs.length > 0) cells.push({ label: "Packs", value: String(packs.length) });
    return cells;
  }, [nights, stats, packs.length, works.length]);

  function playAll() {
    if (!playable.length) return;
    playTrack(
      toPlayerTrack({ ...playable[0], authorUsername: profile.username }),
      playable.map((d) => toPlayerTrack({ ...d, authorUsername: profile.username })),
    );
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto bg-ink-950 text-white" style={accentWashStyle(cosmetics.accent)}>
      <section className="relative isolate h-[38vh] min-h-[16rem] max-h-[22rem] overflow-hidden sm:h-[42vh]">
        {banner ? (
          <img
            src={banner}
            alt=""
            className="stage-drift absolute inset-0 h-full w-full object-cover opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 via-ink-950 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/55 to-black/20" />
        {liveNow && (
          <button
            type="button"
            onClick={() => navigate(`/live/${liveNow.id}`)}
            className="absolute inset-0 z-[1]"
            aria-label="Join live"
          />
        )}
        <div className="relative z-[2] flex h-full flex-col justify-end px-4 pb-6 sm:px-8">
          <div className="flex items-end gap-4">
            <span className={cx("relative shrink-0", liveNow && "stage-live-ring")}>
              <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
                <Avatar url={profile.avatarUrl} name={profile.username} id={id} size="xl" square />
              </CosmeticAvatarShell>
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-center gap-2">
                {liveNow && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-wild px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    <Radio className="h-3 w-3" /> Live
                  </span>
                )}
                <Flair data={cosmetics.flair} />
                <span className="hidden">
                  <ProfessionBadges primary={f.profession} all={f.professions} />
                  <RoleClassBadge roleClass={f.roleClass} />
                  <ProBadge profile={f} />
                </span>
              </div>
              <h1 className="mt-1 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight text-white sm:text-5xl">
                {profile.displayName || profile.username || "Host"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {addr && <p className="font-mono text-[13px] text-cyan-200/90">{addr}</p>}
                {sealedFull > 0 && <SessionProvenanceBadge strength="full" />}
                {profile.location && (
                  <span className="flex items-center gap-1 text-[12px] text-white/40">
                    <MapPin className="h-3 w-3" /> {profile.location}
                  </span>
                )}
              </div>
            </div>
            {!isMe && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                aria-label="Report user"
                className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass text-white/40 hover:text-white/70"
              >
                <Flag className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-20 border-b border-white/8 bg-ink-950/80 px-4 py-2.5 backdrop-blur-xl sm:px-8">
        <div className="flex flex-wrap gap-2">
          {liveNow ? (
            <button type="button" onClick={() => navigate(`/live/${liveNow.id}`)} className="btn btn-primary h-10 flex-1 py-0 text-xs sm:flex-none sm:px-5">
              <Radio className="h-3.5 w-3.5" /> Join live
            </button>
          ) : playable.length > 0 ? (
            <button type="button" onClick={playAll} className="btn btn-primary h-10 flex-1 py-0 text-xs sm:flex-none sm:px-5">
              Listen · {playable.length}
            </button>
          ) : null}
          {!isMe && (
            <>
              <button type="button" disabled={!!busy || requested} onClick={onConnect} data-testid="profile-connect" className="btn btn-ghost h-10 flex-1 py-0 text-xs disabled:opacity-40 sm:flex-none sm:px-4">
                {busy === "follow" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                {requested ? "Request sent" : "Connect"}
              </button>
              <button type="button" disabled={!!busy} onClick={onMessage} className="btn btn-ghost h-10 flex-1 py-0 text-xs sm:flex-none sm:px-4">
                {busy === "msg" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                Message
              </button>
              <TipButton userId={id} username={profile.username} className="h-10 px-3" />
              <button type="button" onClick={() => setTipOpen(true)} className="btn btn-ghost h-10 px-3 py-0 text-xs">
                <Gift className="h-3.5 w-3.5" /> Tip Vc
              </button>
            </>
          )}
          {isMe && (
            <button type="button" onClick={() => navigate("/profile/edit")} className="btn btn-ghost h-10 px-4 py-0 text-xs">
              Edit profile
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          <section>
            <p className="eyebrow mb-3">On the stage</p>
            {nights.length === 0 ? (
              <p className="text-sm text-white/40">No live nights yet.</p>
            ) : (
              <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
                {nights.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => navigate(`/live/${n.id}`)}
                    className="w-[78vw] max-w-sm shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition hover:border-white/20 sm:w-80"
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-white/[0.06] to-black">
                      {banner && (
                        <img src={banner} alt="" className="h-full w-full object-cover opacity-60" />
                      )}
                      {n.status === "live" && (
                        <span className="absolute left-2 top-2 rounded-full bg-wild px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          Live
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 p-3">
                      <p className="truncate font-display text-sm font-semibold">{n.title || n.intent || "Live"}</p>
                      <p className="font-mono text-[11px] text-white/40">
                        {timeAgo(n.startedAt)}
                        {n.viewerCount > 0 ? ` · ${n.viewerCount} watching` : ""}
                      </p>
                      {n.sealed && n.strength && <SessionProvenanceBadge strength={n.strength} compact />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {works.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Works</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {works.map((work) => (
                  <div
                    key={work.id}
                    className={work.kind === "audio" || work.kind === "video" ? "sm:col-span-2" : undefined}
                  >
                    <WorkCard
                      work={work}
                      audioQueue={drops.map((d) => ({ ...d, authorUsername: profile.username }))}
                      sessionLinks={sessionLinks}
                      onOpenAuthor={isMe ? () => navigate("/") : undefined}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {(bio || f.genres?.length) && (
            <section>
              <p className="eyebrow mb-3">Story</p>
              {bio && (
                <p className="max-w-xl text-[15px] leading-relaxed text-white/70">
                  {longBio && !storyOpen ? `${bio.slice(0, 220).trim()}…` : bio}
                </p>
              )}
              {longBio && (
                <button type="button" onClick={() => setStoryOpen((v) => !v)} className="mt-2 text-[12px] text-cyan-200/80">
                  {storyOpen ? "Show less" : "Read the story"}
                </button>
              )}
              {f.genres?.length ? (
                <p className="mt-3 text-[13px] text-white/45">{f.genres.join(" · ")}</p>
              ) : null}
            </section>
          )}

          {packs.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Packs</p>
              <div className="grid gap-2">
                {packs.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => navigate(`/pack/${pack.slug}`)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left hover:border-white/20"
                  >
                    <p className="text-sm font-semibold">{pack.title}</p>
                    <p className="text-[11px] text-white/40">{pack.genre || "Pack"}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-5">
          {measuredCells.length > 0 && (
            <section>
              <p className="eyebrow mb-3">Measured</p>
              <div className="grid grid-cols-2 gap-2">
                {measuredCells.map((c) => (
                  <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <p className="font-mono text-lg text-cyan-100">{c.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/35">{c.label}</p>
                  </div>
                ))}
              </div>
              {stats && stats.reputation >= 0.5 && (
                <p className="mt-2 flex items-center gap-1 text-[12px] text-white/50">
                  <Star className="h-3 w-3" /> Proven on ratings we actually have
                </p>
              )}
            </section>
          )}

          {(credits.length > 0 || isMe) && (
            <section>
              <Discography credits={credits} isOwner={isMe} />
            </section>
          )}

          <details className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2">
            <summary className="cursor-pointer text-[12px] text-white/35">More</summary>
            <div className="mt-3 space-y-6">
              <ArtistRoster userId={id} editable={isMe} drops={drops} />
              <AffiliateLinks userId={id} editable={isMe} />
            </div>
          </details>

          {!isMe && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="eyebrow mb-2">Book a session</p>
              <p className="mb-3 text-[13px] text-white/45">
                Opens a message. Tell them when you want to work — this is not a calendar.
              </p>
              <button type="button" disabled={!!busy} onClick={onBook} className="btn btn-primary h-10 w-full py-0 text-xs">
                {busy === "book" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
                Message to book
              </button>
            </section>
          )}
        </aside>
      </div>

      <style>{`
        @keyframes stage-drift {
          from { transform: scale(1.04); }
          to { transform: scale(1.12); }
        }
        .stage-drift { animation: stage-drift 22s ease-in-out alternate infinite; }
        @media (prefers-reduced-motion: reduce) {
          .stage-drift { animation: none; }
          .stage-live-ring { animation: none; }
        }
        .stage-live-ring {
          box-shadow: 0 0 0 2px rgb(220 38 38 / 0.85);
          border-radius: 1.1rem;
          animation: stage-live-breathe 2.4s ease-in-out infinite;
        }
        @keyframes stage-live-breathe {
          0%, 100% { box-shadow: 0 0 0 2px rgb(220 38 38 / 0.7); }
          50% { box-shadow: 0 0 0 4px rgb(220 38 38 / 0.25); }
        }
      `}</style>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetKind="user"
        targetId={id}
        targetLabel={addr || undefined}
      />
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
