import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Music2, ScanLine } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { AlbumLightbox } from "@/components/home/AlbumLightbox";
import { ForgeAtmosphere } from "@/components/ForgeAtmosphere";
import { ProfessionBadges } from "@/components/ProfessionBadges";
import { ProBadge } from "@/components/ProBadge";
import { RoleClassBadge } from "@/components/RoleClassBadge";
import { Flair, CosmeticAvatarShell, useResolvedCosmetics } from "@/lib/cosmetics";
import { groupDrops, type DropGroup } from "@/lib/libraryQuery";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { paletteFor, cx } from "@/lib/utils";
import type { Drop } from "@/types";

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

/**
 * Signed-in Home — artist profile + album/media library.
 * Replaces CommandDashboard “Where things stand” as the default hub.
 */
export function ArtistHome() {
  const { profile, userId } = useSession();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAlbum, setOpenAlbum] = useState<DropGroup | null>(null);
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  const facets = profile?.profile ?? {};

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    api.dropsBy(userId, 120).then((d) => {
      if (!cancelled) {
        setDrops(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const albums = useMemo(() => groupDrops(drops, "album"), [drops]);

  if (!profile) return null;

  return (
    <div className="relative space-y-6 pb-4 pt-1">
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
            <div className="flex flex-wrap items-center gap-2">
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
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                {drops.length} track{drops.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                {albums.length} release{albums.length === 1 ? "" : "s"}
              </span>
              <Link
                to="/releases"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.1)] px-2.5 py-1 text-white/80 transition hover:border-[rgb(var(--accent-rgb)/0.55)] hover:text-white"
              >
                <ScanLine className="h-3 w-3" /> Prepare a release
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-[1]">
        <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Catalog</p>
            <h2 className="font-display text-lg font-semibold text-white">Your releases</h2>
          </div>
          <Link to="/library" className="text-[12px] text-white/45 transition hover:text-white/80">
            Open library
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : albums.length === 0 ? (
          <div className="forge-glass forge-plasma relative flex flex-col items-center gap-3 !rounded-2xl px-6 py-14 text-center">
            <span className="forge-glass-edge pointer-events-none" aria-hidden />
            <Music2 className="relative z-[1] h-8 w-8 text-suite-cyan/70" strokeWidth={1.5} />
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

      {openAlbum ? (
        <AlbumLightbox
          group={openAlbum}
          onClose={() => setOpenAlbum(null)}
          onChanged={() => {
            if (!userId) return;
            void api.dropsBy(userId, 120).then(setDrops);
          }}
        />
      ) : null}
    </div>
  );
}
