import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInboxThreads } from "@/hooks/useInboxThreads";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";

/**
 * Lightweight chat pip. `/messages` stays the destination; this is not a
 * second inbox warehouse in the chrome. Message notifications badge here only.
 */
export function ChatIndicator() {
  const navigate = useNavigate();
  const { threads } = useInboxThreads(50);
  const [messageNotifUnread, setMessageNotifUnread] = useState(0);

  const threadUnread = threads.reduce((n, t) => n + (t.unread ? 1 : 0), 0);

  useEffect(() => {
    const load = () => {
      void api.unreadChatNotificationCount().then(setMessageNotifUnread);
    };
    load();
    const ch = api.subscribeInserts("notifications", undefined, load);
    return () => api.unsubscribe(ch);
  }, []);

  const unread = threadUnread > 0 ? threadUnread : messageNotifUnread;

  return (
    <button
      type="button"
      onClick={() => navigate("/messages")}
      aria-label={unread > 0 ? `Chat, ${unread} unread` : "Chat"}
      data-testid="chat-indicator"
      data-tip="Chat"
      className="forge-chip relative flex h-10 w-10 active:scale-90"
    >
      <MessageCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      {unread > 0 ? (
        <span
          className={cx(
            "absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-[rgb(var(--app-accent-rgb))] px-1",
            "text-center text-[9px] font-bold tabular-nums leading-4 text-black",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}
