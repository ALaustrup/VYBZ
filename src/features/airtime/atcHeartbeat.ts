import { ATC_POLICY } from "@/product/invariants";

export const HEARTBEAT_GAP_RESET_MS = 45_000;

export function shouldAwardChunk(input: {
  focused: boolean;
  playing: boolean;
  lastHeartbeatAt: number | null;
  lastAwardedAt: number | null;
  now: number;
}): "idle" | "arm" | "award" | "wait" {
  if (!input.focused || !input.playing) return "idle";
  const gap = input.lastHeartbeatAt == null ? Infinity : input.now - input.lastHeartbeatAt;
  if (gap > HEARTBEAT_GAP_RESET_MS) return "arm";
  if (input.lastAwardedAt == null) return "arm";
  const since = input.now - input.lastAwardedAt;
  if (since >= ATC_POLICY.heartbeatChunkSeconds * 1000) return "award";
  return "wait";
}

export function isConcurrentEarnExcess(activeSessions: number): boolean {
  return activeSessions >= ATC_POLICY.maxConcurrentEarnSessions;
}

export function formatAtcClock(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "Not measured";
  const n = Math.floor(seconds);
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}
