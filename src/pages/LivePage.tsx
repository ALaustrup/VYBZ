import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Cable,
  Eye,
  Headphones,
  Loader2,
  Monitor,
  Radio,
  Sliders,
  Video,
  Volume2,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { GoLiveSheet } from "@/components/GoLiveSheet";
import { Avatar } from "@/components/Avatar";
import { LiveTileStage, liveSeedFromId } from "@/components/LiveTileStage";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import * as api from "@/lib/api";
import { cx, timeAgo } from "@/lib/utils";
import { isMusicSource } from "@/features/broadcast/liveSource";
import type { LiveSessionCard } from "@/types";

type FilterTab = "all" | "music" | "collab";

export function LivePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<LiveSessionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [goLive, setGoLive] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  useRegisterAppBar({
    title: "Live Mix",
    subtitle: "Real-time production & streaming",
    actions: (
      <button
        type="button"
        onClick={() => setGoLive(true)}
        className="cta-pill flex h-9 items-center gap-1.5 bg-gradient-to-r from-[rgb(var(--neon-cyan))] to-[rgb(var(--neon-mint))] text-black font-semibold shadow-glow px-4 text-xs"
      >
        <Radio className="h-3.5 w-3.5 animate-pulse" /> Go live
      </button>
    ),
  }, []);

  useEffect(() => {
    if (params.get("go") === "1") {
      setGoLive(true);
      params.delete("go");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const list = await api.listLiveSessions(40);
      if (alive) { setItems(list); setLoading(false); }
    };
    void load();
    const ch = api.subscribeLiveSessions(() => { void load(); });
    return () => { alive = false; api.unsubscribe(ch); };
  }, []);

  const filteredItems = items.filter((item) => {
    if (filter === "music") return isMusicSource(item.source);
    return true;
  });

  const totalListeners = items.reduce((acc, s) => acc + (s.viewerCount || 0), 0);

  return (
    <div className="flex h-full flex-col bg-ink-950/60">
      {/* Hero stage banner */}
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-wild animate-pulse" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-wild">
                Live Mix Radio & Sessions
              </span>
            </div>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
              Produce & Stream Live
            </h1>
            <p className="mt-0.5 text-xs text-white/50 max-w-xl">
              Low-latency stereo streaming for producers, live mix sessions, and listeners around the globe.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Live Sessions</p>
              <p className="text-base font-bold font-mono text-cyan-200">{items.length}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Listeners</p>
              <p className="text-base font-bold font-mono text-teal-300">{totalListeners}</p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.04] pt-3">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cx(
              "rounded-lg px-3 py-1 text-xs font-medium transition",
              filter === "all"
                ? "bg-white/10 text-white font-semibold shadow-inner"
                : "text-white/40 hover:text-white/70",
            )}
          >
            All Live ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("music")}
            className={cx(
              "rounded-lg px-3 py-1 text-xs font-medium transition flex items-center gap-1.5",
              filter === "music"
                ? "bg-white/10 text-cyan-200 font-semibold shadow-inner"
                : "text-white/40 hover:text-white/70",
            )}
          >
            <Headphones className="h-3 w-3" /> DAW / Mix Sessions
          </button>
          <button
            type="button"
            onClick={() => navigate("/library/mix")}
            className="ml-auto rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/60 hover:text-white hover:border-white/20 transition flex items-center gap-1"
          >
            <Sliders className="h-3 w-3" /> Mix Engine
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 sm:px-6 pb-8 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No live mix sessions active"
            body="Be the first to fire up your DAW and broadcast your sound in real time."
            action={
              <button
                type="button"
                onClick={() => setGoLive(true)}
                className="btn btn-primary mt-2 h-9 px-4 text-xs font-semibold"
              >
                <Radio className="h-3.5 w-3.5 mr-1" /> Start Live Mix
              </button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/live/${s.id}`)}
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                className="broadcast-bezel reveal group relative overflow-hidden mat-surface text-left transition hover:border-veil-400/40 hover:scale-[1.01] active:scale-[0.99] rounded-2xl border border-white/8 bg-ink-900/60 backdrop-blur-md"
              >
                <div className="relative min-h-[7.5rem] p-4 flex flex-col justify-between">
                  <LiveTileStage seed={liveSeedFromId(s.hostId)} />
                  
                  <div className="relative z-[1] flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar url={s.avatarUrl} name={s.username || s.displayName} id={s.hostId} size="md" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-wild ring-2 ring-ink-950 animate-ping" />
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-wild ring-2 ring-ink-950" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display text-[15px] font-semibold text-white group-hover:text-cyan-100 transition">
                          {s.username || s.displayName || "Creator"}
                        </p>
                        <SourceBadge source={s.source} />
                      </div>
                      <p className="truncate text-[13px] text-white/65 font-medium mt-0.5">
                        {s.title || s.intent || s.roleLabel || "Live Production Session"}
                      </p>
                    </div>
                  </div>

                  <div className="relative z-[1] mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[11px] text-white/45">
                    <span className="flex items-center gap-1.5 font-mono text-cyan-200">
                      <Eye className="h-3 w-3 text-cyan-300" /> {s.viewerCount} watching
                    </span>
                    <span className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3 text-emerald-400" /> Stereo HD
                    </span>
                    <span>{timeAgo(s.startedAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <GoLiveSheet open={goLive} onClose={() => setGoLive(false)} />
    </div>
  );
}

function SourceBadge({ source }: { source: LiveSessionCard["source"] }) {
  const Icon = source === "daw" ? Cable : source === "display" ? Monitor : source === "both" ? Radio : Video;
  const label = source === "daw" ? "DAW" : source === "display" ? "Screen" : source === "both" ? "DAW+Cam" : "Cam";
  return (
    <span className="flex shrink-0 items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase tracking-wider text-cyan-200 border border-white/8">
      <Icon className="h-2.5 w-2.5" /> {label}
    </span>
  );
}
