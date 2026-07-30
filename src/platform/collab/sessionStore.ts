/**
 * Phase 16 — in-memory collab session (presence, cursors, comments).
 * Realtime bridge optional; e2e/local always use this store.
 */

import {
  peerColor,
  type CollabCursor,
  type CollabPane,
  type CollabPeer,
  type CommentAnchorKind,
  type ReleaseComment,
} from "@vybz/domain/collab";

type SessionKey = string;

type SessionState = {
  peers: Map<string, CollabPeer>;
  cursors: Map<string, CollabCursor>;
  comments: ReleaseComment[];
};

const sessions = new Map<SessionKey, SessionState>();
const listeners = new Map<SessionKey, Set<() => void>>();

function key(releaseId: string): SessionKey {
  return releaseId;
}

function ensure(releaseId: string): SessionState {
  const k = key(releaseId);
  let s = sessions.get(k);
  if (!s) {
    s = { peers: new Map(), cursors: new Map(), comments: [] };
    sessions.set(k, s);
  }
  return s;
}

function notify(releaseId: string) {
  const set = listeners.get(key(releaseId));
  if (!set) return;
  for (const l of set) l();
}

export function subscribeCollab(releaseId: string, cb: () => void): () => void {
  const k = key(releaseId);
  let set = listeners.get(k);
  if (!set) {
    set = new Set();
    listeners.set(k, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

export function joinCollabPresence(opts: {
  releaseId: string;
  userId: string;
  username: string | null;
  pane: CollabPane;
}): CollabPeer {
  const s = ensure(opts.releaseId);
  const peer: CollabPeer = {
    userId: opts.userId,
    username: opts.username,
    color: peerColor(opts.userId),
    pane: opts.pane,
    lastSeenAt: new Date().toISOString(),
  };
  s.peers.set(opts.userId, peer);
  notify(opts.releaseId);
  return peer;
}

export function leaveCollabPresence(releaseId: string, userId: string): void {
  const s = sessions.get(key(releaseId));
  if (!s) return;
  s.peers.delete(userId);
  s.cursors.delete(userId);
  notify(releaseId);
}

export function listCollabPeers(releaseId: string): CollabPeer[] {
  return [...(sessions.get(key(releaseId))?.peers.values() ?? [])].sort((a, b) =>
    a.userId.localeCompare(b.userId)
  );
}

export function publishCollabCursor(opts: {
  releaseId: string;
  userId: string;
  username: string | null;
  pane: CollabPane;
  x: number;
  y: number;
  focusField?: string | null;
}): CollabCursor {
  const s = ensure(opts.releaseId);
  const cursor: CollabCursor = {
    userId: opts.userId,
    username: opts.username,
    color: peerColor(opts.userId),
    pane: opts.pane,
    x: Math.max(0, Math.min(1, opts.x)),
    y: Math.max(0, Math.min(1, opts.y)),
    focusField: opts.focusField ?? null,
    updatedAt: new Date().toISOString(),
  };
  s.cursors.set(opts.userId, cursor);
  // Touch presence
  const peer = s.peers.get(opts.userId);
  if (peer) {
    s.peers.set(opts.userId, { ...peer, pane: opts.pane, lastSeenAt: cursor.updatedAt });
  }
  notify(opts.releaseId);
  return cursor;
}

export function listCollabCursors(releaseId: string, pane?: CollabPane): CollabCursor[] {
  const all = [...(sessions.get(key(releaseId))?.cursors.values() ?? [])];
  return pane ? all.filter((c) => c.pane === pane) : all;
}

export function addReleaseComment(opts: {
  releaseId: string;
  authorId: string;
  authorName?: string | null;
  parentId?: string | null;
  anchorKind: CommentAnchorKind;
  anchorRef?: string;
  timeSec?: number | null;
  body: string;
}): ReleaseComment {
  const s = ensure(opts.releaseId);
  const row: ReleaseComment = {
    id: crypto.randomUUID(),
    releaseId: opts.releaseId,
    authorId: opts.authorId,
    authorName: opts.authorName ?? null,
    parentId: opts.parentId ?? null,
    anchorKind: opts.anchorKind,
    anchorRef: opts.anchorRef ?? "",
    timeSec: opts.timeSec ?? null,
    body: opts.body.trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
  };
  s.comments = [row, ...s.comments];
  notify(opts.releaseId);
  return row;
}

export function listReleaseComments(
  releaseId: string,
  filter?: { anchorKind?: CommentAnchorKind; anchorRef?: string }
): ReleaseComment[] {
  let rows = sessions.get(key(releaseId))?.comments ?? [];
  if (filter?.anchorKind) rows = rows.filter((r) => r.anchorKind === filter.anchorKind);
  if (filter?.anchorRef != null) rows = rows.filter((r) => r.anchorRef === filter.anchorRef);
  return rows;
}

/** Seed demo peers/cursors/comments for Playwright. */
export function seedCollabDemo(releaseId: string): void {
  resetCollabSession(releaseId);
  joinCollabPresence({
    releaseId,
    userId: "peer-ava",
    username: "ava",
    pane: "prepare",
  });
  joinCollabPresence({
    releaseId,
    userId: "peer-ben",
    username: "ben",
    pane: "credits",
  });
  publishCollabCursor({
    releaseId,
    userId: "peer-ava",
    username: "ava",
    pane: "prepare",
    x: 0.42,
    y: 0.35,
    focusField: "title",
  });
  publishCollabCursor({
    releaseId,
    userId: "peer-ben",
    username: "ben",
    pane: "credits",
    x: 0.6,
    y: 0.55,
    focusField: "displayName",
  });
  addReleaseComment({
    releaseId,
    authorId: "peer-ava",
    authorName: "ava",
    anchorKind: "waveform_time",
    anchorRef: "master",
    timeSec: 12.5,
    body: "Drop feels hot here — check the transient.",
  });
  addReleaseComment({
    releaseId,
    authorId: "peer-ben",
    authorName: "ben",
    anchorKind: "metadata_field",
    anchorRef: "title",
    body: "Title should match the vinyl sticker.",
  });
}

export function resetCollabSession(releaseId?: string): void {
  if (releaseId) {
    sessions.delete(key(releaseId));
    notify(releaseId);
    return;
  }
  sessions.clear();
}
