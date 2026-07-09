import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Hash, Loader2, Send, Circle } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import type { Room, RoomMessage, RoomPresence } from "@/types";

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function RoomPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, profile } = useSession();
  const [room, setRoom] = useState<Room | null>(null);
  const [msgs, setMsgs] = useState<RoomMessage[]>([]);
  const [online, setOnline] = useState<RoomPresence[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() { setMsgs(await api.listRoomMessages(id)); }

  useEffect(() => {
    let alive = true;
    Promise.all([api.getRoom(id), api.listRoomMessages(id)]).then(([r, m]) => {
      if (!alive) return;
      setRoom(r); setMsgs(m); setLoading(false);
    });
    const ch = api.subscribeInserts("room_messages", `room_id=eq.${id}`, () => void load());
    const presence = userId
      ? api.joinRoomPresence(id, { id: userId, username: profile?.username ?? null }, (u) => setOnline(u))
      : null;
    return () => { alive = false; api.unsubscribe(ch); api.unsubscribe(presence); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await api.sendRoomMessage(id, body);
    await load();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate("/rooms")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-veil-500/15 text-veil-100"><Hash className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold text-white">{room?.title ?? "Room"}</h1>
          <p className="flex items-center gap-1 text-[11px] text-white/45">
            <Circle className="h-2 w-2 fill-feel text-feel" /> {online.length} online
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : msgs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-white/40">
            <Hash className="mb-2 h-8 w-8 text-white/20" />
            <p className="text-sm">This is the start of <span className="font-semibold text-white/70">{room?.title}</span>.</p>
            <p className="text-xs">Say hi and find collaborators.</p>
          </div>
        ) : (
          msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const grouped = prev && prev.senderId === m.senderId && m.createdAt - prev.createdAt < 5 * 60 * 1000;
            return (
              <div key={m.id} className={cx("flex flex-col", m.mine ? "items-end" : "items-start")}>
                {!grouped && (
                  <span className="mb-0.5 px-1 text-[11px] text-white/40">
                    {m.mine ? "You" : (m.senderName ?? "creator")} · {fmtTime(m.createdAt)}
                  </span>
                )}
                <div className={cx("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "bg-veil-500/30 text-white" : "bg-white/[0.06] text-white/85")}>{m.body}</div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message #${room?.title ?? "room"}…`}
          className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow active:scale-90"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
