import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Gift, Loader2, MessageCircle, PhoneOff, Radio, Send, Target, UserPlus } from "lucide-react";
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
    navigate("/");
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
        <button type="button" onClick={() => navigate("/")} className="btn btn-ghost px-4 py-2 text-sm">Back to dashboard</button>
      </div>
    );
  }

  const ended = session.status !== "live";
  const hasVideo = sfuActive || !!session.playbackHls;

  return (
    <div className="relative flex h-full flex-col bg-ink-950">
      <div className={cx("relative min-h-0 flex-1 bg-black", !ended && hasVideo && "broadcast-bezel")}>
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
          <div className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen opacity-65">
            <LiveVisualizer stream={vizStream} accent="#34f5a0" mode="stage" />
          </div>
        )}
        {(!hasVideo || ended) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Radio className={cx("h-10 w-10", ended ? "text-white/25" : "animate-pulse text-cyan-300")} />
            <p className="font-display text-lg font-semibold text-white">
              {ended ? "Stream ended" : isHost ? "You're live" : "Waiting for broadcast"}
            </p>
            <p className="max-w-xs text-[13px] text-white/45">
              {ended
                ? "This session is over. Streams expire after 24 hours."
                : isHost
                  ? "Ultra SFU is connecting. Optional: push RTMP from OBS for Bunny HLS/VOD."
                  : "The host is connecting their camera or display."}
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="pointer-events-auto flex items-center gap-3">
            <button type="button" onClick={() => navigate("/")} aria-label="Back"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-ink-950/50 backdrop-blur-md active:scale-90">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => navigate(`/u/${session.hostId}`)} className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar url={session.avatarUrl} name={session.username || session.displayName} id={session.hostId} size="sm" />
              <span className="min-w-0 text-left">
                <span className="block truncate font-mono text-sm font-semibold text-cyan-100">
                  {formatVcAddress(session.username) || session.username || "Creator"}
                </span>
                <span className="block truncate text-[11px] text-white/50">
                  {session.title || session.intent || session.roleLabel || "Live"} · {session.viewerCount} watching
                </span>
              </span>
            </button>
            {!ended && <span className="rounded-md bg-wild/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Live</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--hairline)] px-4 py-2.5">
        {!isHost && !ended && (
          <>
            <button type="button" onClick={() => setTipOpen(true)} className="btn btn-primary h-9 flex-1 py-0 text-xs">
              <Gift className="h-3.5 w-3.5" /> Tip Vc
            </button>
            <button type="button" onClick={() => void connectHost()} className="btn btn-ghost h-9 flex-1 py-0 text-xs"><UserPlus className="h-3.5 w-3.5" /> Connect</button>
            <button type="button" onClick={() => void messageHost()} className="btn btn-ghost h-9 flex-1 py-0 text-xs"><MessageCircle className="h-3.5 w-3.5" /> Message</button>
          </>
        )}
        {isHost && !ended && session.streamKey && (
          <button type="button" onClick={copyIngest} className="btn btn-ghost h-9 flex-1 py-0 text-xs"><Copy className="h-3.5 w-3.5" /> Copy RTMP</button>
        )}
        {isHost && !ended && (
          <button type="button" onClick={() => void end()} className="btn btn-danger h-9 flex-1 py-0 text-xs"><PhoneOff className="h-3.5 w-3.5" /> End</button>
        )}
        <button type="button" onClick={() => setChatOpen((v) => !v)}
          className={cx("btn h-9 w-9 shrink-0 p-0", chatOpen ? "btn-primary" : "btn-ghost")} aria-label="Chat">
          <MessageCircle className="h-4 w-4" />
        </button>
      </div>

      {!ended && (
        <div className="border-t border-[var(--hairline)] px-4 py-2.5">
          {(() => {
            const goal = session.tipGoal ?? 0;
            const raised = session.tipRaised ?? 0;
            const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
            return (
              <div className="space-y-2">
                {goal > 0 ? (
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                      <Target className="h-3.5 w-3.5 text-[rgb(var(--neon-mint))]" /> Tip goal
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--neon-cyan))] to-[rgb(var(--neon-mint))]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-white/55">
                      {formatVc(raised)} / {formatVc(goal)} Vc · {session.tipCount ?? 0} tips
                    </p>
                  </div>
                ) : (
                  <p className="text-[12px] text-white/40">
                    {isHost ? "Set a tip goal so fans can rally." : "Host hasn't set a tip goal yet."}
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
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
                    />
                    <button type="submit" disabled={goalBusy} className="btn btn-ghost h-9 px-3 text-xs disabled:opacity-40">
                      {goalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set goal"}
                    </button>
                  </form>
                )}
              </div>
            );
          })()}
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

      {chatOpen && (
        <div className="flex max-h-[38%] min-h-[10rem] flex-col border-t border-[var(--hairline)] bg-ink-950/90">
          <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {msgs.length === 0 && (
              <p className="text-center text-[12px] text-white/35">Say hello — identity chat, real creators only.</p>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={cx("flex flex-col", m.mine ? "items-end" : "items-start")}>
                <p className="mb-0.5 text-[10px] font-medium text-white/35">
                  {m.mine ? "You" : m.senderName || "Creator"}
                </p>
                <p className={cx(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug",
                  m.mine ? "bg-veil-500/25 text-white" : "bg-white/[0.05] text-white/85",
                )}>
                  {m.body}
                </p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {!ended && (
            <form
              onSubmit={(e) => { e.preventDefault(); void send(); }}
              className="flex items-center gap-2 border-t border-[var(--hairline)] px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Message as yourself…"
                maxLength={1000}
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary h-9 w-9 shrink-0 p-0 disabled:opacity-40" aria-label="Send">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
