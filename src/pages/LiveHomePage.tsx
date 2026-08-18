import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Library,
  Loader2,
  Radio,
  Repeat,
  Search,
  Volume2,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { GoLiveSheet } from "@/components/GoLiveSheet";
import { LiveVisualizer } from "@/components/LiveVisualizer";
import { LiveTileStage, liveSeedFromId } from "@/components/LiveTileStage";
import { TipButton } from "@/components/TipButton";
import { AtcHostCard } from "@/features/airtime/AtcHostCard";
import { useAtcBalance } from "@/features/airtime/useAtcBalance";
import { formatAtcClock } from "@/features/airtime/atcHeartbeat";
import { listHostStageNights, type StageNight } from "@/features/profile/stageNights";
import { myListenSummary, type ListenSummary } from "@/features/reception/listenApi";
import { WhosLivePanel } from "@/features/live/WhosLivePanel";
import { NOT_MEASURED } from "@/product/invariants";
import * as api from "@/lib/api";
import { setVolume, usePlayer } from "@/lib/audioBus";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";
import type { AppNotification, Drop, LiveSessionCard } from "@/types";

type HomeMode = "music" | "live" | "replay";

export function LiveHomePage() {
  const navigate = useNavigate();
  const { userId, profile } = useSession();
  const player = usePlayer();
  const atc = useAtcBalance();
  const [mode, setMode] = useState<HomeMode>("live");
  const [query, setQuery] = useState("");
  const [goLive, setGoLive] = useState(false);
  const [sessions, setSessions] = useState<LiveSessionCard[]>([]);
  const [nights, setNights] = useState<StageNight[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [listens, setListens] = useState<ListenSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const live = await api.listLiveSessions(40);
      if (!alive) return;
      setSessions(live);
      setSelectedId((cur) => (cur && live.some((s) => s.id === cur) ? cur : live[0]?.id ?? null));
      setLoading(false);
    };
    void load();
    const ch = api.subscribeLiveSessions(() => { void load(); });
    return () => { alive = false; api.unsubscribe(ch); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void Promise.all([
      listHostStageNights(userId, 12),
      api.dropsBy(userId, 40),
      api.listNotifications(),
      myListenSummary(),
    ]).then(([n, d, feed, summary]) => {
      if (!alive) return;
      setNights(n);
      setDrops(d);
      setNotes(feed);
      setListens(summary);
    });
    return () => { alive = false; };
  }, [userId]);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const lastNight = nights[0] ?? null;
  const replays = nights.filter((n) => n.status !== "live");
  const q = query.trim().toLowerCase();
  const liveFiltered = useMemo(() => {
    if (!q) return sessions;
    return sessions.filter((s) =>
      [s.displayName, s.username, s.title, s.intent, s.roleLabel]
        .some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [sessions, q]);
  const hostedSeconds = lastNight
    ? lastNight.atcBurned != null
      ? lastNight.atcBurned
      : lastNight.endedAt && lastNight.startedAt
        ? Math.max(0, Math.round((lastNight.endedAt - lastNight.startedAt) / 1000))
        : null
    : null;

  return (
    <div className="live-home" data-testid="live-home" data-mode={mode}>
      <aside className="live-home-panel live-home-left" data-testid="live-home-left">
        <div className="flex gap-1 border-b border-[#2A2E39] p-2">
          {([
            { id: "music" as const, label: "Music" },
            { id: "live" as const, label: "Live" },
            { id: "replay" as const, label: "Replay" },
          ]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              data-testid={`live-home-mode-${m.id}`}
              className={cx(
                "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider",
                mode === m.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {mode === "live" && (
            <ChannelList
              loading={loading}
              items={liveFiltered}
              selectedId={selectedId}
              onPick={setSelectedId}
            />
          )}
          {mode === "music" && (
            <TrackList drops={drops} />
          )}
          {mode === "replay" && (
            <ReplayList nights={replays} onOpen={(id) => navigate(`/live/${id}`)} />
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-[#2A2E39] px-3 py-2">
          <Volume2 className="h-3.5 w-3.5 text-white/40" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            aria-label="Volume"
            onChange={(e) => setVolume(Number(e.target.value))}
            className="min-w-0 flex-1 accent-emerald-400"
          />
        </div>
      </aside>

      <section className="live-home-panel live-home-center" data-testid="live-home-center">
        <header className="flex items-center gap-2 border-b border-[#2A2E39] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lives, hosts, tracks"
            aria-label="Search lives, hosts, tracks"
            data-testid="live-home-search"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setGoLive(true)}
            data-testid="go-live"
            className="cta-pill flex h-8 items-center gap-1.5 px-3 text-[11px] font-semibold text-black"
          >
            <Radio className="h-3.5 w-3.5" /> Go live
          </button>
        </header>

        <div className="relative min-h-[14rem] flex-1 overflow-hidden bg-black">
          {selected && mode === "live" ? (
            <button
              type="button"
              onClick={() => navigate(`/live/${selected.id}`)}
              className="absolute inset-0"
              aria-label={`Open ${selected.displayName || selected.username || "live"}`}
            >
              <LiveTileStage seed={liveSeedFromId(selected.hostId)} />
              <LiveVisualizer stream={null} mode="stage" className="absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/80 to-transparent p-4 text-left">
                <p className="font-display text-lg font-semibold">{selected.displayName || selected.username || "Host"}</p>
                <p className="text-[12px] text-white/55">{selected.title || selected.intent || "Live"}</p>
              </div>
            </button>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <Radio className="h-8 w-8 text-white/25" />
              <p className="text-sm text-white/50">
                {mode === "replay" ? "Pick a replay from the left." : "No one is live. Go live or play a track."}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-2 border-t border-[#2A2E39] p-3 sm:grid-cols-2">
          <AtcHostCard balance={atc === undefined ? null : atc} />
          <div className="rounded-2xl border border-[#2A2E39] bg-black/20 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Your night</p>
            <p className="mt-1 font-mono text-sm text-cyan-100">
              {hostedSeconds == null ? NOT_MEASURED : formatAtcClock(hostedSeconds)}
            </p>
            <p className="mt-1 truncate text-[12px] text-white/45">
              Last session: {lastNight ? (lastNight.title || timeAgo(lastNight.startedAt)) : NOT_MEASURED}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Tracks" value={drops.length ? String(drops.length) : NOT_MEASURED} />
              <Stat label="Listens" value={listens ? String(listens.sessions) : NOT_MEASURED} />
              <Stat label="Finished" value={listens ? String(listens.finished) : NOT_MEASURED} />
            </div>
          </div>
        </div>

        <div className="border-t border-[#2A2E39] p-3">
          <WhosLivePanel sessions={liveFiltered} loading={loading} variant="rail" />
        </div>
      </section>

      <aside className="live-home-panel live-home-right" data-testid="live-home-right">
        <div className="border-b border-[#2A2E39] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Hub</p>
          {selected && (
            <div className="mt-2 flex items-center gap-2">
              <Avatar url={selected.avatarUrl} name={selected.username} id={selected.hostId} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selected.displayName || selected.username}</p>
                <button type="button" onClick={() => navigate(`/u/${selected.hostId}`)} className="text-[11px] text-white/45 hover:text-white">
                  Host profile
                </button>
              </div>
              <TipButton userId={selected.hostId} username={selected.username} />
            </div>
          )}
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            <Bell className="mr-1 inline h-3 w-3" /> Notifications
          </p>
          {notes.length === 0 ? (
            <p className="text-[12px] text-white/40">Nothing yet.</p>
          ) : (
            <ul className="space-y-2">
              {notes.slice(0, 12).map((n) => (
                <li key={n.id} className="rounded-xl border border-[#2A2E39] bg-black/20 px-2.5 py-2">
                  <p className="truncate text-[12px] font-medium text-white">{n.title}</p>
                  {n.body ? <p className="truncate text-[11px] text-white/40">{n.body}</p> : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">Next</p>
          <ul className="space-y-1.5">
            {sessions.filter((s) => s.id !== selected?.id).slice(0, 6).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-white/5"
                >
                  <Avatar url={s.avatarUrl} name={s.username} id={s.hostId} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[12px]">{s.displayName || s.username || "Host"}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-white/35">Chat opens in the live room.</p>
        </div>
        {profile?.username ? (
          <button
            type="button"
            onClick={() => userId && navigate(`/u/${userId}`)}
            className="border-t border-[#2A2E39] px-3 py-2 text-left text-[12px] text-white/50 hover:text-white"
          >
            @{profile.username}
          </button>
        ) : null}
      </aside>

      <GoLiveSheet open={goLive} onClose={() => setGoLive(false)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[13px] text-cyan-100">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}

function ChannelList({
  loading,
  items,
  selectedId,
  onPick,
}: {
  loading: boolean;
  items: LiveSessionCard[];
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>;
  if (items.length === 0) return <p className="px-2 py-6 text-center text-[12px] text-white/40">No one is live</p>;
  return (
    <ul className="space-y-1">
      {items.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onPick(s.id)}
            className={cx(
              "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left",
              selectedId === s.id ? "bg-white/10" : "hover:bg-white/5",
            )}
          >
            <span className="relative">
              <Avatar url={s.avatarUrl} name={s.username} id={s.hostId} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-wild" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{s.displayName || s.username || "Host"}</span>
              <span className="block truncate text-[11px] text-white/40">{s.title || s.intent || "Live"}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TrackList({ drops }: { drops: Drop[] }) {
  if (drops.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-[12px] text-white/40">
        <Library className="mx-auto mb-1 h-4 w-4" /> No tracks yet
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {drops.slice(0, 24).map((d) => (
        <li key={d.id} className="truncate rounded-lg px-2 py-1.5 text-[12px] text-white/70">
          {d.title || "Untitled"}
        </li>
      ))}
    </ul>
  );
}

function ReplayList({ nights, onOpen }: { nights: StageNight[]; onOpen: (id: string) => void }) {
  if (nights.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-[12px] text-white/40">
        <Repeat className="mx-auto mb-1 h-4 w-4" /> No saved replays
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {nights.map((n) => (
        <li key={n.id}>
          <button type="button" onClick={() => onOpen(n.id)} className="w-full truncate rounded-lg px-2 py-1.5 text-left text-[12px] text-white/70 hover:bg-white/5">
            {n.title || timeAgo(n.startedAt)}
          </button>
        </li>
      ))}
    </ul>
  );
}
