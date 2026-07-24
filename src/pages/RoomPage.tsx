import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Hash, Loader2, Mic, MicOff, PhoneOff, Play, Radio, Send } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { usePlayer, getSnapshot, playTrack, seek, pause, toggle } from "@/lib/audioBus";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { joinRoomVoiceSfu, type RoomVoiceSession } from "@/lib/livekitSfu";
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
        <button type="button" onClick={onStop} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white active:scale-95">Stop</button>
      </div>
    );
  }
  if (live && live.track) {
    return (
      <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-veil-400/30 bg-veil-500/[0.12] px-3 py-2 text-sm">
        <Radio className="h-4 w-4 shrink-0 animate-pulse text-veil-200" />
        <span className="min-w-0 flex-1 truncate text-white/90"><span className="font-semibold">{live.hostName ?? "Someone"}</span> is playing <span className="text-veil-100">{live.track.title}</span></span>
        {following ? (
          <button type="button" onClick={onLeave} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white active:scale-95">Leave</button>
        ) : (
          <button type="button" onClick={() => onJoin(live)} className="flex shrink-0 items-center gap-1 rounded-full bg-veil-500 px-2.5 py-1 text-xs font-semibold text-white shadow-glow active:scale-95"><Play className="h-3 w-3" /> Join</button>
        )}
      </div>
    );
  }
  if (currentTitle) {
    return (
      <button type="button" onClick={onHost} className="mx-4 mb-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-white/80 active:scale-[0.99]">
        <Radio className="h-4 w-4" /> Listen together
      </button>
    );
  }
  return null;
}

function VoiceBar({
  connected,
  muted,
  busy,
  speakers,
  onJoin,
  onLeave,
  onToggleMute,
}: {
  connected: boolean;
  muted: boolean;
  busy: boolean;
  speakers: number;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
}) {
  if (!connected) {
    return (
      <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <Mic className="h-4 w-4 shrink-0 text-veil-200" />
        <span className="min-w-0 flex-1 text-sm text-white/75">Voice channel</span>
        <button
          type="button"
          disabled={busy}
          onClick={onJoin}
          className="shrink-0 rounded-full bg-veil-500 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
        >
          {busy ? "Joining…" : "Join voice"}
        </button>
      </div>
    );
  }
  return (
    <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-veil-400/35 bg-veil-500/[0.12] px-3 py-2">
      <Mic className={cx("h-4 w-4 shrink-0", muted ? "text-white/35" : "animate-pulse text-veil-100")} />
      <span className="min-w-0 flex-1 truncate text-sm text-white/85">
        In voice · {speakers} {speakers === 1 ? "person" : "people"}
      </span>
      <button
        type="button"
        onClick={onToggleMute}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white active:scale-95"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={onLeave}
        className="flex h-8 items-center gap-1 rounded-full bg-wild/80 px-2.5 text-xs font-semibold text-white active:scale-95"
      >
        <PhoneOff className="h-3 w-3" /> Leave
      </button>
    </div>
  );
}

export function RoomPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, profile, showToast, refreshProfile } = useSession();
  const player = usePlayer();
  const [room, setRoom] = useState<Room | null>(null);
  const [msgs, setMsgs] = useState<RoomMessage[]>([]);
  const [online, setOnline] = useState<RoomPresence[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [listen, setListen] = useState<api.ListenState | null>(null);
  const [hosting, setHosting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceSpeakers, setVoiceSpeakers] = useState(0);
  const [subBusy, setSubBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const audioHostRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<RoomVoiceSession | null>(null);
  const listenChRef = useRef<RealtimeChannel | null>(null);
  const hostingRef = useRef(false);
  const followingRef = useRef(false);
  useEffect(() => { hostingRef.current = hosting; }, [hosting]);
  useEffect(() => { followingRef.current = following; }, [following]);

  async function load() { setMsgs(await api.listRoomMessages(id)); }

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
    return () => {
      alive = false;
      api.unsubscribe(ch);
      api.unsubscribe(presence);
      void voiceRef.current?.disconnect();
      voiceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

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

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (room?.canAccess === false) {
      showToast("Subscribe to message in this room");
      return;
    }
    setText("");
    await api.sendRoomMessage(id, body);
    await load();
  }

  async function joinVoice() {
    if (!room?.voiceEnabled || room.canAccess === false) return;
    setVoiceBusy(true);
    try {
      await api.ensureRoomVoiceChannel(id);
      const session = await joinRoomVoiceSfu({
        roomId: id,
        audioHost: audioHostRef.current,
        onParticipantCount: (n) => setVoiceSpeakers(n),
      });
      if (!session.connected) {
        showToast(session.error === "forbidden" ? "No access to voice" : "Voice unavailable");
        setVoiceBusy(false);
        return;
      }
      voiceRef.current = session;
      setVoiceConnected(true);
      setVoiceMuted(session.muted);
    } finally {
      setVoiceBusy(false);
    }
  }

  async function leaveVoice() {
    await voiceRef.current?.disconnect();
    voiceRef.current = null;
    setVoiceConnected(false);
    setVoiceMuted(false);
    setVoiceSpeakers(0);
  }

  async function toggleMute() {
    const next = !voiceMuted;
    await voiceRef.current?.setMuted(next);
    setVoiceMuted(next);
  }

  async function subscribe() {
    setSubBusy(true);
    try {
      const mid = await api.subscribeRoomVc(id);
      if (mid) {
        showToast("Subscribed with V¢");
        await refreshProfile();
        const r = await api.getRoom(id);
        setRoom(r);
      } else showToast("Couldn't subscribe");
    } catch {
      showToast("Not enough V¢");
    } finally {
      setSubBusy(false);
    }
  }

  const locked = room?.kind === "social" && room.canAccess === false;

  useRegisterAppBar({
    title: room?.title ?? "Room",
    subtitle: locked
      ? "Premium · V¢"
      : `${online.length} online${room?.voiceEnabled ? " · voice" : ""}`,
  }, [room?.title, room?.voiceEnabled, room?.canAccess, online.length, locked]);

  return (
    <div className="flex h-full flex-col">
      <div ref={audioHostRef} className="hidden" aria-hidden />

      {locked ? (
        <div className="mx-4 mb-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-3 py-3 text-sm text-amber-50/90">
          <p className="font-medium">Premium room</p>
          <p className="mt-0.5 text-[12px] text-white/50">
            {room?.vcPrice ?? 0} V¢ / {room?.billingPeriod ?? "month"} · closed-loop credits
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={subBusy} onClick={() => void subscribe()} className="btn btn-primary h-8 px-3 text-xs disabled:opacity-40">
              {subBusy ? "…" : "Subscribe"}
            </button>
            <button type="button" onClick={() => navigate("/social")} className="btn btn-ghost h-8 px-3 text-xs">
              Back to Social
            </button>
          </div>
        </div>
      ) : (
        <>
          {room?.voiceEnabled && (
            <VoiceBar
              connected={voiceConnected}
              muted={voiceMuted}
              busy={voiceBusy}
              speakers={voiceSpeakers}
              onJoin={() => void joinVoice()}
              onLeave={() => void leaveVoice()}
              onToggleMute={() => void toggleMute()}
            />
          )}
          {room?.kind !== "social" && (
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
          )}
        </>
      )}

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : msgs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-white/40">
            <Hash className="mb-2 h-8 w-8 text-white/20" />
            <p className="text-sm">This is the start of <span className="font-semibold text-white/70">{room?.title}</span>.</p>
            <p className="text-xs">{locked ? "Subscribe to read and chat." : "Say hi and find collaborators."}</p>
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

      {!locked && (
        <form onSubmit={(e) => void send(e)} className="flex items-center gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message #${room?.title ?? "room"}…`}
            className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow active:scale-90"><Send className="h-4 w-4" /></button>
        </form>
      )}
    </div>
  );
}
