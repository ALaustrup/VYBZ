import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, Loader2, Music2, Disc3, SlidersHorizontal, Sparkles } from "lucide-react";
import * as api from "@/lib/api";
import { ChatTabs } from "@/components/ChatTabs";
import { cx, timeAgo } from "@/lib/utils";
import type { Room, RoomKind } from "@/types";

const KIND_META: Record<RoomKind, { label: string; icon: typeof Hash }> = {
  social: { label: "Hangouts", icon: Sparkles },
  role: { label: "Roles", icon: Music2 },
  genre: { label: "Genres", icon: Disc3 },
  daw: { label: "DAWs", icon: SlidersHorizontal },
};
const ORDER: RoomKind[] = ["social", "role", "genre", "daw"];

/** Unified Rooms discovery — taxonomy + social under one cyber glass entry. */
export function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => { api.listRooms().then((r) => { setRooms(r); setLoading(false); }); }, []);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle ? rooms.filter((r) => r.title.toLowerCase().includes(needle)) : rooms;
    return ORDER.map((kind) => ({
      kind,
      rooms: filtered.filter((r) => r.kind === kind)
        .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0) || b.messages - a.messages || a.title.localeCompare(b.title)),
    })).filter((g) => g.rooms.length > 0);
  }, [rooms, q]);

  return (
    <div className="flex h-full flex-col">
      <ChatTabs active="rooms" />
      <div className="px-1 pb-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a room…"
          className="w-full rounded-xl border border-white/12 bg-ink-950/40 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[rgb(var(--neon-cyan)/0.45)] focus:outline-none" />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => {
              const Meta = KIND_META[g.kind];
              return (
                <div key={g.kind}>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
                    <Meta.icon className="h-3.5 w-3.5 text-[rgb(var(--neon-cyan))]" />{Meta.label}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.rooms.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => navigate(`/rooms/${r.id}`)}
                        className="glass-panel flex items-center gap-2.5 px-3.5 py-2.5 text-left transition active:scale-[0.99]"
                        data-dark-stage
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--neon-cyan)/0.12)] text-[rgb(var(--neon-cyan))]">
                          <Hash className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{r.title}</span>
                          <span className="block text-[11px] text-white/40">
                            {r.messages > 0 ? `${r.messages} msgs` : "Open"}
                            {r.lastAt ? ` · ${timeAgo(r.lastAt)}` : ""}
                            {r.accessTier === "premium" ? " · V¢" : ""}
                          </span>
                        </span>
                        {r.lastAt && Date.now() - r.lastAt < 36e5 && (
                          <span className={cx("h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--neon-mint))]")} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
