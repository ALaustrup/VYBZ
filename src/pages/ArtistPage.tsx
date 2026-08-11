import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Loader2, Users } from "lucide-react";
import * as api from "@/lib/api";
import { TrackCard } from "@/components/TrackCard";
import { Avatar } from "@/components/Avatar";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import type { ArtistProfile, Drop } from "@/types";

export function ArtistPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [members, setMembers] = useState<{ userId: string; role: string; username: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const a = await api.getArtistBySlug(slug);
      if (cancelled) return;
      if (!a) { setArtist(null); setLoading(false); return; }
      const [d, m] = await Promise.all([api.dropsForArtist(a.id, 40), api.artistMembers(a.id)]);
      if (cancelled) return;
      setArtist(a); setDrops(d); setMembers(m); setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useRegisterAppBar({
    title: artist?.displayName || "Artist",
    subtitle: artist ? `/artist/${artist.slug}` : undefined,
  }, [artist?.displayName, artist?.slug]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (!artist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-white/50">Artist not found.</p>
        <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">Go back</button>
      </div>
    );
  }

  const owners = members.filter((m) => m.role === "owner" || m.role === "manager");

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-4 pt-1.5" data-testid="artist-page">
      {artist.coverUrl ? (
        <div
          className="relative mb-3 h-36 w-full overflow-hidden rounded-2xl border border-white/10 sm:h-44"
          data-testid="artist-cover"
        >
          <img
            src={artist.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/25 to-transparent"
          />
          <div className="absolute bottom-3 left-3 right-3 flex items-end gap-3">
            <Avatar url={artist.avatarUrl} name={artist.displayName} id={artist.id} size="lg" square />
            <div className="min-w-0 flex-1 pb-0.5">
              <p className="truncate font-display text-lg font-semibold text-white">{artist.displayName}</p>
              {artist.primaryGenres.length > 0 && (
                <p className="truncate text-[12px] text-white/55">{artist.primaryGenres.join(" · ")}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-start gap-3">
          <Avatar url={artist.avatarUrl} name={artist.displayName} id={artist.id} size="lg" square />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {artist.verifiedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-veil-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-veil-100">
                  <BadgeCheck className="h-3 w-3" /> Official
                </span>
              )}
              {artist.primaryGenres.length > 0 && (
                <p className="text-[12px] text-white/50">{artist.primaryGenres.join(" · ")}</p>
              )}
            </div>
            {artist.bio && <p className="mt-1.5 text-sm leading-relaxed text-white/65">{artist.bio}</p>}
          </div>
        </div>
      )}

      {artist.coverUrl && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {artist.verifiedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-veil-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-veil-100">
              <BadgeCheck className="h-3 w-3" /> Official
            </span>
          )}
          {artist.bio && <p className="w-full text-sm leading-relaxed text-white/65">{artist.bio}</p>}
        </div>
      )}

      {owners.length > 0 && (
        <div className="mb-4">
          <p className="eyebrow mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Linked accounts</p>
          <div className="flex flex-wrap gap-1.5">
            {owners.map((m) => (
              <button key={m.userId} type="button" onClick={() => navigate(`/u/${m.userId}`)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[12px] font-medium text-white/70 hover:text-white">
                @{m.username || "creator"} · {m.role}
              </button>
            ))}
          </div>
        </div>
      )}

      {drops.length > 0 ? (
        <>
          <p className="eyebrow mb-2">Catalog</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {drops.map((d) => (
              <TrackCard
                key={d.id}
                compact
                drop={{ ...d, authorUsername: d.creditedArtist || d.authorUsername }}
                queue={drops}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="text-[13px] text-white/40">No linked drops yet.</p>
      )}
    </div>
  );
}
