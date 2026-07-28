import { useCallback, useEffect, useState } from "react";
import { Headphones, Loader2, Radio, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { TrackCard } from "@/components/TrackCard";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { loadForYouIntoPlayer } from "@/lib/playerMusic";
import { formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";
import type { LiveSessionCard } from "@/types";
import type { DiscoveryDrop } from "@/lib/api";

/**
 * Music Hub home — live streams + trending tracks (Spotify × Twitch energy).
 */
export function DashHubPanel({
  onListenMore,
  onLiveMore,
}: {
  onListenMore?: () => void;
  onLiveMore?: () => void;
}) {
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const [live, setLive] = useState<LiveSessionCard[]>([]);
  const [tracks, setTracks] = useState<DiscoveryDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [forYouBusy, setForYouBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sessions, drops] = await Promise.all([
      api.listLiveSessions(12),
      api.listDiscovery(Date.now() % 1e9, 16),
    ]);
    setLive(sessions);
    setTracks(drops.filter((d) => d.authorId !== userId && d.audioUrl).slice(0, 12));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[rgb(var(--neon-cyan)/0.12)] via-ink-900/80 to-[rgb(var(--neon-mint)/0.08)] p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgb(var(--neon-cyan)/0.2)] blur-3xl" />
        <p className="font-display text-xs uppercase tracking-[0.28em] text-cyan-200/70">VYBZ Hub</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">Find Yours</h2>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">
          Upload like SoundCloud. Stream like Spotify. Go live like Twitch — then tip with Vc.
          Late-night listening, emerging artists, and fans meeting creators in real time.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={forYouBusy || !userId}
            onClick={() => {
              void (async () => {
                setForYouBusy(true);
                const n = await loadForYouIntoPlayer();
                setForYouBusy(false);
                if (!n) showToast("For You needs more listens — discover tracks first");
                else showToast(`For You · ${n} in VDock`);
              })();
            }}
            className="btn btn-primary h-9 px-3 text-xs disabled:opacity-40"
          >
            {forYouBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            For You
          </button>
          <button type="button" onClick={onListenMore} className="btn btn-ghost h-9 px-3 text-xs">
            <Headphones className="h-3.5 w-3.5" /> Discover
          </button>
          <button type="button" onClick={onLiveMore} className="btn btn-ghost h-9 px-3 text-xs">
            <Radio className="h-3.5 w-3.5" /> Live now
          </button>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-wild" /> Live now</p>
          <button type="button" onClick={onLiveMore} className="text-[11px] font-semibold text-cyan-200/80 hover:text-white">See all</button>
        </div>
        {live.length === 0 ? (
          <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/40">
            No one is live — be the first to flip the stream.
          </p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {live.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/live/${s.id}`)}
                  className={cx(
                    "flex w-40 flex-col gap-2 rounded-2xl border border-wild/30 bg-wild/10 p-3 text-left",
                    "ring-1 ring-wild/20 transition active:scale-[0.98]",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Avatar url={s.avatarUrl} name={s.username} id={s.hostId} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[11px] text-cyan-100">{formatVcAddress(s.username)}</span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-wild">Live</span>
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[12px] font-medium text-white/85">{s.title || "Live session"}</span>
                  <span className="text-[10px] text-white/40">{s.viewerCount} watching</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-cyan-300" /> Trending & fresh</p>
          <button type="button" onClick={onListenMore} className="text-[11px] font-semibold text-cyan-200/80 hover:text-white">Listen more</button>
        </div>
        {tracks.length === 0 ? (
          <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-cyan-200/40" />
            Uploads will light up here — drop a track to start the wave.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tracks.map((d) => (
              <TrackCard key={d.id} compact drop={d} queue={tracks} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
