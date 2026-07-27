import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, Mic, Send, Video, X, Phone, Ban, Flag, Trash2, ExternalLink, Square,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import * as api from "@/lib/api";
import { useMessagePopout } from "@/lib/messagePopout";
import { useLiveSession } from "@/lib/liveSession";
import { LiveSessionPanel } from "@/components/LiveSessionPanel";
import { ReportModal } from "@/components/ReportModal";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";
import type { DmMessage } from "@/types";

export function MessagePopoutHost() {
  const { threadId, pendingCall, clearPendingCall, close } = useMessagePopout();
  return (
    <AnimatePresence>
      {threadId && (
        <MessagePopout
          key={threadId}
          threadId={threadId}
          pendingCall={pendingCall}
          onPendingCallConsumed={clearPendingCall}
          onClose={close}
        />
      )}
    </AnimatePresence>
  );
}

function MessagePopout({
  threadId, pendingCall, onPendingCallConsumed, onClose,
}: {
  threadId: string;
  pendingCall: "mic" | "cam" | "desktop" | null;
  onPendingCallConsumed: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { userId, showToast, refreshUnread } = useSession();
  const [msgs, setMsgs] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [peer, setPeer] = useState<{ id: string; username: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState<"voice" | "video" | null>(null);
  const [reportMsgId, setReportMsgId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const session = useLiveSession(threadId, userId);
  const peerName = peer?.username ?? "them";

  async function load() {
    setMsgs(await api.listMessages(threadId));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    void api.getThreadPeer(threadId).then(setPeer);
    void api.markThreadRead(threadId).then(() => void refreshUnread());
    const ch = api.subscribeInserts("dm_messages", `thread_id=eq.${threadId}`, () => void load());
    return () => api.unsubscribe(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    if (!pendingCall || session.state !== "idle") return;
    const src = pendingCall;
    onPendingCallConsumed();
    void session.startCall(src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCall, session.state]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function sendText(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
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
    const ext = mode === "video" ? "webm" : "webm";
    const url = await api.uploadChatMedia(blob, ext);
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

  async function onBlock() {
    if (!peer?.id) return;
    await api.blockUser(peer.id);
    showToast("Blocked");
    onClose();
  }

  async function onDeleteThread() {
    await api.hideDmThread(threadId);
    showToast("Conversation removed from inbox");
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-label={`Message ${peerName}`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative z-10 flex h-[min(88dvh,640px)] w-full max-w-lg flex-col rounded-t-3xl border border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl sm:rounded-3xl"
      >
        <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">@{peerName}</p>
            <p className="text-[11px] text-white/40">Reply free — text, voice, cam, video</p>
          </div>
          <button type="button" onClick={() => navigate(`/messages/${threadId}`)} className="rounded-full p-2 text-white/50 hover:bg-white/8" aria-label="Open full chat">
            <ExternalLink className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/50 hover:bg-white/8" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <LiveSessionPanel session={session} peerName={peerName} />

        <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
          ) : msgs.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Say hello — no paywalls, ever.</p>
          ) : msgs.map((m) => (
            <MessageBubble
              key={m.id}
              m={m}
              onReport={() => setReportMsgId(m.id)}
              onDelete={async () => { await api.deleteDmMessage(m.id); await load(); }}
            />
          ))}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-white/10 px-2 py-1.5">
          <button type="button" disabled={!!recording || busy} onClick={() => void session.startCall("cam")}
            className="rounded-full p-2 text-white/60 hover:bg-white/8 disabled:opacity-40" aria-label="Cam to cam">
            <Video className="h-4 w-4" />
          </button>
          <button type="button" disabled={!!recording || busy} onClick={() => void session.startCall("mic")}
            className="rounded-full p-2 text-white/60 hover:bg-white/8 disabled:opacity-40" aria-label="Voice call">
            <Phone className="h-4 w-4" />
          </button>
          {recording ? (
            <button type="button" onClick={stopRecord} className="flex items-center gap-1 rounded-full bg-wild/25 px-2.5 py-1.5 text-xs font-semibold text-wild">
              <Square className="h-3 w-3 fill-current" /> Stop {recording}
            </button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => void startRecord("voice")}
                className="rounded-full p-2 text-white/60 hover:bg-white/8" aria-label="Record voice message">
                <Mic className="h-4 w-4" />
              </button>
              <button type="button" disabled={busy} onClick={() => void startRecord("video")}
                className="rounded-full p-2 text-white/60 hover:bg-white/8 text-[11px] font-semibold" aria-label="Record video message">
                Rec
              </button>
            </>
          )}
          <button type="button" onClick={() => void onBlock()} className="ml-auto rounded-full p-2 text-white/35 hover:bg-white/8" aria-label="Block">
            <Ban className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => void onDeleteThread()} className="rounded-full p-2 text-white/35 hover:bg-white/8" aria-label="Delete conversation">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={(e) => void sendText(e)} className="flex items-center gap-2 border-t border-white/10 px-3 py-2.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message…"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/50 focus:outline-none"
          />
          <button type="submit" disabled={!text.trim() || busy} className="flex h-10 w-10 items-center justify-center rounded-full bg-veil-500/30 text-white disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </motion.div>

      {reportMsgId && (
        <ReportModal
          open
          onClose={() => setReportMsgId(null)}
          targetKind="message"
          targetId={reportMsgId}
        />
      )}
    </motion.div>
  );
}

function MessageBubble({
  m, onReport, onDelete,
}: {
  m: DmMessage;
  onReport: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={cx("group flex", m.mine ? "justify-end" : "justify-start")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={cx("relative max-w-[85%] rounded-2xl px-3 py-2 text-sm", m.mine ? "bg-veil-500/25 text-white" : "bg-white/[0.06] text-white/90")}>
        {m.kind === "voice" && m.mediaUrl ? (
          <audio controls src={m.mediaUrl} className="max-w-full" />
        ) : m.kind === "video" && m.mediaUrl ? (
          <video controls src={m.mediaUrl} className="max-h-48 rounded-lg" />
        ) : (
          <p className="whitespace-pre-wrap break-words">{m.body}</p>
        )}
        <p className="mt-1 text-[10px] text-white/35">{timeAgo(m.createdAt)}</p>
        {hover && (
          <div className={cx("absolute -top-3 flex gap-0.5", m.mine ? "left-0" : "right-0")}>
            <button type="button" onClick={onReport} className="rounded-full bg-ink-900/90 p-1 text-white/60 ring-1 ring-white/10" aria-label="Report"><Flag className="h-3 w-3" /></button>
            <button type="button" onClick={onDelete} className="rounded-full bg-ink-900/90 p-1 text-white/60 ring-1 ring-white/10" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
