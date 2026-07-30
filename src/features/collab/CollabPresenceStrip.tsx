import { useEffect, useState } from "react";
import type { CollabPane, CollabPeer } from "@vybz/domain/collab";
import {
  bindReleaseCollabRealtime,
  listCollabPeers,
  subscribeCollab,
} from "@/platform/collab";

export function CollabPresenceStrip(props: {
  releaseId: string;
  userId: string;
  username?: string | null;
  pane: CollabPane;
}) {
  const [peers, setPeers] = useState<CollabPeer[]>([]);

  useEffect(() => {
    let unbind: () => void = () => {};
    void bindReleaseCollabRealtime({
      releaseId: props.releaseId,
      userId: props.userId,
      username: props.username ?? null,
      pane: props.pane,
    }).then((fn) => {
      unbind = fn;
    });
    const refresh = () => setPeers(listCollabPeers(props.releaseId));
    refresh();
    const unsub = subscribeCollab(props.releaseId, refresh);
    return () => {
      unbind();
      unsub();
    };
  }, [props.releaseId, props.userId, props.username, props.pane]);

  if (!peers.length) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="collab-presence-strip"
      role="group"
      aria-label="Collaborators online"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-fog">Live</span>
      {peers.map((p) => (
        <span
          key={p.userId}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-snow"
          data-testid="collab-peer-chip"
          title={`${p.username || p.userId} · ${p.pane}`}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
            aria-hidden
          />
          {p.username || p.userId.slice(0, 6)}
          <span className="text-[10px] text-fog">{p.pane}</span>
        </span>
      ))}
    </div>
  );
}
