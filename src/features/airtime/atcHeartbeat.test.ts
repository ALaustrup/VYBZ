import { describe, expect, it } from "vitest";
import { ATC_POLICY } from "@/product/invariants";
import {
  formatAtcClock,
  HEARTBEAT_GAP_RESET_MS,
  isConcurrentEarnExcess,
  shouldAwardChunk,
} from "./atcHeartbeat";

describe("ATC heartbeat", () => {
  it("does not award when the tab is hidden or audio is not playing", () => {
    expect(shouldAwardChunk({
      focused: false, playing: true, lastHeartbeatAt: 1, lastAwardedAt: 1, now: 40_000,
    })).toBe("idle");
    expect(shouldAwardChunk({
      focused: true, playing: false, lastHeartbeatAt: 1, lastAwardedAt: 1, now: 40_000,
    })).toBe("idle");
  });

  it("arms a new streak after a 45s gap instead of catching up", () => {
    expect(shouldAwardChunk({
      focused: true,
      playing: true,
      lastHeartbeatAt: 0,
      lastAwardedAt: 0,
      now: HEARTBEAT_GAP_RESET_MS + 1,
    })).toBe("arm");
  });

  it("awards only after a full declared chunk", () => {
    expect(shouldAwardChunk({
      focused: true, playing: true, lastHeartbeatAt: 10_000, lastAwardedAt: 10_000, now: 20_000,
    })).toBe("wait");
    expect(shouldAwardChunk({
      focused: true,
      playing: true,
      lastHeartbeatAt: 10_000,
      lastAwardedAt: 10_000,
      now: 10_000 + ATC_POLICY.heartbeatChunkSeconds * 1000,
    })).toBe("award");
  });

  it("flags concurrent earning at the declared cap", () => {
    expect(isConcurrentEarnExcess(3)).toBe(false);
    expect(isConcurrentEarnExcess(4)).toBe(true);
  });

  it("formats a clock or Not measured", () => {
    expect(formatAtcClock(null)).toBe("Not measured");
    expect(formatAtcClock(7200)).toBe("2h");
    expect(formatAtcClock(10800)).toBe("3h");
    expect(formatAtcClock(3660)).toBe("1h 1m");
    expect(formatAtcClock(65)).toBe("1m 5s");
    expect(formatAtcClock(60)).toBe("1m");
  });
});
