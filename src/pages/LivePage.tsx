import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Headphones,
  Mic,
  Radio,
} from "lucide-react";
import { GoLiveSheet } from "@/components/GoLiveSheet";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";
import { isMusicSource } from "@/features/broadcast/liveSource";
import { WhosLivePanel } from "@/features/live/WhosLivePanel";
import { ProvenanceHistory } from "@/features/provenance/ProvenanceHistory";
import type { LiveSessionCard } from "@/types";

type FilterTab = "all" | "talk" | "music";

export function LivePage() {
  const { userId } = useSession();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<LiveSessionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [goLive, setGoLive] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  useRegisterAppBar({
    title: "Live",
    subtitle: "Who's on right now",
    actions: (
      <button
        type="button"
        onClick={() => setGoLive(true)}
        data-testid="go-live"
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
    if (filter === "talk") return !isMusicSource(item.source);
    return true;
  });

  const totalListeners = items.reduce((acc, s) => acc + (s.viewerCount || 0), 0);

  return (
    <div
      data-live-stage
      className="flex h-full min-h-[calc(100dvh-var(--app-bar-h,3.25rem)-var(--dock-reserve,5.25rem))] flex-col bg-ink-950"
    >
      {/* Hero stage banner */}
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-cyan-500/[0.07] to-transparent px-4 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-wild animate-pulse" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-wild">
                Live now
              </span>
            </div>
            <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-white">
              Who's live
            </h1>
            <p className="mt-0.5 text-xs text-white/50 max-w-xl">
              Creators on stage right now. Listening is free.{FLAGS.atc ? " Stay to earn Airtime." : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono">On stage</p>
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
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("talk")}
            className={cx(
              "rounded-lg px-3 py-1 text-xs font-medium transition flex items-center gap-1.5",
              filter === "talk"
                ? "bg-white/10 text-white font-semibold shadow-inner"
                : "text-white/40 hover:text-white/70",
            )}
          >
            <Mic className="h-3 w-3" /> Talk
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
            <Headphones className="h-3 w-3" /> Music
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 sm:px-6 pb-8 pt-4">
        <WhosLivePanel
          sessions={filteredItems}
          loading={loading}
          showHeading={false}
          emptyAction={
            <button
              type="button"
              onClick={() => setGoLive(true)}
              data-testid="go-live-empty"
              className="btn btn-primary mt-3 h-9 px-4 text-xs font-semibold"
            >
              <Radio className="h-3.5 w-3.5 mr-1" /> Go live
            </button>
          }
        />
        {userId && <ProvenanceHistory hostId={userId} />}
      </div>

      <GoLiveSheet open={goLive} onClose={() => setGoLive(false)} />
    </div>
  );
}
