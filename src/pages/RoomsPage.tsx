import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  Flag,
  ImagePlus,
  MessageCircle,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { FriendStatus } from "@/types";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { FALLBACK_ROOMS, SEED_ROOM_MESSAGES } from "@/data/rooms";
import { IdentityMeta } from "@/components/IdentityMeta";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { fileToCompressedDataURL } from "@/lib/image";
import { avatarGradient, cx, timeAgo } from "@/lib/utils";
import type { Room, RoomMessage, RoomPresence } from "@/types";

function Avatar({
  alias,
  aura,
  size = 30,
}: {
  alias: string;
  aura: string;
  size?: number;
}) {
  const g = avatarGradient(alias || aura);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white/90"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${g[0]}, ${g[1]})`,
      }}
    >
      {(
        alias.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function ModBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-veil-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-veil-200">
      <ShieldCheck className="h-2.5 w-2.5" />
      MOD
    </span>
  );
}

/** A shared chat image. Clear by default; AI-suggested NSFW blurs per-user. */
function ChatImage({
  message,
  hidden,
  onReveal,
}: {
  message: RoomMessage;
  hidden: boolean;
  onReveal: (id: string) => void;
}) {
  return (
    <div className="relative mt-1 h-52 w-full overflow-hidden rounded-2xl border border-white/10">
      <VeiledPhoto
        src={message.imageUrl as string}
        level={hidden ? 0.06 : 1}
        nsfw={hidden}
      />
      {hidden && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            NSFW
          </span>
          <button
            onClick={() => onReveal(message.id)}
            className="flex items-center gap-1.5 rounded-full border border-white/40 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur active:scale-95"
          >
            <Eye className="h-3.5 w-3.5" /> Unveil
          </button>
        </div>
      )}
    </div>
  );
}

function MessageRow({
  m,
  nsfwHidden,
  onReveal,
  onReport,
}: {
  m: RoomMessage;
  nsfwHidden: boolean;
  onReveal: (id: string) => void;
  onReport: (m: RoomMessage) => void;
}) {
  const isMod = m.senderKind === "mod" || m.senderKind === "system";

  if (isMod) {
    return (
      <div className="my-2 rounded-2xl border border-veil-500/25 bg-veil-500/10 p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-veil-200">{m.alias}</span>
          <ModBadge />
        </div>
        <p className="text-sm leading-relaxed text-white/80">{m.body}</p>
      </div>
    );
  }

  return (
    <div className={cx("flex gap-2.5", m.mine && "flex-row-reverse")}>
      {!m.mine && <Avatar alias={m.alias} aura={m.aura} />}
      <div className={cx("min-w-0 max-w-[78%]", m.mine && "items-end")}>
        {!m.mine && (
          <div className="mb-0.5 flex items-center gap-1.5 px-1">
            <span className="truncate text-[11px] font-semibold text-white/55">
              {m.alias}
            </span>
            <span className="text-[10px] text-white/25">{timeAgo(m.createdAt)}</span>
          </div>
        )}
        {m.body && (
          <div
            className={cx(
              "rounded-2xl px-3.5 py-2 text-[15px] leading-snug",
              m.mine
                ? "bg-veil-500 text-white"
                : "bg-white/[0.06] text-white/90"
            )}
          >
            {m.body}
          </div>
        )}
        {m.imageUrl && (
          <ChatImage message={m} hidden={nsfwHidden} onReveal={onReveal} />
        )}
        {!m.mine && (
          <button
            onClick={() => onReport(m)}
            className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-white/25 transition active:text-wild"
          >
            <Flag className="h-2.5 w-2.5" /> Report
          </button>
        )}
      </div>
    </div>
  );
}

function FriendAction({
  peerId,
  alias,
  aura,
  status,
  onAdd,
  onAccept,
  onMessage,
}: {
  peerId: string;
  alias: string;
  aura: string;
  status: FriendStatus;
  onAdd: (peerId: string, meta?: { alias?: string; aura?: string }) => void;
  onAccept: (peerId: string) => void;
  onMessage: (peer: { id: string; alias: string; aura: string }) => void;
}) {
  if (status === "friends") {
    return (
      <button
        onClick={() => onMessage({ id: peerId, alias, aura })}
        className="flex items-center gap-1 rounded-full bg-veil-500 px-3 py-1 text-[11px] font-semibold text-white active:scale-95"
      >
        <MessageCircle className="h-3 w-3" /> Message
      </button>
    );
  }
  if (status === "requested") {
    return (
      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/40">
        Pending
      </span>
    );
  }
  if (status === "incoming") {
    return (
      <button
        onClick={() => onAccept(peerId)}
        className="rounded-full bg-veil-500 px-3 py-1 text-[11px] font-semibold text-white active:scale-95"
      >
        Accept
      </button>
    );
  }
  return (
    <button
      onClick={() => onAdd(peerId, { alias, aura })}
      className="flex items-center gap-1 rounded-full border border-veil-400/50 px-2.5 py-1 text-[11px] font-semibold text-veil-200 active:scale-95"
    >
      <UserPlus className="h-3 w-3" /> Add
    </button>
  );
}

type Tab = "chat" | "people";

export function RoomsPage() {
  const {
    account,
    profileId,
    backendEnabled,
    report,
    showToast,
    friendStatusById,
    addFriendById,
    acceptFriendById,
    openFriendChat,
    nsfwOptIn,
    identity,
    identityPublic,
  } = useApp();
  const myAlias = account?.alias ?? "Anonymous";
  const myAura = account?.aura ?? "veil";

  // The room to open is chosen in the Chat hub and passed via ?room=<id>.
  const [searchParams] = useSearchParams();
  const initialRoom = searchParams.get("room") ?? FALLBACK_ROOMS[0].id;
  // Two-column (chat + people) when there's room for it (landscape / wide).
  const wide = useMediaQuery("(min-width: 768px)");

  const [rooms, setRooms] = useState<Room[]>(FALLBACK_ROOMS);
  const [activeRoom, setActiveRoom] = useState<string>(initialRoom);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [people, setPeople] = useState<RoomPresence[]>([]);
  const [tab, setTab] = useState<Tab>("chat");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Per-device reveals of NSFW-suggested chat images.
  const [revealedImgs, setRevealedImgs] = useState<string[]>([]);

  const revealImg = (id: string) =>
    setRevealedImgs((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const imgHidden = (m: RoomMessage) =>
    !!m.imageUrl && !!m.nsfw && !nsfwOptIn && !revealedImgs.includes(m.id);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load the room list (backend or fallback).
  useEffect(() => {
    if (!backendEnabled) return;
    void backend.fetchRooms().then((r) => {
      if (r.length) setRooms(r);
    });
  }, [backendEnabled]);

  // Follow the ?room= chosen in the hub (and when it changes).
  useEffect(() => {
    const r = searchParams.get("room");
    if (r) setActiveRoom(r);
  }, [searchParams]);

  // Load + subscribe to the active room (messages + presence).
  useEffect(() => {
    setTab("chat");
    if (!backendEnabled) {
      setMessages(SEED_ROOM_MESSAGES[activeRoom] ?? []);
      setPeople(profileId ? [{ id: profileId, alias: myAlias, aura: myAura }] : []);
      return;
    }
    let cancelled = false;
    void backend.fetchRoomMessages(activeRoom, profileId).then((m) => {
      if (!cancelled) setMessages(m);
    });
    const unsubMsg = backend.subscribeRoomMessages(activeRoom, profileId, (m) =>
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m]
      )
    );
    const leave = profileId
      ? backend.joinRoomPresence(
          activeRoom,
          {
            id: profileId,
            alias: myAlias,
            aura: myAura,
            // Only broadcast details when the user has chosen to be public.
            ...(identityPublic
              ? {
                  gender: identity.gender,
                  age: identity.age,
                  location: identity.location,
                }
              : {}),
          },
          setPeople
        )
      : () => {};
    return () => {
      cancelled = true;
      unsubMsg();
      leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, backendEnabled, profileId]);

  // Keep the chat pinned to the newest message.
  useEffect(() => {
    if (tab === "chat") {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [messages, tab]);

  const activeRoomMeta = useMemo(
    () => rooms.find((r) => r.id === activeRoom),
    [rooms, activeRoom]
  );

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setText("");
    if (!backendEnabled || !profileId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          roomId: activeRoom,
          senderId: profileId,
          senderKind: "user",
          alias: myAlias,
          aura: myAura,
          body,
          unveils: 0,
          veils: 0,
          createdAt: Date.now(),
          mine: true,
        },
      ]);
      return;
    }
    setSending(true);
    const ok = await backend.sendRoomMessage({
      roomId: activeRoom,
      senderId: profileId,
      alias: myAlias,
      aura: myAura,
      body,
    });
    setSending(false);
    if (!ok) showToast("Couldn't send. Try again.");
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let dataUrl: string;
    try {
      dataUrl = await fileToCompressedDataURL(file);
    } catch {
      return;
    }
    if (!backendEnabled || !profileId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          roomId: activeRoom,
          senderId: profileId,
          senderKind: "user",
          alias: myAlias,
          aura: myAura,
          imageUrl: dataUrl,
          unveils: 0,
          veils: 0,
          createdAt: Date.now(),
          mine: true,
        },
      ]);
      return;
    }
    setSending(true);
    const url = await backend.uploadConfessionPhoto(dataUrl, profileId);
    if (url) {
      // AI suggests NSFW (never enforced) for shared images.
      const nsfw = await backend.moderateImage(url);
      await backend.sendRoomMessage({
        roomId: activeRoom,
        senderId: profileId,
        alias: myAlias,
        aura: myAura,
        imageUrl: url,
        nsfw,
      });
    } else {
      showToast("Image upload failed.");
    }
    setSending(false);
  }

  function reportMessage(m: RoomMessage) {
    report("message", m.id, "room message");
  }

  const peopleList = backendEnabled && people.length
    ? people
    : [{ id: profileId ?? "me", alias: myAlias, aura: myAura } as RoomPresence];

  const chatBody = (
    <>
      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 pb-2"
      >
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-white/35">
            No messages yet. Say something.
          </p>
        )}
        {messages.map((m) => (
          <MessageRow
            key={m.id}
            m={m}
            nsfwHidden={imgHidden(m)}
            onReveal={revealImg}
            onReport={reportMessage}
          />
        ))}
      </div>

      {/* Composer. */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={pickImage}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Share a photo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full glass text-veil-200 active:scale-90"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={`Message ${activeRoomMeta?.name ?? "the room"}…`}
          className="h-11 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow transition active:scale-90 disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </>
  );

  const peopleBody = (
    <>
      <p className="mb-3 text-xs uppercase tracking-wider text-white/40">
        In this room now
      </p>
      <div className="space-y-2">
        {peopleList.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3"
          >
            <Avatar alias={p.alias} aura={p.aura} size={36} />
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-white">
                {p.alias}
                {p.id === profileId && (
                  <span className="text-[11px] font-normal text-white/40">
                    (you)
                  </span>
                )}
              </span>
              <IdentityMeta
                gender={p.gender}
                age={p.age}
                location={p.location}
                size="sm"
                className="mt-0.5"
              />
            </div>
            {backendEnabled && p.id !== profileId && (
              <FriendAction
                peerId={p.id}
                alias={p.alias}
                aura={p.aura}
                status={friendStatusById(p.id)}
                onAdd={addFriendById}
                onAccept={acceptFriendById}
                onMessage={openFriendChat}
              />
            )}
          </div>
        ))}
      </div>
      {backendEnabled && (
        <p className="mt-4 text-center text-[11px] text-white/30">
          A disclosed <span className="text-veil-200">MOD</span> agent helps keep
          this room safe.
        </p>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Room header with back-to-hub. */}
      <div className="flex items-center gap-3 px-4 pb-2 pt-1">
        <Link
          to="/chat"
          aria-label="Back to chat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold text-white">
            {activeRoomMeta?.name ?? "Room"}
          </p>
          <p className="truncate text-xs text-white/40">
            {activeRoomMeta?.topic}
          </p>
        </div>
        {wide ? (
          <span className="flex shrink-0 items-center gap-1 text-xs text-white/45">
            <Users className="h-3.5 w-3.5" />
            {backendEnabled ? people.length || 1 : 1}
          </span>
        ) : (
          <div className="flex shrink-0 rounded-full border border-white/10 p-0.5">
            <button
              onClick={() => setTab("chat")}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                tab === "chat" ? "bg-veil-500/30 text-white" : "text-white/45"
              )}
            >
              Chat
            </button>
            <button
              onClick={() => setTab("people")}
              className={cx(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition",
                tab === "people" ? "bg-veil-500/30 text-white" : "text-white/45"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              {backendEnabled ? people.length || 1 : 1}
            </button>
          </div>
        )}
      </div>

      {/* Body — two columns in landscape, tabbed on mobile portrait. */}
      {wide ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col border-r border-white/8">
            {chatBody}
          </div>
          <div className="no-scrollbar w-72 shrink-0 overflow-y-auto px-4 pb-4 pt-1">
            {peopleBody}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === "chat" ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {chatBody}
            </motion.div>
          ) : (
            <motion.div
              key="people"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="no-scrollbar flex-1 overflow-y-auto px-4 pb-4"
            >
              {peopleBody}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
