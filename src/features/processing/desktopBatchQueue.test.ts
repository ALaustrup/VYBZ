import { describe, expect, it } from "vitest";
import { enqueueBatchItem, runPortableBatchItem } from "./desktopBatchQueue";

function makeSineWav(): ArrayBuffer {
  const sampleRate = 8000;
  const n = sampleRate;
  const dataSize = n * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < n; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  return buffer;
}

describe("desktop batch queue", () => {
  it("enqueues items", () => {
    const next = enqueueBatchItem(
      { items: [] },
      { id: "1", name: "a.wav", sizeBytes: 100 }
    );
    expect(next.items).toHaveLength(1);
    expect(next.items[0]!.status).toBe("queued");
  });

  it("native-compatible portable round-trip on golden WAV", () => {
    const buf = makeSineWav();
    const item = runPortableBatchItem(
      { id: "1", name: "sine.wav", sizeBytes: buf.byteLength, status: "queued" },
      buf
    );
    expect(item.status).toBe("succeeded");
    expect(item.result?.engine).toBe("portable");
    expect(item.result?.peaks.length).toBeGreaterThan(0);
    expect(item.result?.peakDbfs).toBeGreaterThan(-12);
  });
});
