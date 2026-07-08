import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
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
      <div className="px-4 pb-1 pt-3"><h1 className="font-display text-xl font-bold text-gradient">Messages</h1></div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : threads.length === 0 ? <EmptyState icon={MessageSquare} title="No messages yet" body="Connect with a collaborator from Connect or their profile to start a conversation." />
          : <div className="space-y-1.5">{threads.map((t) => (
              <button key={t.id} onClick={() => navigate(`/messages/${t.id}`)} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left active:scale-[0.99]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-veil-500/20 font-display font-bold text-veil-100">{(t.peerUsername || "?").charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{t.peerUsername || "Creator"}</p><p className="text-xs text-white/40">{timeAgo(t.lastAt)}</p></div>
              </button>
            ))}</div>}
      </div>
    </div>
  );
}

function Thread({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() { setMsgs(await api.listMessages(threadId)); setLoading(false); }
  useEffect(() => { void load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [threadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText("");
    await api.sendMessage(threadId, body);
    await load();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate("/messages")} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="font-display text-lg font-bold text-white">Conversation</h1>
      </div>
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-2">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : msgs.map((m) => (
            <div key={m.id} className={cx("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "ml-auto bg-veil-500/30 text-white" : "bg-white/[0.06] text-white/85")}>{m.body}</div>
          ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow active:scale-90"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
