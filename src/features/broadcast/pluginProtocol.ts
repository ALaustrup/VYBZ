/**
 * VYBZ Broadcast plug-in wire protocol.
 *
 * The native VST3 / CLAP / AU plug-in is NATIVE-PLATFORM ONLY and is not in
 * this repository. This module is the contract the desktop/web client speaks
 * when a plug-in is listening on the loopback port.
 *
 * Control messages are UTF-8 JSON text frames.
 * Audio frames are binary: 16-byte header + interleaved Float32 LE stereo PCM.
 */

import type { DeliveryState } from "@/product/invariants";

export const DAW_PLUGIN_DELIVERY: DeliveryState = "NATIVE-PLATFORM ONLY";
export const DAW_BRIDGE_DELIVERY: DeliveryState = "PARTIALLY IMPLEMENTED";

export const DAW_PROTOCOL_VERSION = 1;
export const DAW_MAGIC = 0x5659425a; // "VYBZ"
export const DAW_FRAME_HEADER_BYTES = 16;
export const DEFAULT_DAW_PORT = 48480;
export const DEFAULT_DAW_WS_URL = `ws://127.0.0.1:${DEFAULT_DAW_PORT}/vybz-stream`;

export type DawPluginFormat = "vst3" | "clap" | "au" | "standalone";
export type DawProtocolStatus = "disconnected" | "connecting" | "connected" | "streaming";

export type DawInfo = {
  dawName: string;
  pluginFormat: DawPluginFormat;
  sampleRate: number;
  channels: 2;
  bufferSize: number;
  latencyMs: number;
};

export type DawMeterState = {
  peakL: number;
  peakR: number;
  rmsL: number;
  rmsR: number;
  lufsIntegrated: number;
  truePeak: number;
};

export type DawControlMessage =
  | { type: "hello"; info: DawInfo }
  | { type: "meter"; meter: DawMeterState }
  | { type: "status"; status: DawProtocolStatus }
  | { type: "ping" }
  | { type: "pong" }
  | { type: "telemetry"; listeners: number | null; sparksCount: number | null };

export type DawPcmFrame = {
  version: number;
  channels: number;
  sampleRate: number;
  frameCount: number;
  /** Interleaved stereo Float32, length === frameCount * channels. */
  samples: Float32Array;
};

const FORMATS: readonly DawPluginFormat[] = ["vst3", "clap", "au", "standalone"];
const STATUSES: readonly DawProtocolStatus[] = [
  "disconnected",
  "connecting",
  "connected",
  "streaming",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseDawInfo(value: unknown): DawInfo | null {
  if (!isRecord(value)) return null;
  const dawName = typeof value.dawName === "string" ? value.dawName.trim() : "";
  const pluginFormat = FORMATS.includes(value.pluginFormat as DawPluginFormat)
    ? (value.pluginFormat as DawPluginFormat)
    : null;
  const sampleRate = finiteNumber(value.sampleRate);
  const bufferSize = finiteNumber(value.bufferSize);
  const latencyMs = finiteNumber(value.latencyMs);
  const channels = value.channels === 2 ? 2 : null;
  if (!dawName || !pluginFormat || !sampleRate || !bufferSize || latencyMs === null || !channels) {
    return null;
  }
  if (sampleRate < 8000 || sampleRate > 192000) return null;
  if (bufferSize < 16 || bufferSize > 8192) return null;
  return { dawName, pluginFormat, sampleRate, channels, bufferSize, latencyMs };
}

export function parseDawMeter(value: unknown): DawMeterState | null {
  if (!isRecord(value)) return null;
  const peakL = finiteNumber(value.peakL);
  const peakR = finiteNumber(value.peakR);
  const rmsL = finiteNumber(value.rmsL);
  const rmsR = finiteNumber(value.rmsR);
  const lufsIntegrated = finiteNumber(value.lufsIntegrated);
  const truePeak = finiteNumber(value.truePeak);
  if (
    peakL === null ||
    peakR === null ||
    rmsL === null ||
    rmsR === null ||
    lufsIntegrated === null ||
    truePeak === null
  ) {
    return null;
  }
  return {
    peakL: clamp01(peakL),
    peakR: clamp01(peakR),
    rmsL: clamp01(rmsL),
    rmsR: clamp01(rmsR),
    lufsIntegrated,
    truePeak,
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function parseControlMessage(raw: string): DawControlMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.type !== "string") return null;

  switch (parsed.type) {
    case "hello": {
      const info = parseDawInfo(parsed.info);
      return info ? { type: "hello", info } : null;
    }
    case "meter": {
      const meter = parseDawMeter(parsed.meter);
      return meter ? { type: "meter", meter } : null;
    }
    case "status": {
      return STATUSES.includes(parsed.status as DawProtocolStatus)
        ? { type: "status", status: parsed.status as DawProtocolStatus }
        : null;
    }
    case "ping":
      return { type: "ping" };
    case "pong":
      return { type: "pong" };
    case "telemetry": {
      const listeners = parsed.listeners === null ? null : finiteNumber(parsed.listeners);
      const sparksCount = parsed.sparksCount === null ? null : finiteNumber(parsed.sparksCount);
      if (listeners === undefined || sparksCount === undefined) return null;
      return { type: "telemetry", listeners, sparksCount };
    }
    default:
      return null;
  }
}

export function encodeControlMessage(msg: DawControlMessage): string {
  return JSON.stringify(msg);
}

export function encodePcmFrame(frame: Omit<DawPcmFrame, "version">): ArrayBuffer {
  const header = new ArrayBuffer(DAW_FRAME_HEADER_BYTES + frame.samples.byteLength);
  const view = new DataView(header);
  view.setUint32(0, DAW_MAGIC, false);
  view.setUint8(4, DAW_PROTOCOL_VERSION);
  view.setUint8(5, frame.channels);
  view.setUint16(6, 0, true);
  view.setUint32(8, frame.sampleRate, true);
  view.setUint32(12, frame.frameCount, true);
  new Float32Array(header, DAW_FRAME_HEADER_BYTES).set(frame.samples);
  return header;
}

export function decodePcmFrame(buffer: ArrayBuffer): DawPcmFrame | null {
  if (buffer.byteLength < DAW_FRAME_HEADER_BYTES) return null;
  const view = new DataView(buffer);
  if (view.getUint32(0, false) !== DAW_MAGIC) return null;
  const version = view.getUint8(4);
  if (version !== DAW_PROTOCOL_VERSION) return null;
  const channels = view.getUint8(5);
  if (channels !== 2) return null;
  const sampleRate = view.getUint32(8, true);
  const frameCount = view.getUint32(12, true);
  if (sampleRate < 8000 || sampleRate > 192000 || frameCount < 1 || frameCount > 8192) {
    return null;
  }
  const expected = DAW_FRAME_HEADER_BYTES + frameCount * channels * 4;
  if (buffer.byteLength < expected) return null;
  const samples = new Float32Array(buffer, DAW_FRAME_HEADER_BYTES, frameCount * channels);
  return { version, channels, sampleRate, frameCount, samples };
}

/** Legacy: raw interleaved stereo Float32 with no header (older plug-in builds). */
export function decodeLegacyPcm(buffer: ArrayBuffer): Float32Array | null {
  if (buffer.byteLength < 8 || buffer.byteLength % 8 !== 0) return null;
  return new Float32Array(buffer);
}
