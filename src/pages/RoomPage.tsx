import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Hash, Loader2, Mic, MicOff, PhoneOff, Play, Radio, Send, MessageCircle } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { usePlayer, getSnapshot, playTrack, seek, pause, toggle } from "@/lib/audioBus";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { VoiceSlotDot } from "@/components/VoiceSlotDot";
import { joinRoomVoiceSfu, type RoomVoiceSession } from "@/lib/livekitSfu";
import { patchWidgetPrefs } from "@/lib/vdock/widgetPrefs";
import { EMPTY_VOICE_SLOTS, type VoiceSlotSnapshot } from "@/lib/voiceSlots";
import { openFreeDm } from "@/lib/freeConnect";
import { useMessagePopout } from "@/lib/messagePopout";
import { Avatar } from "@/components/Avatar";
import { cx } from "@/lib/utils";
import type { Room, RoomMessage, RoomPresence } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const REACT_EMOJIS = ["🔥", "😂", "💜", "👏", "👀"] as const;

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ListenBar({ hosting, live, following, currentTitle, onHost, onStop, onJoin, onLeave }: {
  hosting: boolean; live: api.ListenState | null; following: boolean; currentTitle: string | null;
  onHost: () => void; onStop: () => void; onJoin: (s: api.ListenState) => void; onLeave: () => void;
}) {
  if (hosting) {
    return (
      <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-feel/25 bg-feel/[0.08] px-3 py-2 text-sm text-feel">
        <Radio className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="min-w-0 flex-1 truncate">Hosting listen-together</span>
        <button type="button" onClick={onStop} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white active:scale-95">Stop</button>
      </div>
    );
  }
  if (live && live.track) {
    return (
      <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-veil-400/30 bg-veil-500/[0.12] px-3 py-2 text-sm">
        <Radio className="h-4 w-4 shrink-0 animate-pulse text-veil-200" />
        <span className="min-w-0 flex-1 truncate text-white/90"><span className="font-semibold">{live.hostName ?? "Someone"}</span> · {live.track.title}</span>
        {following ? (
          <button type="button" onClick={onLeave} className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white active:scale-95">Leave</button>
        ) : (
          <button type="button" onClick={() => onJoin(live)} className="flex shrink-0 items-center gap-1 rounded-full bg-veil-500 px-2.5 py-1 text-xs font-semibold text-white active:scale-95"><Play className="h-3 w-3" /> Join</button>
        )}
      </div>
    );
  }
  if (currentTitle) {
    return (
      <button type="button" onClick={onHost} className="mx-3 mb-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-white/80 active:scale-[0.99]">
        <Radio className="h-4 w-4" /> Listen together
      </button>
    );
  }
  return null;
}

function VoiceBar({
  connected, muted, busy, speakers, slots, onJoin, onLeave, onToggleMute,
}: {
  connected: boolean; muted: boolean; busy: boolean; speakers: number; slots: VoiceSlotSnapshot;
  onJoin: () => void; onLeave: () => void; onToggleMute: () => void;
}) {
  if (!connected) {
    return (
      <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <Mic className="h-4 w-4 shrink-0 text-veil-200" />
        <span className="min-w-0 flex-1 text-sm text-white/75">Voice</span>
        <button type="button" disabled={busy} onClick={onJoin} className="cta-pill shrink-0 disabled:opacity-40">
          {busy ? "…" : "Join"}
        </button>
      </div>
    );
  }
  const occupied = [slots.green, slots.yellow, slots.pink].filter(Boolean);
  return (
    <div className="mx-3 mb-1 space-y-1.5 rounded-xl border border-white/12 bg-ink-950/50 px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Mic className={cx("h-4 w-4 shrink-0", muted ? "text-white/35" : "text-emerald-300")} />
        <span className="min-w-0 flex-1 truncate text-sm text-white/85">Voice · {speakers}</span>
        <button type="button" onClick={onToggleMute} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white active:scale-95" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onLeave} className="flex h-8 items-center gap-1 rounded-full border border-wild/40 bg-wild/25 px-2.5 text-xs font-semibold text-white active:scale-95">
          <PhoneOff className="h-3 w-3" /> Leave
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-6 text-[11px] text-white/55">
        {(["green", "yellow", "pink"] as const).map((c) => {
          const sp = slots[c];
          return (
            <span key={c} className="inline-flex items-center gap-1">
              <VoiceSlotDot color={c} pulse={!!sp} title={sp ? `${c}: ${sp.name}` : `${c} open`} />
              <span className="max-w-[5.5rem] truncate">{sp?.name ?? "—"}</span>
            </span>
          );
        })}
        {occupied.length === 0 && <span className="text-white/35">Waiting…</span>}
      </div>
    </div>
  );
}

function UserRail({
  online, selfId, onWhisper,
}: {
  online: RoomPresence[];
  selfId: string | null;
  onWhisper: (userId: string, username: string | null) => void;
}) {
  return (
    <aside className="hidden w-[4.75rem] shrink-0 flex-col border-r border-white/10 bg-ink-950/40 sm:flex" data-dark-stage>
      <p className="px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-white/35">
        {online.length}
      </p>
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-1.5 pb-3">
        {online.map((u) => (
          <button
            key={u.userId}
            type="button"
            disabled={u.userId === selfId}
            onClick={() => onWhisper(u.userId, u.username)}
            aria-label={u.username ? `Whisper ${u.username}` : "Whisper"}
            data-tip={u.username ?? "User"}
            className={cx(
              "relative mx-auto flex w-full flex-col items-center gap-0.5 rounded-xl p-1 transition",
              u.userId === selfId ? "opacity-70" : "hover:bg-white/[0.06] active:scale-95",
            )}
          >
            <span className="relative">
              <Avatar name={u.username} id={u.userId} size="sm" />
              <span className={cx(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-ink-950",
                u.typing ? "animate-pulse bg-[rgb(var(--neon-mint))]" : "bg-emerald-400",
              )} />
            </span>
            <span className="max-w-full truncate text-[9px] text-white/50">{u.username ?? "…"}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export function RoomPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, profile, showToast, refreshProfile } = useSession();
  const { openThread } = useMessagePopout();
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
  const [voiceSlots, setVoiceSlots] = useState<VoiceSlotSnapshot>(EMPTY_VOICE_SLOTS);
  const [subBusy, setSubBusy] = useState(false);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const onlineRef = useRef<RoomPresence[]>([]);
  useEffect(() => { onlineRef.current = online; }, [online]);
  const endRef = useRef<HTMLDivElement>(null);
  const audioHostRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<RoomVoiceSession | null>(null);
  const listenChRef = useRef<RealtimeChannel | null>(null);
  const presenceChRef = useRef<RealtimeChannel | null>(null);
  const hostingRef = useRef(false);
  const followingRef = useRef(false);
  const typingTimer = useRef<number | null>(null);
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
    presenceChRef.current = presence;
    return () => {
      alive = false;
      api.unsubscribe(ch);
      api.unsubscribe(presence);
      presenceChRef.current = null;
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

  function onType(v: string) {
    setText(v);
    if (!userId) return;
    void api.setRoomTyping(presenceChRef.current, { id: userId, username: profile?.username ?? null }, true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      void api.setRoomTyping(presenceChRef.current, { id: userId, username: profile?.username ?? null }, false);
    }, 1200);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (room?.canAccess === false) {
      showToast("Subscribe to message in this room");
      return;
    }
    setText("");
    if (userId) void api.setRoomTyping(presenceChRef.current, { id: userId, username: profile?.username ?? null }, false);
    await api.sendRoomMessage(id, body);
    await load();
  }

  async function react(messageId: string, emoji: string) {
    const ok = await api.toggleRoomReaction(messageId, emoji);
    setReactFor(null);
    if (ok) await load();
  }

  async function whisper(peerId: string, username: string | null) {
    if (!peerId || peerId === userId) return;
    const ok = await openFreeDm(peerId, openThread);
    showToast(ok ? `Whisper → @${username ?? "user"}` : "Couldn't open DM");
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
        resolveName: (identity) => {
          if (identity === userId) return profile?.username ?? "You";
          const hit = onlineRef.current.find((p) => p.userId === identity);
          return hit?.username ?? identity.slice(0, 8);
        },
        onVoiceSlots: (snap) => {
          setVoiceSlots(snap);
          patchWidgetPrefs({
            voiceSlots: {
              green: snap.green?.name ?? null,
              yellow: snap.yellow?.name ?? null,
              pink: snap.pink?.name ?? null,
            },
          });
        },
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
    setVoiceSlots(EMPTY_VOICE_SLOTS);
    patchWidgetPrefs({ voiceSlots: { green: null, yellow: null, pink: null } });
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
  const typingNames = online.filter((u) => u.typing && u.userId !== userId).map((u) => u.username ?? "…");

  useRegisterAppBar({
    title: room?.title ?? "Room",
    subtitle: locked ? "Premium" : `${online.length} online`,
  }, [room?.title, room?.canAccess, online.length, locked]);

  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-white/10 bg-ink-950/30" data-dark-stage>
      <div ref={audioHostRef} className="hidden" aria-hidden />
      <UserRail online={online} selfId={userId} onWhisper={(uid, name) => void whisper(uid, name)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile presence strip */}
        <div className="flex gap-2 overflow-x-auto border-b border-white/8 px-3 py-2 sm:hidden">
          {online.slice(0, 12).map((u) => (
            <button
              key={u.userId}
              type="button"
              disabled={u.userId === userId}
              onClick={() => void whisper(u.userId, u.username)}
              aria-label={u.username ?? "User"}
              className="relative shrink-0"
            >
              <Avatar name={u.username} id={u.userId} size="sm" />
              <span className={cx("absolute bottom-0 right-0 h-2 w-2 rounded-full border border-ink-950", u.typing ? "bg-[rgb(var(--neon-mint))]" : "bg-emerald-400")} />
            </button>
          ))}
        </div>

        {locked ? (
          <div className="mx-3 mb-2 mt-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-3 py-3 text-sm text-amber-50/90">
            <p className="font-medium">Premium room</p>
            <p className="mt-0.5 text-[12px] text-white/50">
              {room?.vcPrice ?? 0} V¢ / {room?.billingPeriod ?? "month"}
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={subBusy} onClick={() => void subscribe()} className="btn btn-primary h-8 px-3 text-xs disabled:opacity-40">
                {subBusy ? "…" : "Subscribe"}
              </button>
              <button type="button" onClick={() => navigate("/social")} className="btn btn-ghost h-8 px-3 text-xs">Back</button>
            </div>
          </div>
        ) : (
          <>
            {room?.voiceEnabled && (
              <div className="pt-2">
                <VoiceBar
                  connected={voiceConnected}
                  muted={voiceMuted}
                  busy={voiceBusy}
                  speakers={voiceSpeakers}
                  slots={voiceSlots}
                  onJoin={() => void joinVoice()}
                  onLeave={() => void leaveVoice()}
                  onToggleMute={() => void toggleMute()}
                />
              </div>
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
              <p className="text-sm font-semibold text-white/70">{room?.title}</p>
              <p className="text-xs">{locked ? "Subscribe to chat." : "Say hi."}</p>
            </div>
          ) : (
            msgs.map((m, i) => {
              const prev = msgs[i - 1];
              const grouped = prev && prev.senderId === m.senderId && m.createdAt - prev.createdAt < 5 * 60 * 1000;
              const reactions = m.reactions ?? {};
              return (
                <div key={m.id} className={cx("group flex flex-col", m.mine ? "items-end" : "items-start")}>
                  {!grouped && (
                    <span className="mb-0.5 flex items-center gap-1.5 px-1 text-[11px] text-white/40">
                      {voiceSlots.byId[m.senderId] && (
                        <VoiceSlotDot color={voiceSlots.byId[m.senderId]} title="Active voice slot" />
                      )}
                      {!m.mine && (
                        <button
                          type="button"
                          onClick={() => void whisper(m.senderId, m.senderName)}
                          className="font-semibold text-white/55 hover:text-[rgb(var(--neon-cyan))]"
                          aria-label={`Whisper ${m.senderName ?? "user"}`}
                        >
                          {m.senderName ?? "creator"}
                        </button>
                      )}
                      {m.mine ? "You" : null}
                      {" · "}{fmtTime(m.createdAt)}
                    </span>
                  )}
                  <div className="relative max-w-[80%]">
                    <div className={cx("rounded-2xl px-3.5 py-2 text-sm", m.mine ? "bg-[rgb(var(--neon-cyan)/0.22)] text-white" : "bg-white/[0.06] text-white/85")}>
                      {m.body}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {Object.entries(reactions).map(([emoji, users]) => (
                        users.length > 0 && (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => void react(m.id, emoji)}
                            className="rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-white/80"
                          >
                            {emoji} {users.length}
                          </button>
                        )
                      ))}
                      <button
                        type="button"
                        aria-label="React"
                        onClick={() => setReactFor(reactFor === m.id ? null : m.id)}
                        className="rounded-full px-1.5 py-0.5 text-[11px] text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-white/70"
                      >
                        +
                      </button>
                    </div>
                    {reactFor === m.id && (
                      <div className="absolute z-10 mt-1 flex gap-1 rounded-full border border-white/12 bg-ink-900/95 p-1 shadow-card">
                        {REACT_EMOJIS.map((e) => (
                          <button key={e} type="button" onClick={() => void react(m.id, e)} className="rounded-full px-1.5 py-0.5 text-sm hover:bg-white/10">{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {typingNames.length > 0 && (
          <p className="px-4 text-[11px] text-[rgb(var(--neon-mint))]">
            {typingNames.slice(0, 3).join(", ")} typing…
          </p>
        )}

        {!locked && (
          <form onSubmit={(e) => void send(e)} className="flex items-center gap-2 border-t border-white/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              aria-label="Whisper"
              data-tip="Whisper"
              onClick={() => showToast("Tap a name or avatar to whisper")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <input
              value={text}
              onChange={(e) => onType(e.target.value)}
              placeholder={`#${room?.title ?? "room"}`}
              className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[rgb(var(--neon-cyan)/0.5)] focus:outline-none"
            />
            <button type="submit" aria-label="Send" className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--neon-cyan))] text-ink-950 active:scale-90">
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
