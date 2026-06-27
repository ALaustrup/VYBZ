import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import {
  joinLifelineRoom,
  lifelineCancel,
  lifelineCountAvailable,
  lifelineEnd,
  lifelineMintVoiceToken,
  lifelineRequest,
  subscribeLifelineMatch,
  type LifelineMsg,
  type LifelineSession,
  type LifelineSignal,
} from "@/lib/backend";
import { voiceJoin } from "@/lib/live";
import { CRISIS_RESOURCES } from "@/lib/safety";
import { cx, haptic } from "@/lib/utils";

/**
 * Lifelines — peer support that turns a confession into a person.
 *
 * IMPORTANT (every surface here repeats this):
 *   This is PEER support, not professional crisis services. If you are in
 *   immediate danger, call 988 (US) or your local emergency number.
 *
 * Flow: user opens the sheet → sees count of Lifelines on shift right now +
 * the 988 escalation always one tap away → requests → either matches instantly
 * or waits in queue → enters an ephemeral text room (messages NEVER stored) →
 * either party can end at any time. Real-world danger always has 988.
 */
export function LifelineSheet() {
  const { lifelineOpen, closeLifeline, profileId, showToast } = useApp();
  const [phase, setPhase] = useState<"intro" | "searching" | "chatting" | "ineligible">("intro");
  const [available, setAvailable] = useState<number | null>(null);
  const [session, setSession] = useState<LifelineSession | null>(null);
  const [lines, setLines] = useState<LifelineMsg[]>([]);
  const [draft, setDraft] = useState("");
  const sessionRef = useRef<LifelineSession | null>(null);
  const roomRef = useRef<ReturnType<typeof joinLifelineRoom> | null>(null);
  const matchUnsubRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice (opt-in, mutual consent, audio-only).
  type VoiceState = "off" | "offering" | "incoming" | "connecting" | "live";
  const [voice, setVoice] = useState<VoiceState>("off");
  const [muted, setMuted] = useState<boolean>(false);
  const voiceRef = useRef<Awaited<ReturnType<typeof voiceJoin>> | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  // Forward references so enterChat (declared first) can call voice handlers
  // (defined after); avoids "used before declared" temporal-dead-zone errors.
  const startVoiceRef = useRef<() => Promise<void>>(async () => {});
  const endVoiceRef = useRef<(announce: boolean) => Promise<void>>(async () => {});

  // Refresh the on-shift count on open + every 10s while waiting.
  useEffect(() => {
    if (!lifelineOpen) return;
    let alive = true;
    const refresh = () =>
      void lifelineCountAvailable("en").then((n) => alive && setAvailable(n));
    refresh();
    const t = window.setInterval(refresh, 10_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [lifelineOpen]);

  const teardownRoom = useCallback((announce: boolean) => {
    roomRef.current?.leave(announce);
    roomRef.current = null;
    matchUnsubRef.current?.();
    matchUnsubRef.current = null;
  }, []);

  const enterChat = useCallback(
    (s: LifelineSession) => {
      if (sessionRef.current?.sessionId === s.sessionId) return;
      sessionRef.current = s;
      setSession(s);
      setLines([]);
      setPhase("chatting");
      haptic(15);
      matchUnsubRef.current?.();
      matchUnsubRef.current = null;

      roomRef.current = joinLifelineRoom(
        s.sessionId,
        profileId ?? "me",
        (m) => setLines((prev) => [...prev, m]),
        () => {
          showToast("They've stepped away. You can keep writing or call 988 anytime.");
        },
        (sig: LifelineSignal) => {
          if (sig.kind === "voice-offer") setVoice("incoming");
          else if (sig.kind === "voice-accept") {
            // Our offer was accepted — both sides connect to the same room.
            void startVoiceRef.current();
          } else if (sig.kind === "voice-decline") {
            setVoice("off");
            showToast("They prefer to keep it as text.");
          } else if (sig.kind === "voice-end") {
            void endVoiceRef.current(false);
          }
        }
      );
    },
    [profileId, showToast]
  );

  const begin = useCallback(async () => {
    setPhase("searching");
    const { session: s, waiting } = await lifelineRequest("en");
    if (s) {
      enterChat(s);
      return;
    }
    if (!waiting) {
      setPhase("ineligible");
      return;
    }
    // Wait for a Lifeline to come on shift.
    matchUnsubRef.current?.();
    matchUnsubRef.current = subscribeLifelineMatch(profileId ?? "", (m) => enterChat(m));
  }, [enterChat, profileId]);

  const cancelWait = useCallback(async () => {
    matchUnsubRef.current?.();
    matchUnsubRef.current = null;
    await lifelineCancel();
    setPhase("intro");
  }, []);

  const endVoice = useCallback(
    async (announce: boolean) => {
      const v = voiceRef.current;
      voiceRef.current = null;
      if (v) await v.disconnect();
      setVoice("off");
      setMuted(false);
      if (announce) roomRef.current?.signal({ kind: "voice-end" });
    },
    []
  );

  const startVoiceConnection = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    setVoice("connecting");
    const t = await lifelineMintVoiceToken(s.sessionId);
    if (!t || !remoteAudioRef.current) {
      setVoice("off");
      showToast("Couldn't start voice. The text chat is still on.");
      return;
    }
    try {
      const v = await voiceJoin({
        url: t.url,
        token: t.token,
        remoteAudioEl: remoteAudioRef.current,
        onStatus: (st) => {
          if (st === "live") setVoice("live");
          else if (st === "ended") void endVoice(false);
          else if (st === "error") {
            setVoice("off");
            showToast("Voice connection failed. Text is still on.");
          }
        },
      });
      voiceRef.current = v;
    } catch {
      setVoice("off");
      showToast("Couldn't start voice. The text chat is still on.");
    }
  }, [endVoice, showToast]);

  // Keep the forward-refs current (enterChat reads them on incoming signals).
  startVoiceRef.current = startVoiceConnection;
  endVoiceRef.current = endVoice;

  const offerVoice = useCallback(() => {
    if (!roomRef.current || voice !== "off") return;
    setVoice("offering");
    roomRef.current.signal({ kind: "voice-offer" });
    showToast("Voice offer sent — waiting for them to accept.");
  }, [voice, showToast]);

  const acceptVoice = useCallback(async () => {
    if (!roomRef.current) return;
    roomRef.current.signal({ kind: "voice-accept" });
    await startVoiceConnection();
  }, [startVoiceConnection]);

  const declineVoice = useCallback(() => {
    roomRef.current?.signal({ kind: "voice-decline" });
    setVoice("off");
  }, []);

  const toggleMute = useCallback(() => {
    const v = voiceRef.current;
    if (!v) return;
    const next = !muted;
    setMuted(next);
    void v.setMuted(next);
  }, [muted]);

  const endSession = useCallback(
    async (reason: "requester" | "988_handoff" = "requester") => {
      await endVoice(false);
      const s = sessionRef.current;
      sessionRef.current = null;
      teardownRoom(true);
      if (s) await lifelineEnd(s.sessionId, reason);
      setSession(null);
      setLines([]);
      setPhase("intro");
    },
    [teardownRoom, endVoice]
  );

  function send() {
    const clean = draft.trim().slice(0, 500);
    if (!clean || !roomRef.current || !profileId) return;
    roomRef.current.send(clean);
    setLines((prev) => [...prev, { from: profileId, text: clean, t: Date.now() }]);
    setDraft("");
    setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 30);
  }

  // Tear everything down on unmount / close.
  useEffect(() => {
    if (!lifelineOpen) {
      teardownRoom(false);
      sessionRef.current = null;
      matchUnsubRef.current?.();
      matchUnsubRef.current = null;
      setPhase("intro");
      setSession(null);
      setLines([]);
      setDraft("");
    }
    return () => {
      teardownRoom(false);
    };
  }, [lifelineOpen, teardownRoom]);

  function close() {
    if (sessionRef.current) void endSession("requester");
    else if (phase === "searching") void cancelWait();
    closeLifeline();
  }

  return (
    <AnimatePresence>
      {lifelineOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[63] bg-black/85 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[63] mx-auto flex h-[92%] max-w-md flex-col rounded-t-3xl border-t border-feel/30 bg-ink-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-feel" />
                <h2 className="font-display text-lg font-bold text-white">Lifelines</h2>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Always-visible 988 escalation. */}
            <a
              href={CRISIS_RESOURCES.callHref}
              className="mx-5 mt-3 flex items-center justify-center gap-2 rounded-2xl bg-feel/15 px-4 py-3 text-sm font-semibold text-feel ring-1 ring-feel/30 active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              In immediate danger? Call or text 988 (US)
            </a>
            <p className="mx-5 mt-2 text-center text-[11px] leading-relaxed text-white/45">
              Lifelines are <span className="font-semibold text-white/70">peer support</span>{" "}
              — kind humans listening. Not therapy or emergency services.
            </p>

            <div className="min-h-0 flex-1 overflow-hidden">
              {phase === "intro" && (
                <IntroView
                  available={available}
                  onBegin={begin}
                />
              )}
              {phase === "searching" && <SearchingView available={available} onCancel={cancelWait} />}
              {phase === "ineligible" && <IneligibleView onClose={close} />}
              {phase === "chatting" && session && (
                <ChatView
                  meId={profileId ?? ""}
                  lines={lines}
                  draft={draft}
                  setDraft={setDraft}
                  send={send}
                  end={() => void endSession("requester")}
                  scrollRef={scrollRef}
                  voice={voice}
                  muted={muted}
                  onOfferVoice={offerVoice}
                  onAcceptVoice={acceptVoice}
                  onDeclineVoice={declineVoice}
                  onToggleMute={toggleMute}
                  onEndVoice={() => void endVoice(true)}
                  remoteAudioRef={remoteAudioRef}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function IntroView({
  available,
  onBegin,
}: {
  available: number | null;
  onBegin: () => void;
}) {
  return (
    <div className="flex h-full flex-col px-5 pb-6 pt-4">
      <p className="text-[15px] leading-relaxed text-white/75">
        You don't have to be in danger to reach out. A Lifeline is a vetted
        volunteer who'll listen — for a minute, or an hour. Anonymous on both
        sides. The conversation is never recorded.
      </p>
      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/70">
        <span className="flex items-center gap-1.5 text-feel">
          <Sparkles className="h-4 w-4" />
          {available === null
            ? "Checking who's around…"
            : available === 0
              ? "No Lifelines on shift this moment — but we'll find one as soon as someone comes online."
              : `${available} ${available === 1 ? "Lifeline is" : "Lifelines are"} on shift right now.`}
        </span>
      </div>
      <button
        onClick={onBegin}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-feel py-4 font-display text-lg font-bold text-black shadow-glow active:scale-[0.98]"
      >
        <Heart className="h-5 w-5" /> Talk to someone now
      </button>
      <p className="mt-3 text-center text-[11px] text-white/40">
        Closes anytime. Either of you can end the chat with no awkwardness.
      </p>
    </div>
  );
}

function SearchingView({
  available,
  onCancel,
}: {
  available: number | null;
  onCancel: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-feel" />
      <p className="mt-4 text-sm leading-relaxed text-white/70">
        {available && available > 0
          ? "Finding a Lifeline who matches your age layer and language…"
          : "No one's on shift right this second. Staying open — we'll connect you the moment a Lifeline arrives."}
      </p>
      <button
        onClick={onCancel}
        className="mt-6 rounded-full border border-white/12 px-5 py-2 text-sm font-semibold text-white/70 active:scale-95"
      >
        Cancel
      </button>
    </div>
  );
}

function IneligibleView({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <ShieldAlert className="h-7 w-7 text-wild" />
      <p className="mt-3 text-sm leading-relaxed text-white/70">
        We need a verified account and a permanent age to safely match you with a
        Lifeline. Tap below to set that up — your information is private.
      </p>
      <p className="mt-3 text-[12px] text-white/50">
        If you can't wait, please call <span className="font-semibold text-feel">988</span>{" "}
        (US) or your local emergency number.
      </p>
      <button onClick={onClose} className="mt-5 rounded-full bg-veil-500 px-5 py-2 text-sm font-semibold text-white">
        Close
      </button>
    </div>
  );
}

function ChatView({
  meId,
  lines,
  draft,
  setDraft,
  send,
  end,
  scrollRef,
  voice,
  muted,
  onOfferVoice,
  onAcceptVoice,
  onDeclineVoice,
  onToggleMute,
  onEndVoice,
  remoteAudioRef,
}: {
  meId: string;
  lines: LifelineMsg[];
  draft: string;
  setDraft: (s: string) => void;
  send: () => void;
  end: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  voice: "off" | "offering" | "incoming" | "connecting" | "live";
  muted: boolean;
  onOfferVoice: () => void;
  onAcceptVoice: () => void;
  onDeclineVoice: () => void;
  onToggleMute: () => void;
  onEndVoice: () => void;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
}) {
  // Local ref retained for type-compat with React's strict ref typing.
  const local = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (local.current) (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = local.current;
  });
  return (
    <div className="flex h-full flex-col">
      {/* Hidden audio element where the peer's voice attaches. */}
      <audio
        ref={(el) => {
          (remoteAudioRef as React.MutableRefObject<HTMLAudioElement | null>).current = el;
        }}
        autoPlay
        playsInline
      />

      {/* Voice strip — collapses to a single "Offer voice" pill when off. */}
      <VoiceStrip
        voice={voice}
        muted={muted}
        onOfferVoice={onOfferVoice}
        onAcceptVoice={onAcceptVoice}
        onDeclineVoice={onDeclineVoice}
        onToggleMute={onToggleMute}
        onEndVoice={onEndVoice}
      />

      <div ref={local} className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-3">
        <div className="mx-auto max-w-xs rounded-xl bg-feel/10 px-3 py-2 text-center text-[11px] text-feel/90 ring-1 ring-feel/20">
          You're connected. This conversation isn't recorded. Take your time.
        </div>
        {lines.map((m, i) => (
          <div
            key={i}
            className={cx(
              "flex",
              m.from === meId ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cx(
                "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
                m.from === meId
                  ? "rounded-br-md bg-veil-500 text-white"
                  : "rounded-bl-md bg-white/8 text-white/90"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/8">
        <div className="flex items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type whatever you want…"
            className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-feel/60 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            aria-label="Send"
            className={cx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90",
              draft.trim() ? "bg-feel text-black shadow-glow" : "bg-white/5 text-white/30"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={end}
          className="w-full border-t border-white/8 py-2.5 text-[12px] font-semibold text-white/45 active:bg-white/[0.03]"
        >
          End conversation
        </button>
      </div>
    </div>
  );
}

function VoiceStrip({
  voice,
  muted,
  onOfferVoice,
  onAcceptVoice,
  onDeclineVoice,
  onToggleMute,
  onEndVoice,
}: {
  voice: "off" | "offering" | "incoming" | "connecting" | "live";
  muted: boolean;
  onOfferVoice: () => void;
  onAcceptVoice: () => void;
  onDeclineVoice: () => void;
  onToggleMute: () => void;
  onEndVoice: () => void;
}) {
  if (voice === "off") {
    return (
      <div className="border-b border-white/8 px-4 py-2">
        <button
          onClick={onOfferVoice}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-feel/40 bg-feel/10 py-2 text-xs font-semibold text-feel active:scale-[0.98]"
        >
          <Phone className="h-3.5 w-3.5" />
          Offer to switch to voice (audio only · no recording)
        </button>
      </div>
    );
  }
  if (voice === "offering") {
    return (
      <div className="flex items-center gap-2 border-b border-white/8 bg-feel/[0.06] px-4 py-2 text-xs text-feel">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Voice offer sent — waiting for them.
      </div>
    );
  }
  if (voice === "incoming") {
    return (
      <div className="flex items-center justify-between gap-2 border-b border-feel/30 bg-feel/[0.08] px-4 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-feel">
          <Phone className="h-3.5 w-3.5" /> They'd like to talk by voice
        </span>
        <span className="flex gap-1.5">
          <button
            onClick={onDeclineVoice}
            className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 active:scale-95"
          >
            Stay on text
          </button>
          <button
            onClick={onAcceptVoice}
            className="flex items-center gap-1 rounded-full bg-feel px-3 py-1 text-[11px] font-bold text-black shadow-glow active:scale-95"
          >
            <Phone className="h-3 w-3" /> Accept
          </button>
        </span>
      </div>
    );
  }
  if (voice === "connecting") {
    return (
      <div className="flex items-center gap-2 border-b border-white/8 bg-feel/[0.06] px-4 py-2 text-xs text-feel">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Connecting voice…
      </div>
    );
  }
  // voice === "live"
  return (
    <div className="flex items-center justify-between gap-2 border-b border-feel/30 bg-feel/[0.08] px-4 py-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-feel">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-feel/60" />
          <span className="relative inline-block h-2 w-2 rounded-full bg-feel" />
        </span>
        Voice connected — audio only, nothing recorded
      </span>
      <span className="flex gap-1.5">
        <button
          onClick={onToggleMute}
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-full transition active:scale-90",
            muted ? "bg-wild/20 text-wild ring-1 ring-wild/40" : "bg-white/10 text-white/70"
          )}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onEndVoice}
          className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 active:scale-95"
          aria-label="End voice"
        >
          <PhoneOff className="h-3 w-3" /> End voice
        </button>
      </span>
    </div>
  );
}
