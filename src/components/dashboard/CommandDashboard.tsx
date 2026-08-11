import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  AudioLines,
  CheckCircle2,
  Info,
  Loader2,
  Radio,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { TrackCard } from "@/components/TrackCard";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import { getPrepareOwnerId, listReleases } from "@/features/prepare/service";
import {
  buildActionItems,
  buildStats,
  nextStepFor,
  recentReleases,
  type ActionItem,
  type ActionSeverity,
  type DashboardStats,
} from "@/lib/dashboardModel";
import { statusTone } from "@/features/prepare/severity";
import { Badge } from "@/components/ui/Badge";
import { formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";
import type { ReleaseProject } from "@vybz/domain/releases";
import type { StorefrontOrder } from "@/features/storefront/types";
import type { Drop, LiveSessionCard } from "@/types";
import type { DiscoveryDrop } from "@/lib/api";

const SEVERITY_STYLE: Record<ActionSeverity, { icon: typeof AlertTriangle; tone: string }> = {
  blocking: { icon: AlertTriangle, tone: "text-suite-danger" },
  attention: { icon: Info, tone: "text-suite-warning" },
  suggestion: { icon: Sparkles, tone: "text-suite-cyan" },
};

/**
 * The signed-in command surface. Every figure and task is derived from the account's
 * own records — uploads, release projects and storefront orders. When there is
 * nothing outstanding the action centre says so rather than inventing work.
 */
export function CommandDashboard({
  onListenMore,
  onLiveMore,
}: {
  onListenMore?: () => void;
  onLiveMore?: () => void;
}) {
  const navigate = useNavigate();
  const { userId, profile } = useSession();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [releases, setReleases] = useState<ReleaseProject[]>([]);
  const [orders, setOrders] = useState<StorefrontOrder[]>([]);
  const [live, setLive] = useState<LiveSessionCard[]>([]);
  const [fresh, setFresh] = useState<DiscoveryDrop[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const ownerId = getPrepareOwnerId(userId);
    const [myDrops, myReleases, myOrders, sessions, discovery] = await Promise.all([
      userId ? api.dropsBy(userId, 60).catch(() => [] as Drop[]) : Promise.resolve([] as Drop[]),
      listReleases(ownerId).catch(() => [] as ReleaseProject[]),
      FLAGS.storefront
        ? api.listMyStorefrontOrders().catch(() => [] as StorefrontOrder[])
        : Promise.resolve([] as StorefrontOrder[]),
      api.listLiveSessions(8).catch(() => [] as LiveSessionCard[]),
      api.listDiscovery(Date.now() % 1e9, 12).catch(() => [] as DiscoveryDrop[]),
    ]);
    setDrops(myDrops);
    setReleases(myReleases);
    setOrders(myOrders);
    setLive(sessions);
    setFresh(discovery.filter((d) => !!d.audioUrl).slice(0, 6));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16" data-testid="dashboard-loading">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
      </div>
    );
  }

  const stats = buildStats(drops, releases);
  const actions = buildActionItems({ drops, releases, orders });
  const recent = recentReleases(releases);
  const myRecentDrops = [...drops].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const isNewAccount = drops.length === 0 && releases.length === 0;

  return (
    <div className="space-y-5" data-testid="command-dashboard">
      <header>
        <p className="nexus-eyebrow">
          {profile?.username ? formatVcAddress(profile.username) : "Your studio"}
        </p>
        <h1 className="nexus-headline mt-1 text-2xl">
          {isNewAccount ? "Let's get your first track measured" : "Where things stand"}
        </h1>
      </header>

      {isNewAccount ? (
        <NewAccountStart onScan={() => navigate("/releases")} />
      ) : (
        <>
          <StatStrip stats={stats} onNavigate={navigate} />
          <ActionCentre items={actions} onNavigate={navigate} />
          {recent.length > 0 && <ContinueWorking releases={recent} onNavigate={navigate} />}
          {myRecentDrops.length > 0 && (
            <RecentUploads drops={myRecentDrops} onOpenLibrary={() => navigate("/library")} />
          )}
        </>
      )}

      {live.length > 0 && (
        <section>
          <SectionHead icon={Radio} label="Live now" actionLabel="All" onAction={onLiveMore} />
          <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
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
                      <span className="block truncate font-mono text-[11px] text-cyan-100">
                        {formatVcAddress(s.username)}
                      </span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-wild">
                        Live
                      </span>
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[12px] font-medium text-white/85">
                    {s.title || "Live session"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {fresh.length > 0 && (
        <section>
          <SectionHead icon={AudioLines} label="Fresh from other artists" actionLabel="More" onAction={onListenMore} />
          <div className="grid gap-3 sm:grid-cols-2">
            {fresh.map((d) => (
              <TrackCard key={d.id} compact drop={d} queue={fresh} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatStrip({
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
    { label: "Plays", value: stats.totalPlays, to: "/library" },
  ];
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-testid="dashboard-stats">
      {cells.map((c) => (
        <li key={c.label}>
          <button
            type="button"
            onClick={() => onNavigate(c.to)}
            className="forge-card w-full !p-3 text-left transition hover:border-white/20"
          >
            <span className={cx("block font-display text-xl font-semibold tabular-nums", c.tone ?? "text-white")}>
              {c.value}
            </span>
            <span className="block text-[11px] uppercase tracking-wide text-white/35">{c.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ActionCentre({
  items,
  onNavigate,
}: {
  items: ActionItem[];
  onNavigate: (to: string) => void;
}) {
  return (
    <section data-testid="action-centre">
      <p className="nexus-eyebrow mb-2">Needs your attention</p>
      {items.length === 0 ? (
        <div className="forge-card flex items-center gap-3 !py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-suite-success" />
          <p className="text-sm text-white/60">
            Nothing outstanding. Every release you have prepared is clear of blocking findings.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const style = SEVERITY_STYLE[item.severity];
            const Icon = style.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  data-testid={`action-${item.id}`}
                  className="forge-card flex w-full items-start gap-3 text-left transition hover:border-white/20"
                >
                  <Icon className={cx("mt-0.5 h-4 w-4 shrink-0", style.tone)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white/90">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-white/45">
                      {item.detail}
                    </span>
                  </span>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] font-semibold text-suite-cyan">
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

function ContinueWorking({
  releases,
  onNavigate,
}: {
  releases: ReleaseProject[];
  onNavigate: (to: string) => void;
}) {
  return (
    <section data-testid="continue-working">
      <SectionHead icon={ScanSearch} label="Continue working" actionLabel="All releases" onAction={() => onNavigate("/releases")} />
      <ul className="space-y-2">
        {releases.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onNavigate(`/release/${r.id}`)}
              className="forge-card flex w-full items-center gap-3 text-left transition hover:border-white/20"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white/90">{r.title}</span>
                <span className="block truncate text-[12px] text-white/40">
                  {r.artistName || "Artist not set"} · {nextStepFor(r)}
                </span>
              </span>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentUploads({ drops, onOpenLibrary }: { drops: Drop[]; onOpenLibrary: () => void }) {
  return (
    <section data-testid="recent-uploads">
      <SectionHead icon={AudioLines} label="Your recent uploads" actionLabel="Library" onAction={onOpenLibrary} />
      <div className="grid gap-3 sm:grid-cols-2">
        {drops.map((d) => (
          <TrackCard key={d.id} compact drop={d} queue={drops} />
        ))}
      </div>
    </section>
  );
}

function NewAccountStart({ onScan }: { onScan: () => void }) {
  return (
    <div className="forge-glass relative p-5 text-center" data-testid="dashboard-empty">
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <div className="relative z-[1]">
        <ScanSearch className="mx-auto h-7 w-7 text-suite-cyan" />
        <p className="mt-3 font-display text-base font-semibold text-white">
          Nothing measured yet
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/50">
          Upload a master and VYBZ will measure loudness, peaks, artwork and metadata, then tell
          you exactly what stands between you and release.
        </p>
        <button type="button" onClick={onScan} className="forge-cta mt-4" data-testid="dashboard-first-scan">
          Scan your first track
        </button>
      </div>
    </div>
  );
}

function SectionHead({
  icon: Icon,
  label,
  actionLabel,
  onAction,
}: {
  icon: typeof Radio;
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <p className="nexus-eyebrow flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-[11px] font-semibold text-cyan-200/80 hover:text-white"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
