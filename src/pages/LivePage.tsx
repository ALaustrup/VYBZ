import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  Bookmark,
  Camera,
  CameraOff,
  ChevronLeft,
  Eye,
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
import { BrandMark } from "@/components/Brand";
import { Handle } from "@/components/Handle";
import {
  fetchLiveCarousel,
  fetchMyVybedStreams,
  joinLiveChat,
  liveEnd,
  liveMintToken,
  liveReact,
  liveReport,
  liveSetViewers,
  liveStart,
  liveStreamTally,
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

  // Viewer + publisher go edge-to-edge (full-bleed) so the stream always uses
  // the entire available area and fits any device. Setup is a scrollable form.
  return (
    <div className="relative h-full w-full overflow-hidden">
      {mode === "viewer" && (
        <ViewerCarousel onGoLive={() => setMode("streamer-setup")} />
      )}
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
  );
}

// ── Viewer carousel ────────────────────────────────────────────────────────

function ViewerCarousel({ onGoLive }: { onGoLive: () => void }) {
  const { showToast } = useApp();
  const [queue, setQueue] = useState<LiveStream[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  // The viewer's personal shelf of Vyb'd-and-still-live streams, plus the panel
  // and the re-entry target ("rewatch"). Vyb'ing rotates a stream out of the
  // swipe queue but keeps it reachable here for one-tap re-entry.
  const [saved, setSaved] = useState<LiveStream[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [rewatch, setRewatch] = useState<LiveStream | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchLiveCarousel(20);
    setQueue(list);
    setIdx(0);
    setLoading(false);
  }, []);

  const loadSaved = useCallback(async () => {
    setSaved(await fetchMyVybedStreams(30));
  }, []);

  useEffect(() => {
    load();
    loadSaved();
  }, [load, loadSaved]);

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
    void loadSaved();
    showToast("Vyb'd — saved to your live shelf.");
    advance();
  }, [current, advance, loadSaved, showToast]);

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

  const openSaved = useCallback(() => {
    void loadSaved();
    setSavedOpen(true);
  }, [loadSaved]);

  // ── Re-entry: watch a saved stream directly (outside the swipe queue) ──────
  const startRewatch = useCallback((s: LiveStream) => {
    setSavedOpen(false);
    setRewatch(s);
  }, []);

  const rewatchVyb = useCallback(async () => {
    if (!rewatch) return;
    haptic(15);
    await liveReact(rewatch.id, "vyb");
    void loadSaved();
    setRewatch(null);
  }, [rewatch, loadSaved]);

  const rewatchFail = useCallback(async () => {
    if (!rewatch) return;
    haptic([8, 12]);
    await liveReact(rewatch.id, "fail");
    void loadSaved();
    showToast("Removed from your live shelf.");
    setRewatch(null);
  }, [rewatch, loadSaved, showToast]);

  const rewatchReport = useCallback(async () => {
    if (!rewatch) return;
    await liveReport(rewatch.id);
    void loadSaved();
    showToast("Reported — thanks for keeping MYVYB safe.");
    setRewatch(null);
  }, [rewatch, loadSaved, showToast]);

  // Re-entry view takes over the whole stage until the user backs out.
  if (rewatch) {
    return (
      <>
        <ViewerStreamCard
          key={`rewatch-${rewatch.id}`}
          stream={rewatch}
          onVyb={rewatchVyb}
          onFail={rewatchFail}
          onReport={rewatchReport}
          onGoLive={onGoLive}
          onBack={() => setRewatch(null)}
          onOpenSaved={openSaved}
          savedCount={saved.length}
        />
        <SavedStreamsSheet
          open={savedOpen}
          streams={saved}
          onClose={() => setSavedOpen(false)}
          onWatch={startRewatch}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  if (!current) {
    return (
      <>
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-8 text-center">
          {/* Ambient industrial glow behind the landing. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-veil-600/15 blur-[120px]" />
            <div className="absolute bottom-10 right-6 h-40 w-40 rounded-full bg-aqua-500/10 blur-[90px]" />
          </div>
          <div className="relative flex flex-col items-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-ink-800/70 shadow-card">
              <BrandMark className="h-11 w-11 text-veil-200" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gradient">
              The stage is yours
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/60">
              No one's live right now. Be the first — the community swipes to keep
              the best streams up.
            </p>
            <button onClick={onGoLive} className="btn btn-primary mt-6 px-6 py-2.5 text-sm">
              <Video className="h-4 w-4" /> Go live
            </button>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={load} className="btn btn-ghost px-5 py-2 text-xs">
                Refresh
              </button>
              {saved.length > 0 && (
                <button onClick={openSaved} className="btn btn-ghost px-5 py-2 text-xs">
                  <Bookmark className="h-3.5 w-3.5" /> Saved ({saved.length})
                </button>
              )}
            </div>
          </div>
        </div>
        <SavedStreamsSheet
          open={savedOpen}
          streams={saved}
          onClose={() => setSavedOpen(false)}
          onWatch={startRewatch}
        />
      </>
    );
  }

  return (
    <>
      <ViewerStreamCard
        key={current.id}
        stream={current}
        onVyb={onVyb}
        onFail={onFail}
        onReport={onReport}
        onGoLive={onGoLive}
        onOpenSaved={openSaved}
        savedCount={saved.length}
      />
      <SavedStreamsSheet
        open={savedOpen}
        streams={saved}
        onClose={() => setSavedOpen(false)}
        onWatch={startRewatch}
      />
    </>
  );
}

function ViewerStreamCard({
  stream,
  onVyb,
  onFail,
  onReport,
  onGoLive,
  onBack,
  onOpenSaved,
  savedCount = 0,
}: {
  stream: LiveStream;
  onVyb: () => void;
  onFail: () => void;
  onReport: () => void;
  onGoLive: () => void;
  /** Present in re-entry ("rewatch") mode: shows a back chevron, hides Go live. */
  onBack?: () => void;
  /** Open the saved-streams shelf (carousel mode only). */
  onOpenSaved?: () => void;
  savedCount?: number;
}) {
  const { account } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const connRef = useRef<LiveConnect | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [viewers, setViewers] = useState(0);
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
          bgVideoEl: bgVideoRef.current ?? undefined,
          audioEl: audioRef.current ?? undefined,
          onStatus: (s) => !cancelled && setStatus(s),
          onCount: (n) => !cancelled && setViewers(n),
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
        {/* Blurred "cover" backdrop fills the screen; the real video sits on top
            contained, so the full frame always fits any device/source aspect
            without cropping faces or leaving hard black bars. */}
        <video
          ref={bgVideoRef}
          autoPlay
          playsInline
          muted
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
        />
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          disablePictureInPicture
          controlsList="nodownload noremoteplayback noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full object-contain"
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
              {onBack && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBack();
                  }}
                  aria-label="Back"
                  className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <span className="flex items-center gap-1 rounded-full bg-wild/90 px-2 py-0.5 text-[10px] font-bold text-white">
                ● LIVE
              </span>
              {/* Public concurrent-viewer count — updates live as people join. */}
              <span className="flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                <Eye className="h-3 w-3" />
                {viewers}
              </span>
              <Handle username={stream.username} emoji={stream.username ?? "Live"} size={14} className="text-white" />
              {stream.nsfw && (
                <span className="rounded-full bg-wild/80 px-2 py-0.5 text-[10px] font-bold text-white">
                  NSFW
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!onBack && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoLive();
                  }}
                  aria-label="Go live"
                  className="flex h-9 items-center gap-1.5 rounded-full bg-veil-500/90 px-3 text-xs font-semibold text-white shadow-glow active:scale-90"
                >
                  <Video className="h-4 w-4" /> Go live
                </button>
              )}
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

        {/* Floating options bar — a single transparent overlay that follows the
            carousel: Fail (rotate) on the left, Vyb (save + boost) on the right,
            and a middle key to the Vyb'd shelf. Tied to the current stream. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 p-4 pb-[max(1.1rem,env(safe-area-inset-bottom))]">
          <span className="pointer-events-none rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] font-medium text-white/70 backdrop-blur-sm">
            ← Fail · swipe · Vyb →
          </span>
          <div className="pointer-events-auto flex items-center gap-5 rounded-full border border-white/12 bg-black/35 px-5 py-2.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.85)] backdrop-blur-xl">
            <button
              onClick={onFail}
              aria-label="Fail"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-wild/85 text-white shadow-lg transition active:scale-90"
            >
              <X className="h-6 w-6" strokeWidth={2.5} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSaved?.();
              }}
              aria-label="Vyb'd streams"
              className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/90 transition active:scale-90"
            >
              <Bookmark className="h-5 w-5" />
              {savedCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-feel px-1 text-[9px] font-bold text-black">
                  {savedCount > 9 ? "9+" : savedCount}
                </span>
              )}
            </button>
            <button
              onClick={onVyb}
              aria-label="Vyb"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-feel text-black shadow-lg transition active:scale-90"
            >
              <Radio className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Saved live shelf (Vyb'd streams, quick re-entry) ───────────────────────

/**
 * The viewer's saved shelf: every stream they've Vyb'd that is still live.
 * Vyb'ing rotates a stream out of the swipe queue (you've already engaged), but
 * keeps it one tap away here so it can be re-entered anytime it's on air.
 */
function SavedStreamsSheet({
  open,
  streams,
  onClose,
  onWatch,
}: {
  open: boolean;
  streams: LiveStream[];
  onClose: () => void;
  onWatch: (s: LiveStream) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex flex-col bg-black/85 backdrop-blur-md"
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
              <Bookmark className="h-5 w-5 text-feel" /> Saved live
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {streams.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center text-white/55">
                <Radio className="mb-3 h-8 w-8 text-veil-300" />
                <p className="text-sm">
                  No saved streams yet. Vyb a live stream to keep it here for
                  quick re-entry.
                </p>
              </div>
            ) : (
              streams.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onWatch(s)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition active:scale-[0.99] hover:border-feel/40"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-veil-500/20 text-veil-100">
                    <Radio className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-full bg-wild/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        ● LIVE
                      </span>
                      <Handle
                        username={s.username}
                        emoji={s.username ?? "Live"}
                        size={13}
                        className="text-white"
                      />
                      {s.nsfw && (
                        <span className="rounded-full bg-wild/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          NSFW
                        </span>
                      )}
                    </div>
                    {s.title && (
                      <p className="mt-0.5 truncate text-xs text-white/60">{s.title}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-feel px-3 py-1.5 text-xs font-bold text-black">
                    Watch
                  </span>
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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
    <div className="no-scrollbar mx-auto h-full max-w-md overflow-y-auto px-4 pb-6 pt-4">
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
        <h2 className="font-display text-lg font-bold text-white">Start a live stream</h2>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          One person at a time, full screen for everyone in your age layer. The
          community decides — enough Fails and your stream rotates out.
        </p>

        {/* Live camera self-preview: confirm framing + that the camera works
            before going live (uses getUserMedia locally; nothing is published
            until you tap Go live). */}
        <CameraPreview className="mt-4" />

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
          <button onClick={onCancel} className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={go} disabled={busy} className="btn btn-primary flex-1">
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

// ── Camera self-preview (pre-flight before publishing) ─────────────────────

type PreviewState = "loading" | "ready" | "denied" | "unsupported";

/**
 * Local camera preview for the "Go live" setup. Acquires the front camera with
 * getUserMedia purely on-device so the streamer can check lighting + framing
 * before anything is published. Fully torn down (tracks stopped) on unmount so
 * the camera light never lingers.
 */
function CameraPreview({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<PreviewState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      setState("unsupported");
      return;
    }
    setState("loading");
    md.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("denied");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  return (
    <div
      className={cx(
        "relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/10 bg-black",
        className
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
      />

      {state === "ready" && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">
          <Camera className="h-3.5 w-3.5 text-feel" /> Preview
        </div>
      )}

      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">Starting camera…</span>
        </div>
      )}

      {(state === "denied" || state === "unsupported") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/70">
          <CameraOff className="h-7 w-7 text-wild" />
          <p className="text-sm font-semibold text-white">
            {state === "denied" ? "Camera blocked" : "Camera unavailable"}
          </p>
          <p className="text-[11px] leading-relaxed text-white/50">
            {state === "denied"
              ? "Allow camera access in your browser to preview and go live."
              : "This device or browser can't open a camera here."}
          </p>
          {state === "denied" && (
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="btn btn-ghost mt-1 px-4 py-2 text-xs"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
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
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const connRef = useRef<LiveConnect | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [viewers, setViewers] = useState(0);
  const [tally, setTally] = useState<{ vybs: number; fails: number }>({ vybs: 0, fails: 0 });
  // Latest viewer count, read by the polling loop that persists the peak.
  const viewersRef = useRef(0);
  const pollRef = useRef<number | null>(null);

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
          onCount: (n) => {
            if (cancelled) return;
            viewersRef.current = n;
            setViewers(n);
          },
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
        if (t2 && videoRef.current) {
          t2.attach(videoRef.current);
          if (bgVideoRef.current) t2.attach(bgVideoRef.current);
        }
        // Live HUD loop: pull the Vyb/Fail tally and persist the viewer peak so
        // it survives into the streamer's lifetime analytics.
        const poll = async () => {
          const st = await liveStreamTally(streamId);
          if (!cancelled && st) setTally({ vybs: st.vybs, fails: st.fails });
          void liveSetViewers(streamId, viewersRef.current);
        };
        void poll();
        pollRef.current = window.setInterval(poll, 5000);
      } catch {
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
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
        ref={bgVideoRef}
        autoPlay
        playsInline
        muted
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
      />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-contain"
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
        {/* Live performance HUD — real-time viewers + Vybs, at a glance. */}
        {status === "live" && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              <Eye className="h-3.5 w-3.5 text-white/80" />
              {viewers}
              <span className="font-medium text-white/50">watching</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-feel/20 px-2.5 py-1 text-xs font-bold text-feel backdrop-blur-sm ring-1 ring-feel/30">
              <Radio className="h-3.5 w-3.5" />
              {tally.vybs}
              <span className="font-medium text-feel/70">Vybs</span>
            </span>
          </div>
        )}
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

