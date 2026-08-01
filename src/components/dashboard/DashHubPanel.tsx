import { useCallback, useEffect, useState } from "react";
import { Loader2, Radio, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { TrackCard } from "@/components/TrackCard";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { formatVcAddress } from "@/lib/vc";
import type { LiveSessionCard } from "@/types";
import type { DiscoveryDrop } from "@/lib/api";

/** Lean hub — live rail + fresh drops. */
export function DashHubPanel({
  onListenMore,
  onLiveMore,
}: {
  onListenMore?: () => void;
  onLiveMore?: () => void;
}) {
  const navigate = useNavigate();
  const { userId } = useSession();
  const [live, setLive] = useState<LiveSessionCard[]>([]);
  const [tracks, setTracks] = useState<DiscoveryDrop[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sessions, drops] = await Promise.all([
      api.listLiveSessions(12),
      api.listDiscovery(Date.now() % 1e9, 16),
    ]);
    setLive(sessions);
    setTracks(drops.filter((d) => !!d.audioUrl).slice(0, 12));
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" /></div>;
  }

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="nexus-eyebrow flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" /> Live</p>
          <button type="button" onClick={onLiveMore} className="text-[11px] font-semibold text-cyan-200/80 hover:text-white">All</button>
        </div>
        {live.length === 0 ? (
          <p className="forge-card text-center text-sm text-white/40">Nobody live yet.</p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {live.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/live/${s.id}`)}
                  className="forge-card flex w-36 flex-col gap-2 !p-3 text-left active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <Avatar url={s.avatarUrl} name={s.username} id={s.hostId} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[11px] text-cyan-100">{formatVcAddress(s.username)}</span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-wild">Live</span>
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[12px] font-medium text-white/85">{s.title || "Live session"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="nexus-eyebrow flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Fresh</p>
          <button type="button" onClick={onListenMore} className="text-[11px] font-semibold text-cyan-200/80 hover:text-white">More</button>
        </div>
        {tracks.length === 0 ? (
          <p className="forge-card py-8 text-center text-sm text-white/40">
            Drop a track to start the wave.
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
