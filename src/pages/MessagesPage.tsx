import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, MessageSquare, Send, Mic, MonitorSpeaker, Video, Square } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ChatTabs } from "@/components/ChatTabs";
import { LiveSessionPanel } from "@/components/LiveSessionPanel";
import { useLiveSession } from "@/lib/liveSession";
import { useMessagePopout } from "@/lib/messagePopout";
import { useInboxThreads } from "@/hooks/useInboxThreads";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { cx, timeAgo } from "@/lib/utils";
import type { DmMessage } from "@/types";

export function MessagesPage() {
  const { id } = useParams();
  return id ? <Thread threadId={id} /> : <ThreadList />;
}

function ThreadList() {
  const navigate = useNavigate();
  const { openThread } = useMessagePopout();
  const { threads, loading } = useInboxThreads();

  return (
    <div className="flex h-full flex-col">
      <ChatTabs active="direct" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6 pt-1">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : threads.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No direct messages yet"
              body="Message someone from Network, or open Profile → Inbox."
              action={
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  <button type="button" onClick={() => navigate("/connect")} className="btn btn-primary h-9 px-4 py-0 text-xs">
                    Open Network
                  </button>
                  <button type="button" onClick={() => navigate("/profile?tab=inbox")} className="btn btn-ghost h-9 px-4 py-0 text-xs">
                    Profile inbox
                  </button>
                </div>
              }
            />
          )
          : <div className="divide-y divide-[var(--hairline)]" role="list" aria-label="Messages">
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openThread(t.id)}
                  className={cx("flex w-full items-center gap-3 py-3.5 text-left active:scale-[0.995]", t.unread && "bg-veil-500/[0.08]")}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-veil-500/20 font-display font-bold text-veil-100 ring-1 ring-white/10">
                    {(t.peerUsername || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cx("truncate font-semibold", t.unread ? "text-white" : "text-white/85")}>
                        {t.peerUsername || "Creator"}
                      </p>
                      {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-veil-300" aria-label="Unread" />}
                    </div>
                    <p className={cx("truncate text-xs", t.unread ? "font-medium text-white/70" : "text-white/35")}>
                      {t.lastBody || timeAgo(t.lastAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-white/35">{timeAgo(t.lastAt)}</span>
                </button>
              ))}
            </div>}
      </div>
    </div>
  );
}

function Thread({ threadId }: { threadId: string }) {
  const { userId, refreshUnread, showToast } = useSession();
  const [msgs, setMsgs] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState<"voice" | "video" | null>(null);
  const [peer, setPeer] = useState<{ id: string; username: string | null } | null>(null);
  const [jamMenu, setJamMenu] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const session = useLiveSession(threadId, userId);
  const peerName = peer?.username ?? "your collaborator";

  async function load() { setMsgs(await api.listMessages(threadId)); setLoading(false); }
  useEffect(() => {
    void load();
    void api.getThreadPeer(threadId).then(setPeer);
    void api.markThreadRead(threadId).then(() => void refreshUnread());
    const ch = api.subscribeInserts("dm_messages", `thread_id=eq.${threadId}`, () => void load());
    return () => api.unsubscribe(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  useRegisterAppBar({
    title: peer?.username ? `@${peer.username}` : "Conversation",
  }, [peer?.username]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body || busy) return;
    setText("");
    await api.sendMessage(threadId, body);
    await load();
  }

  async function startRecord(mode: "voice" | "video") {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === "video"
          ? { audio: true, video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } } }
          : { audio: true, video: false },
      );
      const mime = mode === "video"
        ? (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ? "video/webm;codecs=vp8,opus" : "video/webm")
        : (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm");
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void finishRecord(mode, new Blob(chunksRef.current, { type: mime }));
      };
      rec.start();
      recRef.current = rec;
      setRecording(mode);
    } catch {
      showToast("Couldn't access mic/camera");
    }
  }

  function stopRecord() {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    setRecording(null);
  }

  async function finishRecord(mode: "voice" | "video", blob: Blob) {
    setBusy(true);
    const url = await api.uploadChatMedia(blob, "webm");
    if (!url) {
      showToast("Upload failed");
      setBusy(false);
      return;
    }
    await api.sendMessage(threadId, mode === "voice" ? "Voice message" : "Video message", {
      kind: mode,
      mediaUrl: url,
    });
    await load();
    setBusy(false);
  }

  return (
    <div className="relative flex h-full flex-col">
      {jamMenu && session.state === "idle" && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setJamMenu(false)} />
          <div className="absolute bottom-16 left-3 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 p-1.5 shadow-card backdrop-blur-2xl">
            <button type="button" onClick={() => { setJamMenu(false); void session.startCall("mic"); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/8">
              <Mic className="h-4 w-4 text-veil-200" /> <span><span className="font-semibold">Microphone</span><span className="block text-[11px] text-white/45">Jam or talk — free</span></span>
            </button>
            <button type="button" onClick={() => { setJamMenu(false); void session.startCall("cam"); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/8">
              <Video className="h-4 w-4 text-feel" /> <span><span className="font-semibold">Cam to cam</span><span className="block text-[11px] text-white/45">Private video — free forever</span></span>
            </button>
            <button type="button" onClick={() => { setJamMenu(false); void session.startCall("desktop"); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/8">
              <MonitorSpeaker className="h-4 w-4 text-aqua-200" /> <span><span className="font-semibold">Desktop audio</span><span className="block text-[11px] text-white/45">Share a DAW/tab (Chrome)</span></span>
            </button>
          </div>
        </>
      )}
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : msgs.map((m) => (
            <div key={m.id} className={cx("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "ml-auto bg-veil-500/30 text-white" : "bg-white/[0.06] text-white/85")}>
              {m.kind === "voice" && m.mediaUrl ? <audio controls src={m.mediaUrl} className="max-w-full" />
                : m.kind === "video" && m.mediaUrl ? <video controls src={m.mediaUrl} className="max-h-48 rounded-lg" />
                : m.body}
            </div>
          ))}
        <div ref={endRef} />
      </div>
      <LiveSessionPanel session={session} peerName={peerName} />
      <div className="flex flex-wrap items-center gap-1 border-t border-white/10 px-1 pt-1.5">
        {session.state === "idle" && (
          <button type="button" onClick={() => setJamMenu((v) => !v)} aria-label="Start live call" aria-expanded={jamMenu}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass text-white/70 active:scale-95">
            <Mic className="h-4 w-4" />
          </button>
        )}
        {recording ? (
          <button type="button" onClick={stopRecord} className="flex items-center gap-1 rounded-full bg-wild/25 px-2.5 py-1.5 text-xs font-semibold text-wild">
            <Square className="h-3 w-3 fill-current" /> Stop {recording}
          </button>
        ) : (
          <>
            <button type="button" disabled={busy || !!recording} onClick={() => void startRecord("voice")}
              className="rounded-full px-2 py-1.5 text-[11px] font-semibold text-white/55 hover:bg-white/8" aria-label="Record voice message">
              Voice msg
            </button>
            <button type="button" disabled={busy || !!recording} onClick={() => void startRecord("video")}
              className="rounded-full px-2 py-1.5 text-[11px] font-semibold text-white/55 hover:bg-white/8" aria-label="Record video message">
              Video msg
            </button>
          </>
        )}
        <span className="ml-auto pr-1 text-[10px] text-white/30">Free forever</span>
      </div>
      <form onSubmit={(e) => void send(e)} className="flex items-center gap-2 px-1 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
        <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow active:scale-90 disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
