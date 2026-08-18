import { afterEach, describe, expect, it } from "vitest";
import { createDawBridgeClient, type WebSocketLike } from "./dawBridge";
import { encodeControlMessage, encodePcmFrame } from "./pluginProtocol";
import {
  getDawBridge,
  isDawBridgeRetained,
  releaseDawBridge,
  resetDawBridgeSession,
  retainDawBridge,
} from "./dawBridgeSession";

class MockSocket implements WebSocketLike {
  binaryType = "arraybuffer";
  onopen: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;
  onclose: ((ev?: unknown) => void) | null = null;
  sent: Array<string | ArrayBuffer> = [];
  send(data: string | ArrayBuffer) {
    this.sent.push(data);
  }
  close() {
    this.onclose?.();
  }
  open() {
    this.onopen?.();
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}

describe("dawBridge client protocol", () => {
  afterEach(() => {
    resetDawBridgeSession();
  });

  it("initializes disconnected with no invented meter", () => {
    const client = createDawBridgeClient();
    expect(client.status).toBe("disconnected");
    expect(client.info).toBeNull();
    expect(client.meter).toBeNull();
    expect(client.getMediaStream()).toBeNull();
  });

  it("connects, applies hello + meter, and replies to ping", async () => {
    const sock = new MockSocket();
    const statuses: string[] = [];
    const client = createDawBridgeClient({
      webSocketFactory: () => sock,
      connectTimeoutMs: 50,
      onStatusChange: (s) => statuses.push(s),
    });

    const pending = client.connect();
    sock.open();
    await expect(pending).resolves.toBe(true);
    expect(client.status).toBe("connected");

    sock.emit(
      encodeControlMessage({
        type: "hello",
        info: {
          dawName: "Reaper",
          pluginFormat: "clap",
          sampleRate: 48000,
          channels: 2,
          bufferSize: 128,
          latencyMs: 2.6,
        },
      }),
    );
    expect(client.info?.dawName).toBe("Reaper");
    expect(client.info?.pluginFormat).toBe("clap");

    sock.emit(
      encodeControlMessage({
        type: "meter",
        meter: { peakL: 0.5, peakR: 0.4, rmsL: 0.2, rmsR: 0.2, lufsIntegrated: -16, truePeak: -1.1 },
      }),
    );
    expect(client.meter?.lufsIntegrated).toBe(-16);

    sock.emit(encodeControlMessage({ type: "ping" }));
    expect(sock.sent).toContain(encodeControlMessage({ type: "pong" }));

    client.sendTelemetry(3, null);
    expect(sock.sent).toContain(encodeControlMessage({ type: "telemetry", listeners: 3, sparksCount: null }));

    client.disconnect();
    expect(client.status).toBe("disconnected");
    expect(client.info).toBeNull();
    expect(statuses).toContain("connecting");
    expect(statuses).toContain("connected");
    expect(statuses).toContain("disconnected");
  });

  it("marks streaming when a framed PCM block arrives", async () => {
    const sock = new MockSocket();
    const client = createDawBridgeClient({
      webSocketFactory: () => sock,
      connectTimeoutMs: 50,
    });
    const pending = client.connect();
    sock.open();
    await pending;

    const pcm = encodePcmFrame({
      channels: 2,
      sampleRate: 48000,
      frameCount: 2,
      samples: new Float32Array([0, 0, 0, 0]),
    });
    sock.emit(pcm);
    expect(client.status).toBe("streaming");
  });

  it("times out a plug-in that never answers", async () => {
    const sock = new MockSocket();
    const client = createDawBridgeClient({
      webSocketFactory: () => sock,
      connectTimeoutMs: 20,
    });
    await expect(client.connect()).resolves.toBe(false);
    expect(client.status).toBe("disconnected");
  });

  it("retains a single process-wide client across sheet unmount", () => {
    const a = getDawBridge();
    retainDawBridge();
    expect(isDawBridgeRetained()).toBe(true);
    expect(getDawBridge()).toBe(a);
    releaseDawBridge();
    expect(isDawBridgeRetained()).toBe(false);
    expect(getDawBridge()).not.toBe(a);
  });
});
