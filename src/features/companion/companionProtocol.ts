/**
 * Multi-device companion control protocol (Android / tablet / second browser).
 *
 * Transport is the existing Supabase realtime plane — domain code never
 * imports Capacitor. Lockstep position and listener counts stay nullable so
 * we never invent a measurement.
 */

export type CompanionRole = "host" | "remote";

export type CompanionFaderId = "master" | "cue";

export type CompanionMessage =
  | { type: "hello"; role: CompanionRole; deviceLabel: string }
  | { type: "fader"; id: CompanionFaderId; value: number }
  | { type: "mute"; id: CompanionFaderId; muted: boolean }
  | { type: "spark" }
  | { type: "chat"; body: string }
  | { type: "lockstep"; playing: boolean; positionMs: number | null }
  | { type: "presence"; remotes: number };

export type CompanionState = {
  master: number;
  cue: number;
  masterMuted: boolean;
  cueMuted: boolean;
  playing: boolean;
  positionMs: number | null;
  remotes: number;
};

export const INITIAL_COMPANION_STATE: CompanionState = {
  master: 1,
  cue: 0.75,
  masterMuted: false,
  cueMuted: false,
  playing: true,
  positionMs: null,
  remotes: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function companionTopic(sessionId: string): string {
  return `vybz-companion:${sessionId}`;
}

export function parseCompanionMessage(value: unknown): CompanionMessage | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  switch (value.type) {
    case "hello": {
      if (value.role !== "host" && value.role !== "remote") return null;
      const deviceLabel = typeof value.deviceLabel === "string" ? value.deviceLabel.trim() : "";
      if (!deviceLabel) return null;
      return { type: "hello", role: value.role, deviceLabel };
    }
    case "fader": {
      if (value.id !== "master" && value.id !== "cue") return null;
      const raw = finiteNumber(value.value);
      if (raw === null) return null;
      return { type: "fader", id: value.id, value: clamp01(raw) };
    }
    case "mute": {
      if (value.id !== "master" && value.id !== "cue") return null;
      if (typeof value.muted !== "boolean") return null;
      return { type: "mute", id: value.id, muted: value.muted };
    }
    case "spark":
      return { type: "spark" };
    case "chat": {
      const body = typeof value.body === "string" ? value.body.trim() : "";
      if (!body || body.length > 1000) return null;
      return { type: "chat", body };
    }
    case "lockstep": {
      if (typeof value.playing !== "boolean") return null;
      const positionMs = value.positionMs === null ? null : finiteNumber(value.positionMs);
      if (positionMs === undefined) return null;
      return { type: "lockstep", playing: value.playing, positionMs };
    }
    case "presence": {
      const remotes = finiteNumber(value.remotes);
      if (remotes === null || remotes < 0) return null;
      return { type: "presence", remotes: Math.floor(remotes) };
    }
    default:
      return null;
  }
}

export function applyCompanionMessage(state: CompanionState, msg: CompanionMessage): CompanionState {
  switch (msg.type) {
    case "fader":
      return { ...state, [msg.id]: msg.value };
    case "mute":
      return msg.id === "master"
        ? { ...state, masterMuted: msg.muted }
        : { ...state, cueMuted: msg.muted };
    case "lockstep":
      return { ...state, playing: msg.playing, positionMs: msg.positionMs };
    case "presence":
      return { ...state, remotes: msg.remotes };
    default:
      return state;
  }
}
