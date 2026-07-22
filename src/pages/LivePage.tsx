import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Loader2, Monitor, Radio, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { GoLiveSheet } from "@/components/GoLiveSheet";
import { Avatar } from "@/components/Avatar";
import * as api from "@/lib/api";
import { cx, timeAgo } from "@/lib/utils";
import type { LiveSessionCard } from "@/types";

export function LivePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<LiveSessionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [goLive, setGoLive] = useState(false);

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

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Live"
        subtitle="Who’s on right now"
        actions={
          <button type="button" onClick={() => setGoLive(true)} className="btn btn-primary h-9 px-3.5 py-0 text-xs">
            <Radio className="h-3.5 w-3.5" /> Go live
          </button>
        }
      />

      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No one live yet"
            body="Be first — share your process on camera or your display and let complementary musicians find you."
            action={
              <button type="button" onClick={() => setGoLive(true)} className="btn btn-primary mt-2 px-5 py-2.5 text-sm">
                Go live
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {items.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/live/${s.id}`)}
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                className="reveal flex w-full items-center gap-3 py-4 text-left transition hover:bg-white/[0.02] active:scale-[0.995]"
              >
                <div className="relative shrink-0">
                  <Avatar url={s.avatarUrl} name={s.username || s.displayName} id={s.hostId} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-wild ring-2 ring-ink-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-[15px] font-semibold text-white">
                      {s.username || s.displayName || "Creator"}
                    </p>
                    <SourceBadge source={s.source} />
                  </div>
                  <p className="truncate text-[13px] text-white/55">
                    {s.title || s.intent || s.roleLabel || "Live now"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-white/35">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{s.viewerCount}</span>
                    <span>{timeAgo(s.startedAt)}</span>
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-medium text-veil-200">Watch</span>
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
  const Icon = source === "display" ? Monitor : source === "both" ? Radio : Video;
  const label = source === "display" ? "Desk" : source === "both" ? "Cam+Desk" : "Cam";
  return (
    <span className={cx("flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/40")}>
      <Icon className="h-2.5 w-2.5" /> {label}
    </span>
  );
}
