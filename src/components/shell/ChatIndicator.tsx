import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInboxThreads } from "@/hooks/useInboxThreads";
import { cx } from "@/lib/utils";

/**
 * Lightweight chat pip. `/messages` stays the destination; this is not a
 * second inbox warehouse in the chrome.
 */
export function ChatIndicator() {
  const navigate = useNavigate();
  const { threads } = useInboxThreads(50);
  const unread = threads.reduce((n, t) => n + (t.unread ? 1 : 0), 0);

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
