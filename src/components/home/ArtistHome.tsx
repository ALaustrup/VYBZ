import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Music2,
  Pause,
  Play,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Waves,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { AlbumLightbox } from "@/components/home/AlbumLightbox";
import { ForgeAtmosphere } from "@/components/ForgeAtmosphere";
import { ProfessionBadges } from "@/components/ProfessionBadges";
import { ProBadge } from "@/components/ProBadge";
import { RoleClassBadge } from "@/components/RoleClassBadge";
import { Flair, CosmeticAvatarShell, useResolvedCosmetics } from "@/lib/cosmetics";
import { groupDrops, type DropGroup } from "@/lib/libraryQuery";
import {
  buildActionItems,
  buildStats,
  type ActionItem,
  type ActionSeverity,
  type DashboardStats,
} from "@/lib/dashboardModel";
import { isPlayableMediaUrl, playTrack, toggle, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { myListenSummary, type ListenSummary } from "@/features/reception/listenApi";
import { getPrepareOwnerId, getReleaseBundle, listReleases } from "@/features/prepare/service";
import { nextDeskStepsFromFindings } from "@/features/prepare/nextDeskFromFindings";
import { WhatNextDesks } from "@/features/prepare/WhatNextDesks";
import type { FindingLike } from "@/features/prepare/analyzerReady";
import { useSession } from "@/store/session";
import { paletteFor, cx } from "@/lib/utils";
import type { ReleaseProject } from "@vybz/domain/releases";
import type { StorefrontOrder } from "@/features/storefront/types";
import type { Drop } from "@/types";
import type { NextDeskStep } from "@/features/prepare/nextDeskFromFindings";

const SEVERITY_STYLE: Record<ActionSeverity, { icon: typeof AlertTriangle; tone: string }> = {
  blocking: { icon: AlertTriangle, tone: "text-suite-danger" },
  attention: { icon: Info, tone: "text-suite-warning" },
  suggestion: { icon: Sparkles, tone: "text-[rgb(var(--app-accent-rgb))]" },
};

function albumCover(group: DropGroup): string | null {
  for (const d of group.drops) {
    const url = d.playbackCustomization?.backdropUrl;
    if (url) return url;
  }
  return null;
}

function AlbumTile({
  group,
  onOpen,
}: {
  group: DropGroup;
  onOpen: () => void;
}) {
  const cover = albumCover(group);
  const seed = group.drops[0]?.seed ?? 1;
  const [c0, c1] = paletteFor(seed);
  const monogram = (group.label || "S").slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "group forge-glass relative aspect-square w-full overflow-hidden !rounded-xl p-0 text-left",
        "transition duration-200 hover:-translate-y-0.5 hover:border-white/20",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
      aria-label={`${group.label}, ${group.drops.length} tracks`}
    >
      {cover ? (
        <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-95" />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${c0}55 0%, #05070c 55%, ${c1}40 100%)`,
          }}
          aria-hidden
        >
          <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-semibold text-white/25">
            {monogram}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="truncate font-display text-[14px] font-semibold text-white">{group.label}</p>
        <p className="mt-0.5 text-[11px] text-white/50">
          {group.drops.length} track{group.drops.length === 1 ? "" : "s"}
        </p>
      </div>
    </button>
  );
}

function OpsStatStrip({
  stats,
  onNavigate,
}: {
  stats: DashboardStats;
  onNavigate: (to: string) => void;
}) {
  const cells: Array<{ label: string; value: number; to: string; tone?: string }> = [
    { label: "Tracks", value: stats.tracks, to: "/library" },
    { label: "Analyzer", value: stats.releases, to: "/releases" },
    { label: "Ready", value: stats.releasesReady, to: "/releases", tone: "text-suite-success" },
    {
      label: "Blocked",
      value: stats.releasesBlocked,
      to: "/releases",
      tone: stats.releasesBlocked > 0 ? "text-suite-danger" : undefined,
    },
    { label: "Draft", value: stats.releasesDraft, to: "/releases" },
  ];
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="ops-home-stats">
      {cells.map((c) => (
        <li key={c.label}>
          <button
            type="button"
            onClick={() => onNavigate(c.to)}
            className="forge-glass forge-plasma relative w-full !rounded-xl !p-3 text-left transition hover:-translate-y-0.5 hover:border-[rgb(var(--app-accent-rgb)/0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--app-accent-rgb)/0.55)] active:scale-[0.985] motion-reduce:hover:translate-y-0"
          >
            <span className="forge-glass-edge pointer-events-none" aria-hidden />
            <span
              className={cx(
                "relative z-[1] block font-display text-xl font-semibold tabular-nums",
                c.tone ?? "text-white",
              )}
            >
              {c.value}
            </span>
            <span className="relative z-[1] block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
              {c.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function OpsActionCentre({
  items,
  onNavigate,
}: {
  items: ActionItem[];
  onNavigate: (to: string) => void;
}) {
  return (
    <section data-testid="ops-home-actions">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        Needs attention
      </p>
      {items.length === 0 ? (
        <div className="forge-glass relative flex items-center gap-3 !rounded-xl !py-4 px-4">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <CheckCircle2 className="relative z-[1] h-5 w-5 shrink-0 text-suite-success" />
          <p className="relative z-[1] text-sm text-white/55">
            Nothing outstanding. No blocking release findings from your measured projects.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item) => {
            const style = SEVERITY_STYLE[item.severity];
            const Icon = style.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  data-testid={`ops-action-${item.id}`}
                  className="forge-glass relative flex w-full items-start gap-3 !rounded-xl p-3.5 text-left transition hover:border-white/20"
                >
                  <span className="forge-glass-edge pointer-events-none" aria-hidden />
                  <Icon className={cx("relative z-[1] mt-0.5 h-4 w-4 shrink-0", style.tone)} />
                  <span className="relative z-[1] min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white/90">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-white/45">
                      {item.detail}
                    </span>
                  </span>
                  <span className="relative z-[1] mt-0.5 flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[rgb(var(--app-accent-rgb))]">
                    {item.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecentTrackRow({
  drop,
  queue,
}: {
  drop: Drop;
  queue: Drop[];
}) {
  const player = usePlayer();
  const navigate = useNavigate();
  const isCurrent = player.track?.id === drop.id;
  const isPlaying = isCurrent && player.playing;
  const playable = isPlayableMediaUrl(drop.audioUrl);
  const credit =
    drop.creditedArtist?.trim() || drop.authorUsername?.trim() || "Creator";

  return (
    <li className="forge-glass relative flex items-center gap-2 !rounded-xl px-3 py-2.5">
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <button
        type="button"
        disabled={!playable}
        onClick={() => {
          if (isCurrent) toggle();
          else playTrack(toPlayerTrack(drop), queue.map(toPlayerTrack));
        }}
        className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/30 text-white transition hover:border-[rgb(var(--app-accent-rgb)/0.45)] disabled:opacity-35"
        aria-label={isPlaying ? `Pause ${drop.title || "track"}` : `Play ${drop.title || "track"} in VDock`}
        data-testid={`ops-track-play-${drop.id}`}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
      </button>
      <div className="relative z-[1] min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/90">{drop.title?.trim() || "Untitled"}</p>
        <p className="truncate text-[11px] text-white/40">
          {credit}
          {!drop.assetId ? " · no file" : ""}
        </p>
      </div>
      <div className="relative z-[1] flex shrink-0 gap-1">
        <button
          type="button"
          title="Analyze"
          aria-label={`Analyze ${drop.title || "track"}`}
          onClick={() => navigate("/releases")}
          className="forge-chip !min-h-8 !min-w-8 !h-8 !w-8"
        >
          <Waves className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Correct"
          aria-label={`Correct ${drop.title || "track"}`}
          onClick={() => navigate("/tools/correct")}
          className="forge-chip !min-h-8 !min-w-8 !h-8 !w-8"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
        <Link
          to={`/track/${drop.id}`}
          title="Open track"
          className="forge-chip !min-h-8 !min-w-8 !h-8 !w-8"
          aria-label={`Open ${drop.title || "track"}`}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  );
}

/**
 * Reception counters for your own dashboard.
 *
 * This used to show "Vybs" — a reaction tally that was almost always zero and
 * said nothing about whether anyone heard the work. It now reports measured
 * listening: people who actually played something, and how many reached the end.
 *
 * Owner-only by construction: this is your hub, not a public profile, so it is
 * private reception rather than social proof.
 */
function SocialStats({ drops }: { drops: Drop[] }) {
  const [summary, setSummary] = useState<ListenSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await myListenSummary();
      if (!cancelled) setSummary(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [drops.length]);

  const items = [
    { label: "Tracks", value: String(drops.length) },
    // Null until the summary loads; a dash beats a zero that might be wrong.
    { label: "Listeners", value: summary ? summary.listeners.toLocaleString() : "—" },
    { label: "Finished", value: summary ? summary.finished.toLocaleString() : "—" },
  ];

  return (
    <div className="flex flex-wrap gap-2" data-testid="social-stats">
      {items.map((s) => (
        <div
          key={s.label}
          className="forge-card flex min-w-[6.5rem] flex-1 flex-col !p-3"
        >
          <span className="font-display text-xl font-semibold tabular-nums text-white">
            {s.value}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * The profile song. A creator's page opens with the track they want you to hear —
 * the one moment of the old profile-page web worth keeping.
 */
function ProfileSong({ drop }: { drop: Drop }) {
  const player = usePlayer();
  const isThis = player.track?.id === drop.id;
  const playing = isThis && player.playing;
  const playable = isPlayableMediaUrl(drop.audioUrl);

  return (
    <section
      className="forge-glass forge-plasma relative overflow-hidden !rounded-2xl p-4 sm:p-5"
      data-testid="profile-song"
    >
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <div className="relative z-[1] flex items-center gap-4">
        <button
          type="button"
          disabled={!playable}
          onClick={() => (isThis ? void toggle() : playTrack(toPlayerTrack(drop)))}
          aria-label={playing ? `Pause ${drop.title ?? "track"}` : `Play ${drop.title ?? "track"}`}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-[rgb(var(--app-accent-rgb)/0.45)] bg-[rgb(var(--app-accent-rgb)/0.14)] text-white transition hover:bg-[rgb(var(--app-accent-rgb)/0.22)] disabled:opacity-40"
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-[2px]" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--app-accent-rgb)/0.7)]">
            Profile song
          </p>
          <p className="truncate font-display text-lg font-semibold text-white">
            {drop.title?.trim() || "Untitled"}
          </p>
          <p className="truncate text-[12px] text-white/45">
            {drop.creditedArtist || drop.authorUsername || "You"}
            {drop.plays ? ` · ${drop.plays.toLocaleString()} plays` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Signed-in Home — the creator's own page.
 *
 * VYBZ is a social platform for music, audio and sound, so this reads as a profile
 * first: who you are, the track you want heard, your catalogue. The production
 * tooling is still here and still measured, but it sits below the fold in Studio
 * rather than framing the page. Every figure comes from dashboardModel /
 * listReleases / drops (Law 1).
 */
export function ArtistHome() {
  const navigate = useNavigate();
  const { profile, userId } = useSession();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [releases, setReleases] = useState<ReleaseProject[]>([]);
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [whatNext, setWhatNext] = useState<NextDeskStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAlbum, setOpenAlbum] = useState<DropGroup | null>(null);
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  const facets = profile?.profile ?? {};

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const ownerId = getPrepareOwnerId(userId);
    const [myDrops, myReleases, myOrders] = await Promise.all([
      api.dropsBy(userId, 120).catch(() => [] as Drop[]),
      listReleases(ownerId).catch(() => [] as ReleaseProject[]),
      FLAGS.storefront
        ? api.listMyStorefrontOrders().catch(() => [] as StorefrontOrder[])
        : Promise.resolve([] as StorefrontOrder[]),
    ]);
    setDrops(myDrops);
    setReleases(myReleases);
    setOrders(myOrders);

    // Measured What-next from open findings on a few drafts/blocked releases (Law 1 codes only).
    const focus = myReleases
      .filter((r) => r.status === "draft" || r.status === "blocked")
      .slice(0, 3);
    const bundles = await Promise.all(
      focus.map((r) => getReleaseBundle(ownerId, r.id).catch(() => null)),
    );
    const findings: FindingLike[] = [];
    let releaseId: string | null = null;
    for (const b of bundles) {
      if (!b?.findings?.length) continue;
      if (!releaseId) releaseId = b.project.id;
      for (const f of b.findings) findings.push(f);
    }
    setWhatNext(nextDeskStepsFromFindings(findings, { releaseId, limit: 5 }));

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const albums = useMemo(() => groupDrops(drops, "album"), [drops]);
  const stats = useMemo(() => buildStats(drops, releases), [drops, releases]);
  const actions = useMemo(
    () => buildActionItems({ drops, releases, orders }),
    [drops, releases, orders],
  );
  const recentTracks = useMemo(
    () => [...drops].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    [drops],
  );
  const profileSong = useMemo(
    () => drops.find((d) => d.id === profile?.featuredDropId) ?? null,
    [drops, profile?.featuredDropId],
  );

  if (!profile) return null;

  return (
    <div className="relative space-y-6 pb-4 pt-1" data-testid="ops-home">
      <div className="pointer-events-none absolute inset-x-0 -top-2 h-[22rem] overflow-hidden rounded-[1.5rem]">
        <ForgeAtmosphere intensity="subtle" wave />
      </div>

      <header className="forge-glass forge-plasma relative overflow-hidden !rounded-2xl p-5 sm:p-6">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <div className="relative z-[2] flex flex-wrap items-start gap-4">
          <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
            <Avatar url={profile.avatarUrl} name={profile.username} id={profile.id} size="lg" square />
          </CosmeticAvatarShell>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--app-accent-rgb)/0.65)]">
              Your page
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {profile.displayName?.trim() || profile.username || "Artist"}
              </h1>
              <Flair data={cosmetics.flair} />
              <ProfessionBadges primary={facets.profession} all={facets.professions} />
              <RoleClassBadge roleClass={facets.roleClass} />
              <ProBadge profile={facets} />
            </div>
            {profile.username ? (
              <p className="mt-1 font-mono text-[13px] text-white/45">@{profile.username}</p>
            ) : null}
            {profile.bio ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">{profile.bio}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/40">
              <Link
                to="/library"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--app-accent-rgb)/0.35)] bg-[rgb(var(--app-accent-rgb)/0.1)] px-2.5 py-1 text-white/80 transition hover:border-[rgb(var(--app-accent-rgb)/0.55)] hover:text-white"
              >
                <Music2 className="h-3 w-3" /> Your library
              </Link>
              <Link
                to="/profile/edit"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-white/70 transition hover:border-white/25 hover:text-white"
              >
                <Sparkles className="h-3 w-3" /> Customise page
              </Link>
              <Link
                to="/discover"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-white/70 transition hover:border-white/25 hover:text-white"
              >
                Discover
              </Link>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-10" data-testid="ops-home-loading">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : (
        <>
          <SocialStats drops={drops} />
          {profileSong ? <ProfileSong drop={profileSong} /> : null}

          {recentTracks.length > 0 ? (
            <section data-testid="ops-home-recent">
              <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Recent tracks
                  </p>
                  <h2 className="font-display text-lg font-semibold text-white">Quick actions</h2>
                </div>
                <Link to="/library" className="text-[12px] text-white/45 transition hover:text-white/80">
                  All tracks
                </Link>
              </div>
              <ul className="space-y-1.5">
                {recentTracks.map((d) => (
                  <RecentTrackRow key={d.id} drop={d} queue={recentTracks} />
                ))}
              </ul>
            </section>
          ) : null}

          <section className="relative z-[1]" data-testid="ops-home-catalog">
            <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Library
                </p>
                <h2 className="font-display text-lg font-semibold text-white">Your music</h2>
              </div>
              <Link to="/library" className="text-[12px] text-white/45 transition hover:text-white/80">
                Open library
              </Link>
            </div>

            {albums.length === 0 ? (
              <div className="forge-glass forge-plasma relative flex flex-col items-center gap-3 !rounded-2xl px-6 py-14 text-center">
                <span className="forge-glass-edge pointer-events-none" aria-hidden />
                <Music2 className="relative z-[1] h-8 w-8 text-[rgb(var(--app-accent-rgb)/0.75)]" strokeWidth={1.5} />
                <p className="relative z-[1] font-display text-base text-white/90">No releases yet</p>
                <p className="relative z-[1] max-w-sm text-sm text-white/45">
                  Upload tracks or run a readiness scan — albums group automatically from metadata.
                </p>
                <Link
                  to="/releases"
                  className="relative z-[1] mt-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.1]"
                >
                  Scan a track
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {albums.map((g) => (
                  <AlbumTile key={g.key} group={g} onOpen={() => setOpenAlbum(g)} />
                ))}
              </div>
            )}
          </section>

          {/* Studio — the production tooling is optional, so it sits below the
              creator's page rather than framing it. Nothing was removed. */}
          <section className="relative z-[1] space-y-3 pt-2" data-testid="ops-home-studio">
            <div className="flex items-end justify-between gap-3 px-0.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Optional
                </p>
                <h2 className="font-display text-base font-semibold text-white/70">Studio</h2>
              </div>
              <Link to="/releases" className="text-[12px] text-white/40 transition hover:text-white/75">
                <span className="inline-flex items-center gap-1.5">
                  <ScanLine className="h-3 w-3" /> Prepare a release
                </span>
              </Link>
            </div>
            <OpsStatStrip stats={stats} onNavigate={navigate} />
            {whatNext.length > 0 ? (
              <section className="forge-glass relative !rounded-2xl p-4 sm:p-5" data-testid="ops-home-what-next">
                <span className="forge-glass-edge pointer-events-none" aria-hidden />
                <WhatNextDesks steps={whatNext} title="What next" className="relative z-[1]" />
              </section>
            ) : null}
            <OpsActionCentre items={actions} onNavigate={navigate} />
          </section>
        </>
      )}

      {openAlbum ? (
        <AlbumLightbox
          group={openAlbum}
          onClose={() => setOpenAlbum(null)}
          onChanged={() => {
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
