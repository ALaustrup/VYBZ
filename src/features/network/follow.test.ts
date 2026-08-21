import { describe, expect, it } from "vitest";
import { canFollowCreator } from "./follow";

describe("creator follow", () => {
  it("is unidirectional and not self-follow", () => {
    expect(canFollowCreator({ viewerId: "a", creatorId: "b" }).ok).toBe(true);
    expect(canFollowCreator({ viewerId: "a", creatorId: "a" }).ok).toBe(false);
    expect(canFollowCreator({ viewerId: null, creatorId: "b" }).ok).toBe(false);
  });
});
