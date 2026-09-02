import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Handshake, Loader2, X, ChevronLeft, ChevronRight, Bell,
} from "lucide-react";
import * as api from "@/lib/api";
import { useMessagePopout } from "@/lib/messagePopout";
import { useSession } from "@/store/session";
import { timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";
import { isChatNotification } from "@/lib/notificationRouting";

const ROTATE_MS = 15_000;

export function isMustAckNotification(n: AppNotification): boolean {
  if (isChatNotification(n)) return false;
  if (n.payload?.mustAck === true) return true;
  if (n.payload?.action === "reconnect") return true;
  if (n.kind === "connection" && !!n.actorId && /wants to connect/i.test(n.title)) return true;
  return false;
}

/**
 * Rotating must-acknowledge alerts (hub / profile surfaces).
 * Cannot soft-dismiss — user must Accept/Decline or send a reconnect hello.
 */
export function WallAlerts({
  onQueueChange,
}: {
  onQueueChange?: (count: number) => void;
}) {
  const navigate = useNavigate();
  const { openThread } = useMessagePopout();
  const { showToast, refreshUnread } = useSession();
  const [queue, setQueue] = useState<AppNotification[]>([]);
  const [idx, setIdx] = useState(0);
  const [acting, setActing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    void api.expireStaleConnections().catch(() => undefined);
    const items = await api.listLiveFeed(80);
    const must = items.filter((n) => isMustAckNotification(n) && !isResolved(n));
    setQueue(must);
    onQueueChange?.(must.length);
    setLoading(false);
    setIdx((i) => (must.length ? Math.min(i, must.length - 1) : 0));
  }, [onQueueChange]);

  useEffect(() => {
    void load();
    const ch = api.subscribeInserts("notifications", undefined, () => void load());
    return () => api.unsubscribe(ch);
  }, [load]);

  useEffect(() => {
    if (queue.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % queue.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [queue.length]);

  const current = queue[idx] ?? null;

  async function respond(accept: boolean) {
    if (!current?.actorId || acting) return;
    setActing(true);
    const ok = await api.respondConnection(current.actorId, accept);
    setActing(false);
    if (!ok) { showToast("Couldn't update that request"); return; }
    showToast(accept ? "Connected" : "Request declined");
    await api.markNotificationRead(current.id);
    void refreshUnread();
    await load();
  }

  async function reconnect() {
    const peerId = String(current?.payload?.peerId ?? current?.actorId ?? "");
    const nudge = String(current?.payload?.nudgeBody ?? "Hey, I sent a friend request — if you accept we can both enjoy the VYBZ together!");
    if (!peerId) return;
    setActing(true);
    await api.connect(peerId);
    const threadId = await api.startDm(peerId);
    if (threadId) await api.sendMessage(threadId, nudge);
    if (current) await api.markNotificationRead(current.id);
    setActing(false);
    showToast("Request sent with a friendly hello");
    void refreshUnread();
    await load();
    if (threadId) openThread(threadId);
  }

  if (loading || !current) return null;

  const isConn = current.kind === "connection" && /wants to connect/i.test(current.title);
  const isExpiredNudge = current.kind === "connection" && current.payload?.action === "reconnect";

  return (
    <section className="mb-4" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="nexus-eyebrow">Alerts</p>
        {queue.length > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous alert" onClick={() => setIdx((i) => (i - 1 + queue.length) % queue.length)}
              className="rounded-full p-1 text-white/40 hover:text-white/70">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] tabular-nums text-white/40">{idx + 1}/{queue.length}</span>
            <button type="button" aria-label="Next alert" onClick={() => setIdx((i) => (i + 1) % queue.length)}
              className="rounded-full p-1 text-white/40 hover:text-white/70">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="forge-card border-feel/30 ring-1 ring-feel/25">
        <div className="flex items-start gap-3">
          <span className="forge-card-icon flex h-10 w-10 shrink-0 items-center justify-center text-feel">
            {isConn || isExpiredNudge ? <Handshake className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-white">{current.title}</p>
            {current.body && <p className="mt-0.5 text-[12px] leading-snug text-white/55">{current.body}</p>}
            <p className="mt-1 text-[10px] uppercase tracking-wide text-white/35">
              {timeAgo(current.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {isConn && (
            <>
              <button type="button" disabled={acting} onClick={() => void respond(true)}
                className="forge-cta h-9 flex-1 !min-h-9 !px-3 !text-xs disabled:opacity-50">
                {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Accept
              </button>
              <button type="button" disabled={acting} onClick={() => void respond(false)}
                className="forge-cta-ghost h-9 flex-1 !min-h-9 !px-3 !text-xs disabled:opacity-50">
                <X className="h-3.5 w-3.5" /> Decline
              </button>
            </>
          )}
          {isExpiredNudge && (
            <button type="button" disabled={acting} onClick={() => void reconnect()}
              className="forge-cta h-9 w-full !min-h-9 !px-3 !text-xs disabled:opacity-50">
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
              Send again + hello
            </button>
          )}
          {!isConn && !isExpiredNudge && current.actorId && (
            <button type="button" onClick={() => navigate(`/u/${current.actorId}`)}
              className="forge-cta-ghost h-9 w-full !min-h-9 !px-3 !text-xs">
              View profile
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function isResolved(n: AppNotification): boolean {
  if (/you're connected|request declined|accepted your connection/i.test(n.title)) return true;
  return !!n.read;
}
