import { beforeEach, describe, expect, it } from "vitest";
import {
  getLocalReleaseDoc,
  mergeReleaseMetadataLocalStore,
  resetLocalMergeDocs,
  setLocalReleaseDoc,
} from "./serverMerge";

describe("mergeReleaseMetadataLocalStore", () => {
  beforeEach(() => {
    resetLocalMergeDocs();
  });

  it("applies patch and bumps row version", () => {
    const r = mergeReleaseMetadataLocalStore("r1", 1, { title: "Hello" });
    expect(r.status).toBe("applied");
    expect(getLocalReleaseDoc("r1").title).toBe("Hello");
    expect(getLocalReleaseDoc("r1").rowVersion).toBe(2);
  });

  it("returns conflict when stale", () => {
    setLocalReleaseDoc("r1", { title: "Server", artist_name: null, rowVersion: 4 });
    const r = mergeReleaseMetadataLocalStore("r1", 3, { title: "Mine" });
    expect(r.status).toBe("conflict");
    if (r.status === "conflict") {
      expect(r.current.title).toBe("Server");
      expect(r.patch.title).toBe("Mine");
    }
  });
});
