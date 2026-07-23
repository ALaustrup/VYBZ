import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { ProjectMessage } from "@/lib/api";

/** Member-only Collab room thread (project_messages). */
export function ProjectChat({ projectId, fill = false }: { projectId: string; fill?: boolean }) {
  const [msgs, setMsgs] = useState<ProjectMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    setMsgs(await api.listProjectMessages(projectId));
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void load().finally(() => { if (alive) setLoading(false); });
    const ch = api.subscribeInserts("project_messages", `project_id=eq.${projectId}`, () => void load());
    return () => { alive = false; api.unsubscribe(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setText("");
    setSending(true);
    try {
      await api.sendProjectMessage(projectId, body);
      await load();
    } catch {
      setText(body);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cx(fill ? "flex min-h-0 flex-1 flex-col" : "mt-5")}>
      {!fill && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          <MessageSquare className="h-3.5 w-3.5" /> Room chat
        </div>
      )}
      <div
        className={cx(
          "flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]",
          fill ? "min-h-0 flex-1" : "max-h-72",
        )}
      >
        <div className="no-scrollbar flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
          ) : msgs.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-white/40">No messages yet. Coordinate versions, notes, and feedback here.</p>
          ) : (
            msgs.map((m, i) => {
              const prev = msgs[i - 1];
              const showName = !prev || prev.senderId !== m.senderId;
              return (
                <div key={m.id} className={cx("flex flex-col", m.mine ? "items-end" : "items-start")}>
                  {showName && (
                    <span className="mb-0.5 px-1 text-[10px] font-medium text-white/35">
                      {m.mine ? "You" : (m.username ?? "member")}
                    </span>
                  )}
                  <div className={cx(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug",
                    m.mine ? "bg-veil-500/25 text-white" : "bg-white/[0.06] text-white/85",
                  )}>
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-white/8 px-2.5 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder="Message collaborators…"
            className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-veil-500/25 text-veil-100 ring-1 ring-veil-400/30 active:scale-95 disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
