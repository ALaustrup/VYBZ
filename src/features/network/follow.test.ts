import { describe, expect, it } from "vitest";
import { connectButtonIsSpent } from "./connectStatus";
import { canFollowCreator } from "./follow";

describe("creator follow", () => {
  it("is unidirectional and not self-follow", () => {
    expect(canFollowCreator({ viewerId: "a", creatorId: "b" }).ok).toBe(true);
    expect(canFollowCreator({ viewerId: "a", creatorId: "a" }).ok).toBe(false);
    expect(canFollowCreator({ viewerId: null, creatorId: "b" }).ok).toBe(false);
  });
});

describe("connect button", () => {
  it("is spent on pending or accepted, not declined", () => {
    expect(connectButtonIsSpent("pending")).toBe(true);
    expect(connectButtonIsSpent("accepted")).toBe(true);
    expect(connectButtonIsSpent("declined")).toBe(false);
    expect(connectButtonIsSpent(null)).toBe(false);
  });
});
