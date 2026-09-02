import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Flag,
  Gift,
  Handshake,
  Loader2,
  MapPin,
  MessageCircle,
  Radio,
  Star,
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
import { timeAgo } from "@/lib/utils";
import { SessionProvenanceBadge } from "@/features/provenance/SessionProvenanceBadge";
import type { WorkSessionLink } from "@/features/provenance/workAttestation";
import type { Credit, CreatorStats, Drop, ProfileProject, ProjectLink, ProjectPost } from "@/types";
import type { PublicProfile } from "@/lib/api";
import type { StorefrontPackPublic } from "@/features/storefront/types";
import { FollowButton } from "@/features/network/FollowButton";
import { useSession } from "@/store/session";
import type { StageNight } from "./stageNights";
import {
  profilePerspective,
  showOwnerControls,
  showVisitorSocial,
} from "./perspective";
import { collectStageWorks, type StageWork } from "./workKind";
import { WorkCard } from "./WorkCard";
import { parseStageComposition } from "./stageComposition";
import {
  dropStageModule,
  moveStageModule,
  parseStageHiddenModules,
  parseStageModuleOrder,
  partitionStageWorks,
  toggleHiddenModule,
  visibleStageModules,
  type StageModuleId,
  type StageModuleOccupancy,
} from "./stageLayout";
import { persistStageHiddenModules, persistStageModuleOrder } from "./placeOnVybz";
import { StageModuleFrame } from "./StageModuleFrame";
import { ProfileOwnerPulse } from "./ProfileOwnerPulse";
import { ProfileLiveStage } from "./ProfileLiveStage";
import { ProfileLiveStickyBar } from "./ProfileLiveStickyBar";

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
  previewAsVisitor = false,
  featuredDropId = null,
  requested,
  busy,
  onConnect,
  onMessage,
  onBook,
  onViewAsVisitor,
  onExitVisitorPreview,
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
  previewAsVisitor?: boolean;
  featuredDropId?: string | null;
  requested: boolean;
  busy: "connect" | "msg" | "book" | null;
  onConnect: () => void;
  onMessage: () => void;
  onBook: () => void;
  onViewAsVisitor?: () => void;
  onExitVisitorPreview?: () => void;
}) {
  const navigate = useNavigate();
  const { profile: me, refreshProfile, showToast } = useSession();
  const [tipOpen, setTipOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const liveStageRef = useRef<HTMLElement>(null);
  const [liveSticky, setLiveSticky] = useState(false);
  const [liveBannerDismissed, setLiveBannerDismissed] = useState(false);
  const f = profile.profile ?? {};
  const addr = formatVcAddress(profile.username);
  const playable = drops.filter((d) => d.audioUrl);
  const liveNow = nights.find((n) => n.status === "live") ?? null;
  const showLiveBanner = !!liveNow && !liveBannerDismissed;
  const sealedFull = nights.filter((n) => n.sealed && n.strength === "full").length;
  const banner = profile.avatarUrl;
  const bio = (profile.bio || "").trim();
  const longBio = bio.length > 220;
  const perspective = profilePerspective({ isOwner: isMe, asVisitor: previewAsVisitor });
  const ownerUi = showOwnerControls(perspective);
  const visitorSocial = showVisitorSocial(isMe);
  const composition = useMemo(() => parseStageComposition(profile.profile), [profile.profile]);
  const storedOrder = f.stageModuleOrder;
  const storedHidden = f.stageHiddenModules;
  const [order, setOrder] = useState(() => parseStageModuleOrder(storedOrder));
  const [hidden, setHidden] = useState(() => parseStageHiddenModules(storedHidden));

  useEffect(() => {
    setOrder(parseStageModuleOrder(storedOrder));
  }, [storedOrder]);

  useEffect(() => {
    setHidden(parseStageHiddenModules(storedHidden));
  }, [storedHidden]);

  useEffect(() => {
    if (previewAsVisitor) setArranging(false);
  }, [previewAsVisitor]);

  useEffect(() => {
    setLiveBannerDismissed(false);
  }, [liveNow?.id]);

  useEffect(() => {
    const el = liveStageRef.current;
    if (!showLiveBanner || !el) {
      setLiveSticky(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setLiveSticky(!entry.isIntersecting),
      { threshold: 0.12, rootMargin: "-3.5rem 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showLiveBanner, liveNow?.id]);

  const scrollToLiveStage = useCallback(() => {
    liveStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const works = useMemo(
    () =>
      collectStageWorks({
        drops,
        projects,
        posts,
        projectLinks,
        playlists: f.connectedPlaylists,
        demoUrl: profile.musicUrl,
      }),
    [drops, projects, posts, projectLinks, f.connectedPlaylists, profile.musicUrl],
  );

  const { featured: featuredWorks, rest: restWorks } = useMemo(
    () => partitionStageWorks(works, composition, featuredDropId),
    [works, composition, featuredDropId],
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

  const occupied: StageModuleOccupancy = {
    stage: nights.length > 0,
    featured: featuredWorks.length > 0,
    works: restWorks.length > 0,
    story: Boolean(bio || f.genres?.length),
    packs: packs.length > 0,
    measured: measuredCells.length > 0,
    credits: credits.length > 0 || ownerUi,
    links: true,
  };
  const layoutMode = arranging && ownerUi;
  const shown = visibleStageModules(order, occupied, layoutMode, hidden);

  const commitOrder = useCallback(
    async (next: StageModuleId[]) => {
      const normalized = parseStageModuleOrder(next);
      setOrder(normalized);
      if (!isMe || !me) return;
      setSavingOrder(true);
      const saved = await persistStageModuleOrder(me.profile ?? {}, normalized);
      setSavingOrder(false);
      if (saved.error) {
        showToast("Couldn't save arrangement");
        setOrder(parseStageModuleOrder(storedOrder));
        return;
      }
      await refreshProfile();
    },
    [isMe, me, refreshProfile, showToast, storedOrder],
  );

  const commitHidden = useCallback(
    async (next: StageModuleId[]) => {
      const normalized = parseStageHiddenModules(next);
      setHidden(normalized);
      if (!isMe || !me) return;
      setSavingOrder(true);
      const saved = await persistStageHiddenModules(me.profile ?? {}, normalized);
      setSavingOrder(false);
      if (saved.error) {
        showToast("Couldn't save hidden sections");
        setHidden(parseStageHiddenModules(storedHidden));
        return;
      }
      await refreshProfile();
    },
    [isMe, me, refreshProfile, showToast, storedHidden],
  );

  function playAll() {
    if (!playable.length) return;
    playTrack(
      toPlayerTrack({ ...playable[0], authorUsername: profile.username }),
      playable.map((d) => toPlayerTrack({ ...d, authorUsername: profile.username })),
    );
  }

  function frame(id: StageModuleId, inner: ReactNode) {
    const index = order.indexOf(id);
    return (
      <StageModuleFrame
        key={id}
        id={id}
        arranging={layoutMode}
        empty={!occupied[id]}
        canMoveUp={index > 0 && !savingOrder}
        canMoveDown={index >= 0 && index < order.length - 1 && !savingOrder}
        hidden={hidden.includes(id)}
        hideDisabled={savingOrder}
        onMoveUp={() => void commitOrder(moveStageModule(order, id, -1))}
        onMoveDown={() => void commitOrder(moveStageModule(order, id, 1))}
        onDropOn={(fromId) => void commitOrder(dropStageModule(order, fromId, id))}
        onToggleHidden={() => void commitHidden(toggleHiddenModule(hidden, id))}
      >
        {inner}
      </StageModuleFrame>
    );
  }

  const workOpenAuthor = ownerUi ? () => navigate("/") : undefined;

  return (
    <div className="no-scrollbar h-full overflow-y-auto bg-ink-950 text-white" style={accentWashStyle(cosmetics.accent)}>
      {showLiveBanner ? (
        <ProfileLiveStage
          ref={liveStageRef}
          night={liveNow}
          hostId={id}
          displayName={profile.displayName || profile.username || "Host"}
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          cosmetics={cosmetics}
          isOwner={ownerUi && !previewAsVisitor}
          onSessionEnded={() => setLiveBannerDismissed(true)}
        >
          {visitorSocial ? (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              aria-label="Report user"
              className="pointer-events-auto mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass text-white/40 hover:text-white/70"
            >
              <Flag className="h-4 w-4" />
            </button>
          ) : null}
        </ProfileLiveStage>
      ) : (
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
          <div className="relative z-[2] flex h-full flex-col justify-end px-4 pb-6 sm:px-8">
            <div className="flex items-end gap-4">
              <span className="relative shrink-0">
                <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
                  <Avatar url={profile.avatarUrl} name={profile.username} id={id} size="xl" square />
                </CosmeticAvatarShell>
              </span>
              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex flex-wrap items-center gap-2">
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
              {visitorSocial && (
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
      )}

      {previewAsVisitor ? (
        <div
          className="flex items-center justify-between gap-3 border-b border-cyan-200/15 bg-cyan-950/40 px-4 py-2 sm:px-8"
          data-testid="profile-visitor-preview"
        >
          <p className="text-[12px] text-cyan-100/80">Viewing as a visitor</p>
          <button
            type="button"
            onClick={onExitVisitorPreview}
            data-testid="profile-exit-visitor-preview"
            className="text-[12px] font-medium text-cyan-100 hover:text-white"
          >
            Back to owner
          </button>
        </div>
      ) : null}

      {ownerUi && !previewAsVisitor ? <ProfileOwnerPulse /> : null}

      <ProfileLiveStickyBar
        visible={showLiveBanner && liveSticky}
        displayName={profile.displayName || profile.username || "Host"}
        isOwner={ownerUi && !previewAsVisitor}
        onReturn={scrollToLiveStage}
      />

      <div className="sticky top-0 z-20 border-b border-white/8 bg-ink-950/80 px-4 py-2.5 backdrop-blur-xl sm:px-8">
        <div className="flex flex-wrap gap-2">
          {showLiveBanner ? (
            liveSticky ? (
              <button
                type="button"
                onClick={scrollToLiveStage}
                className="btn btn-primary h-10 flex-1 py-0 text-xs sm:flex-none sm:px-5"
                aria-label={
                  ownerUi && !previewAsVisitor
                    ? "Return to your live stream"
                    : `Return to ${profile.displayName || profile.username || "creator"}'s live stream`
                }
              >
                <Radio className="h-3.5 w-3.5" /> Return to live
              </button>
            ) : (
              <span
                role="status"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-wild/30 bg-wild/10 px-4 text-xs font-medium text-white sm:flex-none"
              >
                <Radio className="h-3.5 w-3.5" aria-hidden />
                {ownerUi && !previewAsVisitor ? "Live now" : "Live session playing"}
              </span>
            )
          ) : playable.length > 0 ? (
            <button type="button" onClick={playAll} className="btn btn-primary h-10 flex-1 py-0 text-xs sm:flex-none sm:px-5">
              Listen · {playable.length}
            </button>
          ) : null}
          {visitorSocial && (
            <>
              <button type="button" disabled={!!busy || requested} onClick={onConnect} data-testid="profile-connect" className="btn btn-ghost h-10 flex-1 py-0 text-xs disabled:opacity-40 sm:flex-none sm:px-4">
                {busy === "connect" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
                {requested ? "Request sent" : "Connect"}
              </button>
              <FollowButton creatorId={id} />
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
          {ownerUi && (
            <>
              <button type="button" onClick={() => navigate("/library")} className="btn btn-ghost h-10 px-4 py-0 text-xs">
                Library
              </button>
              {!showLiveBanner ? (
                <button type="button" onClick={() => navigate("/live")} className="btn btn-ghost h-10 px-4 py-0 text-xs">
                  <Radio className="h-3.5 w-3.5" /> Go live
                </button>
              ) : null}
              <button type="button" onClick={() => navigate("/profile/edit")} className="btn btn-ghost h-10 px-4 py-0 text-xs">
                Edit profile
              </button>
              <button
                type="button"
                aria-pressed={arranging}
                disabled={savingOrder}
                onClick={() => setArranging((v) => !v)}
                data-testid="profile-arrange-modules"
                className="btn btn-ghost h-10 px-4 py-0 text-xs"
              >
                {arranging ? "Done" : "Arrange"}
              </button>
              <button
                type="button"
                onClick={onViewAsVisitor}
                data-testid="profile-view-as-visitor"
                className="btn btn-ghost h-10 px-4 py-0 text-xs"
              >
                View as visitor
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-8 lg:grid-flow-dense lg:grid-cols-12">
        {ownerUi && nights.length === 0 && featuredWorks.length === 0 && restWorks.length === 0 && !arranging ? (
          <div className="space-y-3 lg:col-span-12" data-testid="profile-owner-empty">
            <p className="text-sm text-white/45">
              This is your VYBZ. Place work from Library when you want — it stays one file.
              Public work is heard when it is placed, not when it is indexed on this device.
            </p>
            <button
              type="button"
              onClick={() => navigate("/library")}
              className="btn btn-ghost h-10 px-4 py-0 text-xs"
            >
              Open Library
            </button>
          </div>
        ) : null}

        {shown.map((moduleId) => {
          if (moduleId === "stage") {
            return frame(
              "stage",
              <>
                <p className="eyebrow mb-3">{ownerUi ? "Your stage" : "On the stage"}</p>
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
              </>,
            );
          }

          if (moduleId === "featured") {
            return frame(
              "featured",
              <>
                <p className="eyebrow mb-3">Featured</p>
                {featuredWorks.length > 0 ? (
                  <WorkGrid
                    works={featuredWorks}
                    drops={drops}
                    username={profile.username}
                    sessionLinks={sessionLinks}
                    onOpenAuthor={workOpenAuthor}
                  />
                ) : (
                  <p className="text-sm text-white/40">Place a work from Library as Featured.</p>
                )}
              </>,
            );
          }

          if (moduleId === "works") {
            return frame(
              "works",
              <>
                <p className="eyebrow mb-3">Works</p>
                {restWorks.length > 0 ? (
                  <WorkGrid
                    works={restWorks}
                    drops={drops}
                    username={profile.username}
                    sessionLinks={sessionLinks}
                    onOpenAuthor={workOpenAuthor}
                  />
                ) : (
                  <p className="text-sm text-white/40">No works on this module yet.</p>
                )}
              </>,
            );
          }

          if (moduleId === "story") {
            return frame(
              "story",
              <>
                <p className="eyebrow mb-3">Story</p>
                {bio || f.genres?.length ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-sm text-white/40">No story yet.</p>
                )}
              </>,
            );
          }

          if (moduleId === "packs") {
            return frame(
              "packs",
              <>
                <p className="eyebrow mb-3">Packs</p>
                {packs.length > 0 ? (
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
                ) : (
                  <p className="text-sm text-white/40">No packs yet.</p>
                )}
              </>,
            );
          }

          if (moduleId === "measured") {
            return frame(
              "measured",
              <>
                <p className="eyebrow mb-3">Measured</p>
                {measuredCells.length > 0 ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-sm text-white/40">Nothing measured yet.</p>
                )}
              </>,
            );
          }

          if (moduleId === "credits") {
            return frame(
              "credits",
              <Discography credits={credits} isOwner={ownerUi} />,
            );
          }

          return frame(
            "links",
            <details className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-2">
              <summary className="cursor-pointer text-[12px] text-white/35">More</summary>
              <div className="mt-3 space-y-6">
                <ArtistRoster userId={id} editable={ownerUi} drops={drops} />
                <AffiliateLinks userId={id} editable={ownerUi} />
              </div>
            </details>,
          );
        })}
      </div>

      {visitorSocial && (
        <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-8 lg:grid lg:grid-cols-12">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:col-span-5 lg:col-start-8">
            <p className="eyebrow mb-2">Book a session</p>
            <p className="mb-3 text-[13px] text-white/45">
              Opens a message. Tell them when you want to work — this is not a calendar.
            </p>
            <button type="button" disabled={!!busy} onClick={onBook} className="btn btn-primary h-10 w-full py-0 text-xs">
              {busy === "book" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              Message to book
            </button>
          </section>
        </div>
      )}

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

function WorkGrid({
  works,
  drops,
  username,
  sessionLinks,
  onOpenAuthor,
}: {
  works: StageWork[];
  drops: Drop[];
  username: string | null;
  sessionLinks: WorkSessionLink[];
  onOpenAuthor?: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {works.map((work) => (
        <div
          key={work.id}
          className={
            work.kind === "audio" || work.kind === "video" || work.kind === "collection"
              ? "sm:col-span-2"
              : undefined
          }
        >
          <WorkCard
            work={work}
            audioQueue={drops.map((d) => ({ ...d, authorUsername: username }))}
            sessionLinks={sessionLinks}
            onOpenAuthor={onOpenAuthor}
          />
        </div>
      ))}
    </div>
  );
}
