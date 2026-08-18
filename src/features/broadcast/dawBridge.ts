/**
 * Browser-side client for the VLink (VYBZ Broadcast) master-bus plug-in.
 *
 * Connects to the plug-in's loopback WebSocket, decodes stereo PCM, and
 * exposes a MediaStream suitable for LiveKit music-mode publish.
 */

import {
  DEFAULT_DAW_WS_URL,
  decodeLegacyPcm,
  decodePcmFrame,
  encodeControlMessage,
  parseControlMessage,
  type DawInfo,
  type DawMeterState,
  type DawProtocolStatus,
  type DawTransport,
} from "./pluginProtocol";

export {
  DEFAULT_DAW_PORT,
  DEFAULT_DAW_WS_URL,
  type DawInfo,
  type DawMeterState,
  type DawPluginFormat,
  type DawProtocolStatus,
  type DawTransport,
} from "./pluginProtocol";

export type DawBridgeListener = {
  onStatusChange?: (status: DawProtocolStatus) => void;
  onMeterUpdate?: (meter: DawMeterState) => void;
  onInfo?: (info: DawInfo) => void;
  onTransport?: (transport: DawTransport) => void;
  /** Decoded stereo PCM bytes. Callers must not treat this as a measured master. */
  onPcmFrame?: (bytes: Uint8Array, sampleRate: number) => void;
};

export type WebSocketLike = {
  binaryType: string;
  onopen: ((ev?: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
  onclose: ((ev?: unknown) => void) | null;
  send: (data: string | ArrayBuffer) => void;
  close: () => void;
};

export interface DawBridgeClient {
  readonly status: DawProtocolStatus;
  readonly info: DawInfo | null;
  readonly meter: DawMeterState | null;
  readonly transport: DawTransport | null;
  connect: (url?: string) => Promise<boolean>;
  disconnect: () => void;
  getMediaStream: () => MediaStream | null;
  sendTelemetry: (listeners: number | null, sparksCount: number | null) => void;
  subscribe: (listener: DawBridgeListener) => () => void;
}

export function createDawBridgeClient(options?: {
  onStatusChange?: (status: DawProtocolStatus) => void;
  onMeterUpdate?: (meter: DawMeterState) => void;
  onInfo?: (info: DawInfo) => void;
  webSocketFactory?: (url: string) => WebSocketLike;
  connectTimeoutMs?: number;
  audioContextFactory?: (sampleRate: number) => AudioContextLike | null;
}): DawBridgeClient {
  let ws: WebSocketLike | null = null;
  let status: DawProtocolStatus = "disconnected";
  let info: DawInfo | null = null;
  let meter: DawMeterState | null = null;
  let transport: DawTransport | null = null;
  let audioCtx: AudioContextLike | null = null;
  let destNode: MediaStreamAudioDestinationNode | null = null;
  let nextPlayTime = 0;
  const listeners = new Set<DawBridgeListener>();

  if (options?.onStatusChange || options?.onMeterUpdate || options?.onInfo) {
    listeners.add({
      onStatusChange: options.onStatusChange,
      onMeterUpdate: options.onMeterUpdate,
      onInfo: options.onInfo,
    });
  }

  function setStatus(next: DawProtocolStatus) {
    if (status === next) return;
    status = next;
    listeners.forEach((l) => l.onStatusChange?.(next));
  }

  function initAudioPipeline(sampleRate = 48000) {
    if (audioCtx) return;
    try {
      if (options?.audioContextFactory) {
        audioCtx = options.audioContextFactory(sampleRate);
      } else if (typeof window !== "undefined") {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        audioCtx = new Ctor({ sampleRate }) as unknown as AudioContextLike;
      }
      destNode = audioCtx?.createMediaStreamDestination() ?? null;
      nextPlayTime = 0;
    } catch {
      audioCtx = null;
      destNode = null;
    }
  }

  function emitPcm(samples: Float32Array, sampleRate: number) {
    if (listeners.size === 0 || samples.byteLength < 1) return;
    const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
    listeners.forEach((l) => l.onPcmFrame?.(bytes, sampleRate));
  }

  function enqueuePcm(samples: Float32Array, sampleRate: number) {
    if (!audioCtx || !destNode) return;
    const frames = Math.floor(samples.length / 2);
    if (frames < 1) return;
    const buffer = audioCtx.createBuffer(2, frames, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < frames; i++) {
      left[i] = samples[i * 2] ?? 0;
      right[i] = samples[i * 2 + 1] ?? 0;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(destNode);
    const now = audioCtx.currentTime;
    if (nextPlayTime < now) nextPlayTime = now;
    src.start(nextPlayTime);
    nextPlayTime += buffer.duration;
  }

  function handleBinary(data: ArrayBuffer) {
    initAudioPipeline(info?.sampleRate ?? 48000);
    const framed = decodePcmFrame(data);
    if (framed) {
      setStatus("streaming");
      enqueuePcm(framed.samples, framed.sampleRate);
      emitPcm(framed.samples, framed.sampleRate);
      return;
    }
    const legacy = decodeLegacyPcm(data);
    if (legacy) {
      const sr = info?.sampleRate ?? audioCtx?.sampleRate ?? 48000;
      setStatus("streaming");
      enqueuePcm(legacy, sr);
      emitPcm(legacy, sr);
    }
  }

  function handleText(raw: string) {
    const msg = parseControlMessage(raw);
    if (!msg) return;
    if (msg.type === "hello") {
      info = msg.info;
      listeners.forEach((l) => l.onInfo?.(msg.info));
      initAudioPipeline(msg.info.sampleRate);
    } else if (msg.type === "meter") {
      meter = msg.meter;
      listeners.forEach((l) => l.onMeterUpdate?.(msg.meter));
    } else if (msg.type === "transport") {
      transport = msg.transport;
      listeners.forEach((l) => l.onTransport?.(msg.transport));
    } else if (msg.type === "status") {
      setStatus(msg.status);
    } else if (msg.type === "ping") {
      try {
        ws?.send(encodeControlMessage({ type: "pong" }));
      } catch {
        /* ignore */
      }
    }
  }

  return {
    get status() {
      return status;
    },
    get info() {
      return info;
    },
    get meter() {
      return meter;
    },
    get transport() {
      return transport;
    },
    getMediaStream() {
      return destNode?.stream ?? null;
    },
    sendTelemetry(listenerCount, sparksCount) {
      if (!ws || status === "disconnected" || status === "connecting") return;
      try {
        ws.send(encodeControlMessage({ type: "telemetry", listeners: listenerCount, sparksCount }));
      } catch {
        /* ignore */
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect(url = DEFAULT_DAW_WS_URL): Promise<boolean> {
      return new Promise((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        if (ws) {
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          ws = null;
        }

        setStatus("connecting");
        const timeoutMs = options?.connectTimeoutMs ?? 2500;
        const timer = setTimeout(() => {
          try {
            ws?.close();
          } catch {
            /* ignore */
          }
          setStatus("disconnected");
          finish(false);
        }, timeoutMs);

        try {
          const factory = options?.webSocketFactory ?? defaultWebSocket;
          const socket = factory(url);
          socket.binaryType = "arraybuffer";
          ws = socket;

          socket.onopen = () => {
            clearTimeout(timer);
            setStatus("connected");
            initAudioPipeline(info?.sampleRate ?? 48000);
            finish(true);
          };

          socket.onmessage = (event) => {
            const data = event.data;
            if (typeof data === "string") {
              handleText(data);
            } else if (data instanceof ArrayBuffer) {
              handleBinary(data);
            } else if (typeof Blob !== "undefined" && data instanceof Blob) {
              void data.arrayBuffer().then(handleBinary);
            }
          };

          socket.onerror = () => {
            clearTimeout(timer);
            setStatus("disconnected");
            finish(false);
          };

          socket.onclose = () => {
            clearTimeout(timer);
            ws = null;
            setStatus("disconnected");
            finish(false);
          };
        } catch {
          clearTimeout(timer);
          setStatus("disconnected");
          finish(false);
        }
      });
    },
    disconnect() {
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        ws = null;
      }
      if (audioCtx) {
        try {
          void audioCtx.close();
        } catch {
          /* ignore */
        }
        audioCtx = null;
        destNode = null;
      }
      info = null;
      meter = null;
      transport = null;
      nextPlayTime = 0;
      setStatus("disconnected");
    },
  };
}

function defaultWebSocket(url: string): WebSocketLike {
  return new WebSocket(url) as unknown as WebSocketLike;
}

/** Minimal AudioContext surface the bridge needs — injectable in tests. */
export type AudioContextLike = {
  sampleRate: number;
  currentTime: number;
  createMediaStreamDestination: () => MediaStreamAudioDestinationNode;
  createBuffer: (channels: number, frames: number, sampleRate: number) => AudioBuffer;
  createBufferSource: () => AudioBufferSourceNode;
  close: () => Promise<void>;
};
