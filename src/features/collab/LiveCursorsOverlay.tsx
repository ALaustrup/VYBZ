import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CollabCursor, CollabPane } from "@vybz/domain/collab";
import {
  broadcastCursor,
  listCollabCursors,
  subscribeCollab,
} from "@/platform/collab";

export function LiveCursorsOverlay(props: {
  releaseId: string;
  userId: string;
  username?: string | null;
  pane: CollabPane;
  className?: string;
  children?: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [cursors, setCursors] = useState<CollabCursor[]>([]);
  const lastSent = useRef(0);

  useEffect(() => {
    const refresh = () =>
      setCursors(
        listCollabCursors(props.releaseId, props.pane).filter((c) => c.userId !== props.userId)
      );
    refresh();
    return subscribeCollab(props.releaseId, refresh);
  }, [props.releaseId, props.pane, props.userId]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastSent.current < 50) return;
      lastSent.current = now;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      void broadcastCursor({
        releaseId: props.releaseId,
        userId: props.userId,
        username: props.username ?? null,
        pane: props.pane,
        x,
        y,
        focusField: (document.activeElement as HTMLElement | null)?.dataset?.collabField ?? null,
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [props.releaseId, props.userId, props.username, props.pane]);

  return (
    <div
      ref={rootRef}
      className={props.className ?? "relative"}
      data-testid="collab-cursors-layer"
    >
      {props.children}
      {cursors.map((c) => (
        <div
          key={c.userId}
          className="pointer-events-none absolute z-20 -translate-x-1 -translate-y-1"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
          data-testid="collab-cursor"
          aria-hidden
        >
          <svg width="14" height="18" viewBox="0 0 14 18" fill={c.color}>
            <path d="M1 1 L1 15 L5 12 L8 17 L10 16 L7 11 L13 11 Z" />
          </svg>
          <span
            className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-ink"
            style={{ background: c.color }}
          >
            {c.username || "peer"}
          </span>
        </div>
      ))}
    </div>
  );
}
