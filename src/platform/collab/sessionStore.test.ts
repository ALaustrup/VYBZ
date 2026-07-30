import { beforeEach, describe, expect, it } from "vitest";
import {
  addReleaseComment,
  joinCollabPresence,
  listCollabPeers,
  listReleaseComments,
  publishCollabCursor,
  resetCollabSession,
  seedCollabDemo,
} from "./sessionStore";

describe("collab sessionStore", () => {
  beforeEach(() => {
    resetCollabSession();
  });

  it("tracks presence peers", () => {
    joinCollabPresence({
      releaseId: "r1",
      userId: "u1",
      username: "alice",
      pane: "prepare",
    });
    joinCollabPresence({
      releaseId: "r1",
      userId: "u2",
      username: "bob",
      pane: "credits",
    });
    const peers = listCollabPeers("r1");
    expect(peers).toHaveLength(2);
    expect(peers.map((p) => p.userId).sort()).toEqual(["u1", "u2"]);
  });

  it("stores comments by anchor", () => {
    addReleaseComment({
      releaseId: "r1",
      authorId: "u1",
      anchorKind: "waveform_time",
      anchorRef: "master",
      timeSec: 8,
      body: "loud",
    });
    expect(listReleaseComments("r1", { anchorKind: "waveform_time" })).toHaveLength(1);
    expect(listReleaseComments("r1", { anchorKind: "metadata_field" })).toHaveLength(0);
  });

  it("seedCollabDemo loads peers and comments", () => {
    seedCollabDemo("demo");
    expect(listCollabPeers("demo").length).toBeGreaterThanOrEqual(2);
    expect(listReleaseComments("demo").length).toBeGreaterThanOrEqual(2);
    publishCollabCursor({
      releaseId: "demo",
      userId: "self",
      username: "me",
      pane: "prepare",
      x: 0.1,
      y: 0.2,
    });
    expect(listCollabPeers("demo").some((p) => p.userId === "self")).toBe(false);
  });
});
