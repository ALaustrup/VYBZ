import { describe, expect, it } from "vitest";
import { mergeReleaseMetadataLocal, peerColor } from "@vybz/domain/collab";

describe("mergeReleaseMetadataLocal", () => {
  it("applies when versions match", () => {
    const r = mergeReleaseMetadataLocal({
      current: { title: "A", artist_name: "X", rowVersion: 1 },
      expectedVersion: 1,
      patch: { title: "B" },
    });
    expect(r.status).toBe("applied");
    if (r.status === "applied") expect(r.rowVersion).toBe(2);
  });

  it("conflicts when expected version is stale", () => {
    const r = mergeReleaseMetadataLocal({
      current: { title: "Server", artist_name: null, rowVersion: 3 },
      expectedVersion: 2,
      patch: { title: "Mine" },
    });
    expect(r.status).toBe("conflict");
    if (r.status === "conflict") {
      expect(r.current.title).toBe("Server");
      expect(r.patch.title).toBe("Mine");
      expect(r.rowVersion).toBe(3);
    }
  });

  it("peerColor is stable", () => {
    expect(peerColor("u1")).toBe(peerColor("u1"));
    expect(peerColor("u1")).not.toBe(peerColor("u2"));
  });
});
