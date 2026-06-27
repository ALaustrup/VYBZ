import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  Coins,
  Flag,
  Loader2,
  MessageCircle,
  Mic,
  Radio,
  Send,
  ShieldAlert,
  StopCircle,
  Video,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { VerifyGate } from "@/components/VerifyGate";
import { Handle } from "@/components/Handle";
import {
  fetchLiveCarousel,
  joinLiveChat,
  liveEnd,
  liveMintToken,
  liveReact,
  liveReport,
  liveStart,
  tipStreamer,
  type LiveChatMsg,
  type LiveStream,
} from "@/lib/backend";
import { publish, watch, type LiveConnect, type LiveStatus } from "@/lib/live";
import { cx, haptic } from "@/lib/utils";

type Mode = "viewer" | "streamer-setup" | "streaming";

/**
 * MYVYB Live — community-curated livestream carousel.
 *
 * Viewer: one stream at a time, full-screen. Swipe right = Vyb (stay + positive
 * signal), swipe left = Fail (rotate). Tap Flag to report (3+ reports = auto
 * end + cool-down). Eligibility (age layer, NSFW visibility, banned) is fully
 * enforced server-side — the token endpoint refuses if the viewer doesn't
 * qualify, so the carousel UI just trusts what comes back.
 *
 * Streamer: gated by VerifyGate (verified email + permanent age + sex). Start
 * publishes camera + mic via LiveKit; the carousel picks it up for everyone in
 * the same age layer. NSFW + Save-clip are streamer toggles.
 */
export function LivePage() {
  const { account, contactVerified, identity } = useApp();
  const [mode, setMode] = useState<Mode>("viewer");

  const canStream =
    !!account &&
    !account.anonymous &&
    contactVerified &&
    identity.age != null &&
    identity.gender != null;

  return (
    <div className="flex h-full flex-col">
      {/* Header — only shown in viewer + setup; the live publisher view goes
          full-screen for presence. */}
      {mode !== "streaming" && (
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <h1 className="flex items-center gap-2 font-display text-xl font-bold text-gradient">
            <Radio className="h-5 w-5 text-veil-300" /> Live
          </h1>
          {mode === "viewer" && (
            <button
              onClick={() => setMode("streamer-setup")}
              className="flex items-center gap-1.5 rounded-full bg-veil-500 px-4 py-1.5 text-sm font-semibold text-white shadow-glow active:scale-95"
            >
              <Video className="h-4 w-4" /> Go live
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {mode === "viewer" && <ViewerCarousel />}
        {mode === "streamer-setup" && (
          <StreamerSetup
            canStream={canStream}
            onCancel={() => setMode("viewer")}
            onGoLive={() => setMode("streaming")}
          />
        )}
        {mode === "streaming" && (
          <StreamerLive onEnded={() => setMode("viewer")} />
        )}
      </div>
    </div>
  );
}

// ── Viewer carousel ────────────────────────────────────────────────────────

function ViewerCarousel() {
  const { showToast } = useApp();
  const [queue, setQueue] = useState<LiveStream[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchLiveCarousel(20);
    setQueue(list);
    setIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue[idx];

  const advance = useCallback(() => {
    setIdx((i) => {
      const next = i + 1;
      if (next >= queue.length) {
        // Out of streams in the queue — refetch.
        void load();
        return 0;
      }
      return next;
    });
  }, [queue.length, load]);

  const onVyb = useCallback(async () => {
    if (!current) return;
    haptic(15);
    await liveReact(current.id, "vyb");
    advance();
  }, [current, advance]);

  const onFail = useCallback(async () => {
    if (!current) return;
    haptic([8, 12]);
    await liveReact(current.id, "fail");
    advance();
  }, [current, advance]);

  const onReport = useCallback(async () => {
    if (!current) return;
    await liveReport(current.id);
    showToast("Reported — thanks for keeping MYVYB safe.");
    advance();
  }, [current, advance, showToast]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-veil-500/15 ring-1 ring-veil-400/30">
          <Radio className="h-7 w-7 text-veil-200" />
        </div>
        <h2 className="font-display text-xl font-bold text-white">Nobody's live right now</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/60">
          Be the first — tap <span className="font-semibold text-white">Go live</span> at
          the top to start a stream. Or check back in a minute.
        </p>
        <button
          onClick={load}
          className="mt-5 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 active:scale-95"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <ViewerStreamCard
      key={current.id}
      stream={current}
      onVyb={onVyb}
      onFail={onFail}
      onReport={onReport}
    />
  );
}

function ViewerStreamCard({
  stream,
  onVyb,
  onFail,
  onReport,
}: {
  stream: LiveStream;
  onVyb: () => void;
  onFail: () => void;
  onReport: () => void;
}) {
  const { account, hasWallet, credits, refreshCredits, openAccountGate, showToast } =
    useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const connRef = useRef<LiveConnect | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-8, 0, 8]);
  const vybOpacity = useTransform(x, [40, 140], [0, 1]);
  const failOpacity = useTransform(x, [-140, -40], [1, 0]);

  // Connect to LiveKit for THIS stream; tear down on swipe-next / unmount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await liveMintToken(stream.id, "viewer");
      if (cancelled || !t || !videoRef.current) {
        setStatus("error");
        return;
      }
      try {
        const c = await watch({
          url: t.url,
          token: t.token,
          videoEl: videoRef.current,
          audioEl: audioRef.current ?? undefined,
          onStatus: (s) => !cancelled && setStatus(s),
        });
        if (cancelled) {
          await c.disconnect();
          return;
        }
        connRef.current = c;
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      const c = connRef.current;
      connRef.current = null;
      if (c) void c.disconnect();
    };
  }, [stream.id]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 120 || info.velocity.x > 700) onVyb();
    else if (info.offset.x < -120 || info.velocity.x < -700) onFail();
  }

  return (
    <div className="relative h-full w-full select-none">
      <motion.div
        drag="x"
        style={{ x, rotate }}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.65}
        onDragEnd={onDragEnd}
        className="absolute inset-0 overflow-hidden bg-black"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          disablePictureInPicture
          controlsList="nodownload noremoteplayback noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <audio ref={audioRef} autoPlay />

        {/* Connecting overlay. */}
        {status === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {status === "ended" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white/70">
            <StopCircle className="mb-2 h-7 w-7" />
            <span className="text-sm">Stream ended — finding the next one…</span>
          </div>
        )}

        {/* Top scrim: identity + NSFW tag + Report. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-wild/90 px-2 py-0.5 text-[10px] font-bold text-white">
                ● LIVE
              </span>
              <Handle username={stream.username} emoji={stream.username ?? "Live"} size={14} className="text-white" />
              {stream.nsfw && (
                <span className="rounded-full bg-wild/80 px-2 py-0.5 text-[10px] font-bold text-white">
                  NSFW
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReport();
              }}
              aria-label="Report"
              className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>
          {stream.title && (
            <p className="mt-2 line-clamp-2 max-w-full text-sm font-medium text-white drop-shadow">
              {stream.title}
            </p>
          )}
        </div>

        {/* Chat overlay (right edge, scrolls up; never blocks the video). */}
        <LiveChatOverlay
          streamId={stream.id}
          meId={account?.username ?? "me"}
          meUsername={account?.username ?? "Someone"}
        />

        {/* Tip button (left edge, opens picker with a debounced coin burst). */}
        <TipFab
          streamUserId={stream.userId}
          streamId={stream.id}
          hasWallet={hasWallet}
          credits={credits}
          onOpenGate={openAccountGate}
          afterTip={() => {
            refreshCredits();
            showToast("Tip sent ✨");
          }}
        />

        {/* Swipe affordances. */}
        <motion.div
          style={{ opacity: vybOpacity }}
          className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-feel/80 px-4 py-2 font-display text-2xl font-bold text-white"
        >
          VYB
        </motion.div>
        <motion.div
          style={{ opacity: failOpacity }}
          className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-wild/80 px-4 py-2 font-display text-2xl font-bold text-white"
        >
          FAIL
        </motion.div>

        {/* Bottom action bar: explicit buttons for users who prefer not to swipe. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onFail}
            aria-label="Fail"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-wild/80 text-white shadow-lg active:scale-90"
          >
            <X className="h-6 w-6" />
          </button>
          <span className="text-[11px] text-white/70">
            ← Swipe to Fail · Swipe to Vyb →
          </span>
          <button
            onClick={onVyb}
            aria-label="Vyb"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-feel text-black shadow-lg active:scale-90"
          >
            <Radio className="h-6 w-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Streamer setup ─────────────────────────────────────────────────────────

function StreamerSetup({
  canStream,
  onCancel,
  onGoLive,
}: {
  canStream: boolean;
  onCancel: () => void;
  onGoLive: () => void;
}) {
  const { showToast } = useApp();
  const [title, setTitle] = useState("");
  const [nsfw, setNsfw] = useState(false);
  const [record, setRecord] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  async function go() {
    if (!canStream) {
      setGateOpen(true);
      return;
    }
    setBusy(true);
    const started = await liveStart({ title, nsfw, record });
    setBusy(false);
    if (!started) {
      showToast("Couldn't start your stream — try again.");
      return;
    }
    // Hand the new stream id to the streaming view via sessionStorage so the
    // next mounted component can resume without lifting state to the page.
    try {
      sessionStorage.setItem("myvyb.live.activeStream", started.streamId);
    } catch {
      /* ignore */
    }
    onGoLive();
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-6 pt-2">
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
        <h2 className="font-display text-lg font-bold text-white">Start a live stream</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          One person at a time, full screen for everyone in your age layer. The
          community decides — enough Fails and your stream rotates out.
        </p>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
          Title (optional)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="What's the vibe?"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />

        <Toggle
          label="Mark as sensitive (NSFW)"
          help="Only visible to viewers who've opted in."
          value={nsfw}
          onChange={setNsfw}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <Toggle
          label="Save a clip to my profile"
          help="Recording is on only for this stream. Off by default."
          value={record}
          onChange={setRecord}
          icon={<Video className="h-4 w-4" />}
        />

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/70 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={go}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-veil-500 py-3 font-display font-bold text-white shadow-glow active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            Go live
          </button>
        </div>
        {!canStream && (
          <p className="mt-2 text-center text-[11px] text-white/50">
            You'll be asked to verify your email + age first.
          </p>
        )}
      </div>

      <VerifyGate
        mode="chat"
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onComplete={() => setGateOpen(false)}
      />
    </div>
  );
}

function Toggle({
  label,
  help,
  value,
  onChange,
  icon,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-left"
    >
      <div className="min-w-0 pr-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
          {icon}
          {label}
        </div>
        {help && <p className="mt-0.5 text-[11px] text-white/50">{help}</p>}
      </div>
      <span
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          value ? "bg-veil-500" : "bg-white/15"
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            value ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

// ── Streamer live view ─────────────────────────────────────────────────────

function StreamerLive({ onEnded }: { onEnded: () => void }) {
  const streamId = useMemo<string | null>(() => {
    try {
      return sessionStorage.getItem("myvyb.live.activeStream");
    } catch {
      return null;
    }
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const connRef = useRef<LiveConnect | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");

  // Connect + start publishing.
  useEffect(() => {
    if (!streamId) {
      onEnded();
      return;
    }
    let cancelled = false;
    (async () => {
      const t = await liveMintToken(streamId, "publisher");
      if (cancelled || !t) {
        setStatus("error");
        return;
      }
      try {
        const c = await publish({
          url: t.url,
          token: t.token,
          onStatus: (s) => !cancelled && setStatus(s),
        });
        if (cancelled) {
          await c.disconnect();
          return;
        }
        connRef.current = c;
        // Preview the streamer's own camera locally so they see themselves.
        const local = c.room.localParticipant.getTrackPublication(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          "camera" as any
        );
        const t2 = local?.track;
        if (t2 && videoRef.current) t2.attach(videoRef.current);
      } catch {
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [streamId, onEnded]);

  async function end() {
    const c = connRef.current;
    connRef.current = null;
    if (c) await c.disconnect();
    if (streamId) await liveEnd(streamId);
    try {
      sessionStorage.removeItem("myvyb.live.activeStream");
    } catch {
      /* ignore */
    }
    onEnded();
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-wild/90 px-2 py-0.5 text-[10px] font-bold text-white">
            ● LIVE
          </span>
          <span className="text-xs text-white/80">
            {status === "connecting" ? "Connecting…" : status === "live" ? "You're on air" : "Issue with your stream"}
          </span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={end}
          className="flex items-center gap-2 rounded-full bg-white px-6 py-3 font-display font-bold text-black shadow-lg active:scale-95"
        >
          <StopCircle className="h-5 w-5" />
          End stream
        </button>
      </div>
      <AnimatePresence>
        {status === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white/80"
          >
            <ShieldAlert className="h-7 w-7 text-wild" />
            <p className="text-sm">Couldn't start your stream.</p>
            <button
              onClick={end}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black active:scale-95"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Live chat overlay (right-edge ephemeral chat) ──────────────────────────

function LiveChatOverlay({
  streamId,
  meId,
  meUsername,
}: {
  streamId: string;
  meId: string;
  meUsername: string;
}) {
  const [msgs, setMsgs] = useState<LiveChatMsg[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const roomRef = useRef<ReturnType<typeof joinLiveChat> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    roomRef.current = joinLiveChat(
      streamId,
      meId,
      meUsername,
      (m) => {
        // Cap at last 60 messages — overlay is ephemeral, never grows unbounded.
        setMsgs((prev) => [...prev.slice(-59), m]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 30);
      },
      (uid) => setMuted((prev) => new Set(prev).add(uid))
    );
    return () => {
      roomRef.current?.leave();
      roomRef.current = null;
      setMsgs([]);
      setMuted(new Set());
    };
  }, [streamId, meId, meUsername]);

  function send() {
    const clean = draft.trim();
    if (!clean || !roomRef.current) return;
    roomRef.current.send(clean);
    setMsgs((prev) => [
      ...prev.slice(-59),
      { from: meId, username: meUsername, text: clean, t: Date.now() },
    ]);
    setDraft("");
    setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }), 30);
  }

  const visible = msgs.filter((m) => !muted.has(m.from)).slice(-12);

  return (
    <div
      className="pointer-events-none absolute right-2 bottom-32 top-24 flex w-[58%] max-w-[260px] flex-col items-end justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Scrolling message list. */}
      <div
        ref={scrollRef}
        className="pointer-events-auto no-scrollbar w-full overflow-y-auto pr-1"
      >
        <ul className="space-y-1.5">
          {visible.map((m, i) => (
            <li
              key={`${m.t}-${i}`}
              className="rounded-2xl bg-black/55 px-2.5 py-1.5 text-[12px] leading-snug text-white/95 shadow backdrop-blur"
            >
              <span className="mr-1 font-semibold text-feel">{m.username}</span>
              {m.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Composer pill (collapsed by default to keep video primary). */}
      <div
        className="pointer-events-auto mt-2 flex w-full items-center gap-1.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {composerOpen ? (
          <>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 240))}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
                if (e.key === "Escape") setComposerOpen(false);
              }}
              onBlur={() => !draft && setComposerOpen(false)}
              placeholder="Say something kind…"
              className="flex-1 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-feel/60 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send"
              className={cx(
                "flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90",
                draft.trim() ? "bg-feel text-black shadow-glow" : "bg-white/10 text-white/40"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setComposerOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white/85 shadow backdrop-blur active:scale-95"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Say something
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tip floating action button ─────────────────────────────────────────────

function TipFab({
  streamUserId,
  streamId,
  hasWallet,
  credits,
  onOpenGate,
  afterTip,
}: {
  streamUserId: string;
  streamId: string;
  hasWallet: boolean;
  credits: number;
  onOpenGate: () => void;
  afterTip: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; amount: number }[]>([]);
  const lastTipRef = useRef(0);
  const nextBurstId = useRef(0);

  async function tip(amount: number) {
    if (!hasWallet) {
      setOpen(false);
      onOpenGate();
      return;
    }
    if (credits < amount) return;
    // Server-side rate-limit too, but client-side throttle keeps the UI calm.
    const now = Date.now();
    if (now - lastTipRef.current < 600) return;
    lastTipRef.current = now;
    setOpen(false);
    const id = ++nextBurstId.current;
    setBursts((b) => [...b, { id, amount }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1600);
    const ok = await tipStreamer(streamId, streamUserId, amount);
    if (ok) afterTip();
  }

  return (
    <div
      className="pointer-events-none absolute bottom-32 left-3 flex flex-col items-start gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ y: 0, opacity: 0.95, scale: 0.9 }}
            animate={{ y: -110, opacity: 0, scale: 1.2 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="pointer-events-none absolute left-1 bottom-12 flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-xs font-bold text-black shadow"
          >
            <Coins className="h-3 w-3" /> +{b.amount}
          </motion.div>
        ))}
      </AnimatePresence>

      <div
        className="pointer-events-auto flex flex-col items-start gap-1.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/70 p-1.5 backdrop-blur"
            >
              {[1, 5, 25].map((a) => (
                <button
                  key={a}
                  onClick={() => void tip(a)}
                  disabled={hasWallet && credits < a}
                  className={cx(
                    "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95",
                    hasWallet && credits >= a
                      ? "bg-amber-400 text-black shadow-glow"
                      : "bg-white/10 text-white/40"
                  )}
                >
                  <Coins className="h-3.5 w-3.5" /> {a} V¢
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg active:scale-90"
          aria-label="Tip the streamer"
        >
          <Coins className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
