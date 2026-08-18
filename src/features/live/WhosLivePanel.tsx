import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, Radio } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LiveTileStage, liveSeedFromId } from "@/components/LiveTileStage";
import * as api from "@/lib/api";
import { cx, timeAgo } from "@/lib/utils";
import type { LiveSessionCard } from "@/types";

function hostName(s: LiveSessionCard): string {
  return s.displayName?.trim() || s.username?.trim() || "Host";
}

function hostRole(s: LiveSessionCard): string {
  return s.roleLabel?.trim() || s.intent?.trim() || s.title?.trim() || "Live";
}

/**
 * Who's live — current hosts on stage. People first, then what they're playing.
 */
export function WhosLivePanel({
  sessions,
  loading = false,
  variant = "grid",
  emptyAction,
  showHeading = true,
  className,
}: {
  sessions?: LiveSessionCard[];
  loading?: boolean;
  variant?: "grid" | "rail";
  emptyAction?: ReactNode;
  showHeading?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const [own, setOwn] = useState<LiveSessionCard[] | null>(sessions ? null : []);
  const [ownLoading, setOwnLoading] = useState(!sessions);

  useEffect(() => {
    if (sessions) return;
    let alive = true;
    const load = async () => {
      const list = await api.listLiveSessions(40);
      if (alive) {
        setOwn(list);
        setOwnLoading(false);
      }
    };
    void load();
    const ch = api.subscribeLiveSessions(() => { void load(); });
    return () => {
      alive = false;
      api.unsubscribe(ch);
    };
  }, [sessions]);

  const items = sessions ?? own ?? [];
  const busy = sessions ? loading : ownLoading;
  const rail = variant === "rail";

  return (
    <section
      className={cx("relative", className)}
      data-testid="whos-live-panel"
      aria-label="Who's live"
    >
      {showHeading ? (
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-wild">
              <span className="h-1.5 w-1.5 rounded-full bg-wild animate-pulse" />
              Who's live
            </p>
            <h2 className="mt-0.5 font-display text-lg font-semibold text-white sm:text-xl">
              Artists and producers on now
            </h2>
            <p className="mt-1 text-[12px] text-white/45" data-testid="listen-earn-hint">
              Listening is free. Stay on a live to earn Airtime. Hosting burns it.
            </p>
          </div>
          {rail ? (
            <button
              type="button"
              onClick={() => navigate("/live")}
              className="text-[12px] text-white/45 transition hover:text-white/80"
            >
              All live
            </button>
          ) : null}
        </div>
      ) : null}

      {busy ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-8 text-center"
          data-testid="whos-live-empty"
        >
          <Radio className="mx-auto h-6 w-6 text-white/25" />
          <p className="mt-2 text-sm text-white/55">No one is live</p>
          <p className="mt-0.5 text-[12px] text-white/35">When an artist or producer goes on, they show up here.</p>
          {emptyAction}
        </div>
      ) : rail ? (
        <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
          {items.map((s) => (
            <HostCard key={s.id} session={s} compact onOpen={() => navigate(`/live/${s.id}`)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((s) => (
            <HostCard key={s.id} session={s} onOpen={() => navigate(`/live/${s.id}`)} />
          ))}
        </div>
      )}
    </section>
  );
}

function HostCard({
  session: s,
  compact,
  onOpen,
}: {
  session: LiveSessionCard;
  compact?: boolean;
  onOpen: () => void;
}) {
  const name = hostName(s);
  const role = hostRole(s);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="whos-live-host"
      className={cx(
        "broadcast-bezel group relative overflow-hidden rounded-2xl border border-white/8 bg-ink-900/60 text-left backdrop-blur-md transition hover:border-veil-400/40 hover:scale-[1.01] active:scale-[0.99]",
        compact ? "w-[15.5rem] shrink-0 snap-start" : "",
      )}
    >
      <div className={cx("relative flex flex-col justify-between p-4", compact ? "min-h-[8.5rem]" : "min-h-[7.5rem]")}>
        <LiveTileStage seed={liveSeedFromId(s.hostId)} />
        <div className="relative z-[1] flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar url={s.avatarUrl} name={name} id={s.hostId} size="md" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-wild ring-2 ring-ink-950 animate-ping" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-wild ring-2 ring-ink-950" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold text-white transition group-hover:text-cyan-100">
              {name}
            </p>
            {s.username ? (
              <p className="truncate font-mono text-[11px] text-cyan-200/70">@{s.username}</p>
            ) : null}
            <p className="mt-0.5 truncate text-[12px] text-white/55">{role}</p>
          </div>
        </div>
        <div className="relative z-[1] mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2 text-[11px] text-white/45">
          <span className="flex items-center gap-1.5 font-mono text-cyan-200">
            <Eye className="h-3 w-3 text-cyan-300" /> {s.viewerCount} watching
          </span>
          <span>{timeAgo(s.startedAt)}</span>
        </div>
      </div>
    </button>
  );
}
