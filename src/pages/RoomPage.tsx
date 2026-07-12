import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Hash, Loader2, Send, Circle, Radio, Play } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { usePlayer, getSnapshot, playTrack, seek, pause, toggle } from "@/lib/audioBus";
import { cx } from "@/lib/utils";
import type { Room, RoomMessage, RoomPresence } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ListenBar({ hosting, live, following, currentTitle, onHost, onStop, onJoin, onLeave }: {
  hosting: boolean; live: api.ListenState | null; following: boolean; currentTitle: string | null;
  onHost: () => void; onStop: () => void; onJoin: (s: api.ListenState) => void; onLeave: () => void;
}) {
  if (hosting) {
    return (
      <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-feel/25 bg-feel/[0.08] px-3 py-2 text-sm text-feel">
        <Radio className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="min-w-0 flex-1 truncate">You're hosting — the room hears your player live</span>
        <button onClick={onStop} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white active:scale-95">Stop</button>
      </div>
    );
  }
  if (live && live.track) {
    return (
      <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-veil-400/30 bg-veil-500/[0.12] px-3 py-2 text-sm">
        <Radio className="h-4 w-4 shrink-0 animate-pulse text-veil-200" />
        <span className="min-w-0 flex-1 truncate text-white/90"><span className="font-semibold">{live.hostName ?? "Someone"}</span> is playing <span className="text-veil-100">{live.track.title}</span></span>
        {following ? (
          <button onClick={onLeave} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white active:scale-95">Leave</button>
        ) : (
          <button onClick={() => onJoin(live)} className="flex shrink-0 items-center gap-1 rounded-full bg-veil-500 px-2.5 py-1 text-xs font-semibold text-white shadow-glow active:scale-95"><Play className="h-3 w-3" /> Join</button>
        )}
      </div>
    );
  }
  if (currentTitle) {
    return (
      <button onClick={onHost} className="mx-4 mb-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-white/80 active:scale-[0.99]">
        <Radio className="h-4 w-4" /> Listen together
      </button>
    );
  }
  return null;
}

export function RoomPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, profile } = useSession();
  const player = usePlayer();
  const [room, setRoom] = useState<Room | null>(null);
  const [msgs, setMsgs] = useState<RoomMessage[]>([]);
  const [online, setOnline] = useState<RoomPresence[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [listen, setListen] = useState<api.ListenState | null>(null);
  const [hosting, setHosting] = useState(false);
  const [following, setFollowing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const listenChRef = useRef<RealtimeChannel | null>(null);
  const hostingRef = useRef(false);
  const followingRef = useRef(false);
  useEffect(() => { hostingRef.current = hosting; }, [hosting]);
  useEffect(() => { followingRef.current = following; }, [following]);

  async function load() { setMsgs(await api.listRoomMessages(id)); }

  // Apply an incoming host sync to the local player (drift-compensated).
  function applySync(s: api.ListenState) {
    if (!s.track) return;
    const snap = getSnapshot();
    if (snap.track?.id !== s.track.id) playTrack(s.track);
    const target = s.positionSec + (s.playing ? (Date.now() - s.at) / 1000 : 0);
    if (Math.abs(getSnapshot().currentTime - target) > 1.5) seek(target);
    const now = getSnapshot().playing;
    if (s.playing && !now) void toggle();
    else if (!s.playing && now) pause();
  }

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

  // Listen-together channel (Phase G v1): receive host syncs; mirror when following.
  useEffect(() => {
    if (!userId) return;
    const ch = api.joinRoomListen(id, (s) => {
      if (s.ended) {
        setListen(null);
        if (followingRef.current) { setFollowing(false); pause(); }
        return;
      }
      setListen(s);
      if (followingRef.current && !hostingRef.current) applySync(s);
    });
    listenChRef.current = ch;
    return () => { api.unsubscribe(ch); listenChRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  // While hosting, broadcast player state to the room every 2s (+ on start/stop).
  useEffect(() => {
    if (!hosting || !userId) return;
    const send = () => {
      const ch = listenChRef.current; if (!ch) return;
      const snap = getSnapshot();
      api.sendListen(ch, { hostId: userId, hostName: profile?.username ?? null, track: snap.track, positionSec: snap.currentTime, playing: snap.playing, at: Date.now() });
    };
    send();
    const iv = setInterval(send, 2000);
    return () => {
      clearInterval(iv);
      const ch = listenChRef.current;
      if (ch && userId) api.sendListen(ch, { hostId: userId, hostName: profile?.username ?? null, track: null, positionSec: 0, playing: false, at: Date.now(), ended: true });
    };
  }, [hosting, userId, profile?.username]);

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
      <div className="flex items-center gap-3 px-4 pb-2 pt-3 max-lg:pr-14">
        <button onClick={() => navigate("/rooms")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-veil-500/15 text-veil-100"><Hash className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold text-white">{room?.title ?? "Room"}</h1>
          <p className="flex items-center gap-1 text-[11px] text-white/45">
            <Circle className="h-2 w-2 fill-feel text-feel" /> {online.length} online
          </p>
        </div>
      </div>

      <ListenBar
        hosting={hosting}
        live={listen && listen.track && listen.hostId !== userId ? listen : null}
        following={following}
        currentTitle={player.track?.title ?? null}
        onHost={() => setHosting(true)}
        onStop={() => setHosting(false)}
        onJoin={(s) => { setFollowing(true); applySync(s); }}
        onLeave={() => { setFollowing(false); pause(); }}
      />

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
