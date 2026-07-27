import { useState } from "react";
import { Ban, Flag, Loader2, MessageSquare, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { SwipeActionRow } from "@/components/SwipeActionRow";
import { Avatar } from "@/components/Avatar";
import { ReportModal } from "@/components/ReportModal";
import { useInboxThreads } from "@/hooks/useInboxThreads";
import { useMessagePopout } from "@/lib/messagePopout";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";

export function ProfileInbox() {
  const { openThread } = useMessagePopout();
  const { showToast } = useSession();
  const { threads, loading, reload } = useInboxThreads(50);
  const [reportPeer, setReportPeer] = useState<string | null>(null);

  async function block(peerId: string) {
    await api.blockUser(peerId);
    showToast("Blocked");
    await reload();
  }

  async function remove(threadId: string) {
    await api.hideDmThread(threadId);
    showToast("Removed from inbox");
    await reload();
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Inbox is empty"
        body="When someone messages you, it lands here — unread stays highlighted until you open it."
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-[var(--hairline)]" role="list" aria-label="Inbox">
        {threads.map((t) => (
          <SwipeActionRow
            key={t.id}
            actions={
              <>
                <button type="button" onClick={() => setReportPeer(t.peerId)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70" aria-label="Report">
                  <Flag className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => void block(t.peerId)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70" aria-label="Block">
                  <Ban className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => void remove(t.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-wild/25 text-wild" aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            }
          >
            <button
              type="button"
              onClick={() => openThread(t.id)}
              className={cx(
                "flex w-full items-center gap-3 py-3.5 pr-2 text-left active:scale-[0.995]",
                t.unread && "bg-veil-500/[0.08]",
              )}
            >
              <Avatar url={t.peerAvatarUrl} name={t.peerUsername} id={t.peerId} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cx("truncate font-semibold", t.unread ? "text-white" : "text-white/85")}>
                    {t.peerUsername || "Creator"}
                  </p>
                  {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-veil-300" aria-label="Unread" />}
                </div>
                <p className={cx("truncate text-xs", t.unread ? "font-medium text-white/70" : "text-white/40")}>
                  {t.lastBody || timeAgo(t.lastAt)}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-white/35">{timeAgo(t.lastAt)}</span>
            </button>
          </SwipeActionRow>
        ))}
      </div>
      {reportPeer && (
        <ReportModal
          open
          onClose={() => setReportPeer(null)}
          targetKind="user"
          targetId={reportPeer}
          targetLabel={threads.find((t) => t.peerId === reportPeer)?.peerUsername ?? undefined}
        />
      )}
    </>
  );
}
