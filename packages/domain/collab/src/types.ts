/** Phase 16 Collaboration Sessions — domain types */

export type CollabRole = "owner" | "editor" | "commenter";

export type CollabPane = "prepare" | "credits" | "master";

export type CommentAnchorKind = "waveform_time" | "metadata_field" | "credit_field" | "finding";

export type CollabPeer = {
  userId: string;
  username: string | null;
  color: string;
  pane: CollabPane;
  lastSeenAt: string;
};

export type CollabCursor = {
  userId: string;
  username: string | null;
  color: string;
  pane: CollabPane;
  /** Normalized 0–1 within pane viewport */
  x: number;
  y: number;
  focusField?: string | null;
  updatedAt: string;
};

export type ReleaseComment = {
  id: string;
  releaseId: string;
  authorId: string;
  authorName: string | null;
  parentId: string | null;
  anchorKind: CommentAnchorKind;
  anchorRef: string;
  timeSec: number | null;
  body: string;
  createdAt: string;
};

export type MergePatch = {
  title?: string;
  artist_name?: string | null;
};

export type MergeResult =
  | { status: "applied"; rowVersion: number }
  | {
      status: "conflict";
      rowVersion: number;
      current: MergePatch;
      patch: MergePatch;
    };
