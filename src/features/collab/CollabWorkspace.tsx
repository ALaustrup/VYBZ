import type { ReactNode } from "react";
import type { CollabPane } from "@vybz/domain/collab";
import { CollabPresenceStrip } from "./CollabPresenceStrip";
import { LiveCursorsOverlay } from "./LiveCursorsOverlay";
import { CommentThreadPanel } from "./CommentThreadPanel";
import { CollabMergePanel } from "./CollabMergePanel";

export function CollabWorkspace(props: {
  releaseId: string;
  userId: string;
  username?: string | null;
  pane: CollabPane;
  showMerge?: boolean;
  seedMergeConflict?: boolean;
  showWaveComments?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="collab-workspace">
      <CollabPresenceStrip
        releaseId={props.releaseId}
        userId={props.userId}
        username={props.username}
        pane={props.pane}
      />
      <LiveCursorsOverlay
        releaseId={props.releaseId}
        userId={props.userId}
        username={props.username}
        pane={props.pane}
        className="relative min-h-[8rem] rounded-suite border border-dashed border-white/10 bg-white/[0.02] p-3"
      >
        {props.children}
      </LiveCursorsOverlay>
      {props.showWaveComments !== false && (
        <CommentThreadPanel
          releaseId={props.releaseId}
          authorId={props.userId}
          authorName={props.username}
          title="Waveform & metadata comments"
          defaultTimeSec={12.5}
        />
      )}
      {props.showMerge && (
        <CollabMergePanel
          releaseId={props.releaseId}
          seedConflict={props.seedMergeConflict}
        />
      )}
    </div>
  );
}
