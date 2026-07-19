import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, Loader2, Music2, Disc3, SlidersHorizontal } from "lucide-react";
import * as api from "@/lib/api";
import { ChatTabs } from "@/components/ChatTabs";
import { cx, timeAgo } from "@/lib/utils";
import type { Room, RoomKind } from "@/types";

const KIND_META: Record<RoomKind, { label: string; icon: typeof Hash }> = {
  role: { label: "Roles & instruments", icon: Music2 },
  genre: { label: "Genres", icon: Disc3 },
  daw: { label: "DAWs", icon: SlidersHorizontal },
};
const ORDER: RoomKind[] = ["role", "genre", "daw"];

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
      <div className="px-5 pb-3 pt-4 max-lg:pr-14">
        <h1 className="font-display text-[1.65rem] font-semibold tracking-tight text-white">Rooms</h1>
        <div className="mt-4 h-px w-full bg-[var(--hairline)]" />
      </div>
      <ChatTabs active="rooms" />
      <div className="px-5 pb-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms…"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => {
              const Meta = KIND_META[g.kind];
              return (
                <div key={g.kind}>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40"><Meta.icon className="h-3.5 w-3.5" />{Meta.label}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {g.rooms.map((r) => (
                      <button key={r.id} onClick={() => navigate(`/rooms/${r.id}`)}
                        className="flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-left transition active:scale-[0.99] hover:border-white/15">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-veil-500/15 text-veil-100"><Hash className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{r.title}</span>
                          <span className="block text-[11px] text-white/40">
                            {r.messages > 0 ? `${r.messages} ${r.messages === 1 ? "message" : "messages"}` : "No messages yet"}
                            {r.lastAt ? ` · ${timeAgo(r.lastAt)}` : ""}
                          </span>
                        </span>
                        {r.lastAt && Date.now() - r.lastAt < 36e5 && <span className={cx("h-2 w-2 shrink-0 rounded-full bg-feel")} />}
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
