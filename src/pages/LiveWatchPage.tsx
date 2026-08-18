import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Gift,
  Headphones,
  Loader2,
  MessageCircle,
  PhoneOff,
  Radio,
  Send,
  Target,
  UserPlus,
  Volume2,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { LiveVisualizer } from "@/components/LiveVisualizer";
import { VcTipSheet } from "@/components/VcTipSheet";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { takeLivePreviewHandoff } from "@/lib/livePreviewHandoff";
import { joinLiveSessionSfu, type LiveSfuSession } from "@/lib/livekitSfu";
import { formatVc, formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";
import type { LiveMessage, LiveSessionDetail } from "@/types";

export function LiveWatchPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const [session, setSession] = useState<LiveSessionDetail | null>(null);
  const [msgs, setMsgs] = useState<LiveMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("50");
  const [goalBusy, setGoalBusy] = useState(false);
  const [sfuActive, setSfuActive] = useState(false);
  const [vizStream, setVizStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sfuRef = useRef<LiveSfuSession | null>(null);
  const isHost = !!userId && session?.hostId === userId;

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await api.getLiveSession(id);
      if (!alive) return;
      setSession(s);
      setLoading(false);
      if (s?.status === "live") void api.bumpLiveViewers(id, 1);
    })();
    return () => {
      alive = false;
      void api.bumpLiveViewers(id, -1);
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const list = await api.listLiveMessages(id);
      if (alive) setMsgs(list);
    };
    void load();
    const ch = api.subscribeLiveMessages(id, () => { void load(); });
    return () => { alive = false; api.unsubscribe(ch); };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  // LiveKit SFU (primary) — host publishes handoff/cam; viewers subscribe.
  useEffect(() => {
    if (!session || session.status !== "live" || !id) return;
    const preferSfu = session.sfuProvider === "livekit" || !!session.livekitRoom;
    if (!preferSfu) return;

    let cancelled = false;
    const handoff = isHost ? takeLivePreviewHandoff() : null;

    (async () => {
      const sfu = await joinLiveSessionSfu({
        sessionId: id,
        canPublish: isHost,
        audioMode: session.audioMode ?? "music",
        localStream: handoff,
        videoEl: videoRef.current,
        onAnalyserStream: (stream) => {
          if (!cancelled) setVizStream(stream);
        },
      });
      if (cancelled) {
        await sfu.disconnect();
        handoff?.getTracks().forEach((t) => t.stop());
        return;
      }
      sfuRef.current = sfu;
      setSfuActive(sfu.connected);
      if (!sfu.connected && isHost && handoff && videoRef.current) {
        // Local preview while SFU secrets missing
        videoRef.current.srcObject = handoff;
        videoRef.current.muted = true;
        void videoRef.current.play().catch(() => {});
        setSfuActive(true);
        setVizStream(handoff);
      } else if (!sfu.connected) {
        handoff?.getTracks().forEach((t) => t.stop());
      }
    })();

    return () => {
      cancelled = true;
      void sfuRef.current?.disconnect();
      sfuRef.current = null;
      setSfuActive(false);
      setVizStream(null);
    };
  }, [session?.id, session?.status, session?.sfuProvider, session?.livekitRoom, session?.audioMode, isHost, id]);

  // HLS fallback when Bunny URL exists and SFU isn't showing video.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !session?.playbackHls || sfuActive) return;
    el.src = session.playbackHls;
    void el.play().catch(() => {});
    const tryCapture = () => {
      try {
        const cap = (el as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
        if (cap?.getAudioTracks().length) setVizStream(cap);
      } catch { /* ignore */ }
    };
    el.addEventListener("playing", tryCapture);
    return () => el.removeEventListener("playing", tryCapture);
  }, [session?.playbackHls, sfuActive]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const m = await api.sendLiveMessage(id, text);
    setSending(false);
    if (m) { setText(""); setMsgs((prev) => [...prev, m]); }
    else showToast("Couldn't send");
  }

  async function end() {
    await sfuRef.current?.disconnect();
    sfuRef.current = null;
    await api.endLiveSession(id);
    showToast("Stream ended");
    navigate("/live");
  }

  async function connectHost() {
    if (!session) return;
    await api.connect(session.hostId);
    showToast("Connection sent");
  }

  async function messageHost() {
    if (!session) return;
    const t = await api.startDm(session.hostId);
    if (t) navigate(`/messages/${t}`);
  }

  function copyIngest() {
    if (!session?.rtmpUrl || !session.streamKey) return;
    void navigator.clipboard.writeText(`${session.rtmpUrl}\n${session.streamKey}`);
    showToast("RTMP URL + stream key copied");
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-white/55">Stream not found.</p>
        <button type="button" onClick={() => navigate("/live")} className="btn btn-ghost px-4 py-2 text-sm">Back to Live Mix</button>
      </div>
    );
  }

  const ended = session.status !== "live";
  const hasVideo = sfuActive || !!session.playbackHls;

  return (
    <div className="relative flex h-full flex-col lg:flex-row bg-ink-950 overflow-hidden">
      {/* Main Stage Video & Visualizer Viewport */}
      <div className="relative flex min-h-0 flex-1 flex-col bg-black">
        <div className={cx("relative min-h-0 flex-1 bg-black flex items-center justify-center overflow-hidden", !ended && hasVideo && "broadcast-bezel")}>
          <video
            ref={videoRef}
            className={cx(
              "h-full w-full object-contain",
              (!hasVideo || ended) && "pointer-events-none absolute inset-0 opacity-0",
            )}
            playsInline
            controls={false}
            autoPlay
            muted={isHost}
          />
          {!ended && vizStream && (
            <div className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen opacity-70">
              <LiveVisualizer stream={vizStream} accent="#34f5a0" mode="stage" />
            </div>
          )}
          {(!hasVideo || ended) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center z-10">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
                <Radio className={cx("relative h-12 w-12", ended ? "text-white/25" : "animate-pulse text-cyan-300")} />
              </div>
              <p className="font-display text-lg font-semibold text-white">
                {ended ? "Stream ended" : isHost ? "You're live on VYBZ" : "Connecting to live mix…"}
              </p>
              <p className="max-w-xs text-[13px] text-white/45">
                {ended
                  ? "This session is over. Recorded stems can be packaged on the store."
                  : isHost
                    ? "LiveKit SFU broadcast is active in lossless stereo music mode."
                    : "Pristine stereo audio streaming directly from the producer's studio."}
              </p>
            </div>
          )}

          {/* Top Stage Bar */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/live")}
                aria-label="Back"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-ink-950/60 backdrop-blur-md active:scale-90 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => navigate(`/u/${session.hostId}`)} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar url={session.avatarUrl} name={session.username || session.displayName} id={session.hostId} size="sm" />
                <span className="min-w-0 text-left">
                  <span className="block truncate font-mono text-sm font-semibold text-cyan-100">
                    {formatVcAddress(session.username) || session.username || "Creator"}
                  </span>
                  <span className="block truncate text-[11px] text-white/60">
                    {session.title || session.intent || session.roleLabel || "Live Mix"} · {session.viewerCount} watching
                  </span>
                </span>
              </button>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:flex items-center gap-1 rounded bg-white/[0.08] px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-300 border border-white/10">
                  <Volume2 className="h-3 w-3" /> 48kHz Stereo
                </span>
                {!ended && (
                  <span className="flex items-center gap-1 rounded-md bg-wild px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-glow">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stage Controls Footer */}
        <div className="flex items-center gap-2 border-t border-[var(--hairline)] bg-ink-950/90 px-4 py-2.5 backdrop-blur-md">
          {!isHost && !ended && (
            <>
              <button
                type="button"
                onClick={() => setTipOpen(true)}
                className="btn btn-primary h-9 flex-1 py-0 text-xs font-semibold bg-gradient-to-r from-[rgb(var(--neon-cyan))] to-[rgb(var(--neon-mint))] text-black"
              >
                <Gift className="h-3.5 w-3.5 mr-1" /> Tip Vc
              </button>
              <button type="button" onClick={() => void connectHost()} className="btn btn-ghost h-9 flex-1 py-0 text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Connect
              </button>
              <button type="button" onClick={() => void messageHost()} className="btn btn-ghost h-9 flex-1 py-0 text-xs">
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> Message
              </button>
            </>
          )}
          {isHost && !ended && session.streamKey && (
            <button type="button" onClick={copyIngest} className="btn btn-ghost h-9 flex-1 py-0 text-xs">
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy RTMP
            </button>
          )}
          {isHost && !ended && (
            <button type="button" onClick={() => void end()} className="btn btn-danger h-9 flex-1 py-0 text-xs font-semibold">
              <PhoneOff className="h-3.5 w-3.5 mr-1" /> End Session
            </button>
          )}
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className={cx("btn h-9 w-9 shrink-0 p-0 lg:hidden", chatOpen ? "btn-primary" : "btn-ghost")}
            aria-label="Chat"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Side Console: Tip Goals & Live Identity Chat */}
      {(chatOpen || true) && (
        <div className={cx(
          "flex flex-col border-t lg:border-t-0 lg:border-l border-[var(--hairline)] bg-ink-950/95 lg:w-80 xl:w-96 shrink-0",
          !chatOpen && "hidden lg:flex",
          "max-h-[45%] lg:max-h-full min-h-[14rem]"
        )}>
          {/* Tip Goal Section */}
          {!ended && (
            <div className="border-b border-[var(--hairline)] bg-white/[0.02] p-3">
              {(() => {
                const goal = session.tipGoal ?? 0;
                const raised = session.tipRaised ?? 0;
                const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                return (
                  <div className="space-y-2">
                    {goal > 0 ? (
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
                            <Target className="h-3.5 w-3.5 text-[rgb(var(--neon-mint))]" /> Session Goal
                          </p>
                          <span className="font-mono text-xs font-bold text-cyan-200">{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--neon-cyan))] to-[rgb(var(--neon-mint))] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-white/55">
                          {formatVc(raised)} / {formatVc(goal)} Vc · {session.tipCount ?? 0} tips
                        </p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-white/40">
                        {isHost ? "Set a session goal so listeners can rally." : "Host hasn't set a goal yet."}
                      </p>
                    )}
                    {isHost && (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void (async () => {
                            const g = parseFloat(goalInput);
                            if (!Number.isFinite(g) || g < 1) {
                              showToast("Goal must be ≥ 1 Vc");
                              return;
                            }
                            setGoalBusy(true);
                            const res = await api.liveSetTipGoal(session.id, g);
                            setGoalBusy(false);
                            if (!res.ok) {
                              showToast(res.error || "Couldn't set goal");
                              return;
                            }
                            setSession((s) => s ? {
                              ...s,
                              tipGoal: res.tipGoal ?? g,
                              tipRaised: res.tipRaised ?? s.tipRaised ?? 0,
                              tipCount: res.tipCount ?? s.tipCount ?? 0,
                            } : s);
                            showToast(`Tip goal set to ${formatVc(res.tipGoal ?? g)} Vc`);
                          })();
                        }}
                      >
                        <input
                          value={goalInput}
                          onChange={(e) => setGoalInput(e.target.value)}
                          inputMode="decimal"
                          placeholder="Goal Vc"
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
                        />
                        <button type="submit" disabled={goalBusy} className="btn btn-ghost h-8 px-3 text-xs disabled:opacity-40">
                          {goalBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set goal"}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Chat Messages */}
          <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {msgs.length === 0 && (
              <div className="text-center py-6">
                <Headphones className="h-6 w-6 text-white/20 mx-auto mb-1.5" />
                <p className="text-[12px] text-white/35">Identity live chat. Real producers and listeners only.</p>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={cx("flex flex-col", m.mine ? "items-end" : "items-start")}>
                <p className="mb-0.5 text-[10px] font-mono text-white/40">
                  {m.mine ? "You" : m.senderName || "Creator"}
                </p>
                <p className={cx(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-snug break-words",
                  m.mine
                    ? "bg-veil-500/25 text-white border border-veil-400/20"
                    : "bg-white/[0.05] text-white/90 border border-white/[0.04]",
                )}>
                  {m.body}
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Chat Input */}
          {!ended && (
            <form
              onSubmit={(e) => { e.preventDefault(); void send(); }}
              className="flex items-center gap-2 border-t border-[var(--hairline)] bg-ink-950 p-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Send a live message…"
                maxLength={1000}
                className="min-w-0 flex-1 bg-white/[0.04] rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none border border-white/8 focus:border-veil-400/50"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="btn btn-primary h-8 w-8 shrink-0 p-0 disabled:opacity-40 rounded-xl"
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </form>
          )}
        </div>
      )}

      <VcTipSheet
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        username={session.username}
        displayName={session.displayName}
        hostId={session.hostId}
        sessionId={session.id}
        tipGoal={session.tipGoal ?? 0}
        tipRaised={session.tipRaised ?? 0}
        onTipped={(next) => {
          setSession((s) => s ? { ...s, tipGoal: next.tipGoal, tipRaised: next.tipRaised, tipCount: next.tipCount } : s);
        }}
      />
    </div>
  );
}
