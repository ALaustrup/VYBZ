import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, MessageSquare, Send, Radio, Mic, MonitorSpeaker } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ChatTabs } from "@/components/ChatTabs";
import { LiveSessionPanel } from "@/components/LiveSessionPanel";
import { useLiveSession } from "@/lib/liveSession";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { cx, timeAgo } from "@/lib/utils";
import type { DmMessage, DmThread } from "@/types";

export function MessagesPage() {
  const { id } = useParams();
  return id ? <Thread threadId={id} /> : <ThreadList />;
}

function ThreadList() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.listThreads().then((t) => { setThreads(t); setLoading(false); }); }, []);

  return (
    <div className="flex h-full flex-col">
      <ChatTabs active="direct" />
      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6 pt-1">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : threads.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No direct messages yet"
              body="Message someone from Network, or join a community Room."
              action={
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  <button type="button" onClick={() => navigate("/connect")} className="btn btn-primary h-9 px-4 py-0 text-xs">
                    Open Network
                  </button>
                  <button type="button" onClick={() => navigate("/rooms")} className="btn btn-ghost h-9 px-4 py-0 text-xs">
                    Rooms
                  </button>
                </div>
              }
            />
          )
          : <div className="divide-y divide-[var(--hairline)]">{threads.map((t) => (
              <button key={t.id} type="button" onClick={() => navigate(`/messages/${t.id}`)} className="flex w-full items-center gap-3 py-3.5 text-left active:scale-[0.995]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-veil-500/20 font-display font-bold text-veil-100 ring-1 ring-white/10">{(t.peerUsername || "?").charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{t.peerUsername || "Creator"}</p><p className="text-xs text-white/35">{timeAgo(t.lastAt)}</p></div>
              </button>
            ))}</div>}
      </div>
    </div>
  );
}

function Thread({ threadId }: { threadId: string }) {
  const { userId } = useSession();
  const [msgs, setMsgs] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [peer, setPeer] = useState<{ id: string; username: string | null } | null>(null);
  const [srcMenu, setSrcMenu] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const session = useLiveSession(threadId, userId);
  const peerName = peer?.username ?? "your collaborator";

  async function load() { setMsgs(await api.listMessages(threadId)); setLoading(false); }
  useEffect(() => {
    void load();
    void api.getThreadPeer(threadId).then(setPeer);
    const ch = api.subscribeInserts("dm_messages", `thread_id=eq.${threadId}`, () => void load());
    return () => api.unsubscribe(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  useRegisterAppBar({
    title: peer?.username ? `@${peer.username}` : "Conversation",
    actions: session.state === "idle" ? (
      <button type="button" onClick={() => setSrcMenu((v) => !v)} aria-label="Start live session" aria-expanded={srcMenu}
        className="flex h-9 items-center gap-1.5 rounded-full bg-veil-500/20 px-3 text-sm font-semibold text-veil-100 ring-1 ring-veil-400/40 active:scale-95">
        <Radio className="h-4 w-4" /> Go live
      </button>
    ) : null,
  }, [peer?.username, session.state, srcMenu]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText("");
    await api.sendMessage(threadId, body);
    await load();
  }

  return (
    <div className="relative flex h-full flex-col">
      {srcMenu && session.state === "idle" && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setSrcMenu(false)} />
          <div className="absolute right-4 top-2 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 p-1.5 shadow-card backdrop-blur-2xl">
            <button type="button" onClick={() => { setSrcMenu(false); void session.startCall("mic"); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/8">
              <Mic className="h-4 w-4 text-veil-200" /> <span><span className="font-semibold">Microphone</span><span className="block text-[11px] text-white/45">Jam or talk live</span></span>
            </button>
            <button type="button" onClick={() => { setSrcMenu(false); void session.startCall("desktop"); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/8">
              <MonitorSpeaker className="h-4 w-4 text-aqua-200" /> <span><span className="font-semibold">Desktop audio</span><span className="block text-[11px] text-white/45">Share a DAW/tab (Chrome)</span></span>
            </button>
          </div>
        </>
      )}
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : msgs.map((m) => (
            <div key={m.id} className={cx("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "ml-auto bg-veil-500/30 text-white" : "bg-white/[0.06] text-white/85")}>{m.body}</div>
          ))}
        <div ref={endRef} />
      </div>
      <LiveSessionPanel session={session} peerName={peerName} />
      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 px-1 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow active:scale-90"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
