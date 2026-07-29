import { describe, expect, it, vi } from "vitest";
import { createMemoryUploadStore, createUploadQueue } from "./uploadQueue";

describe("upload queue", () => {
  it("retries failed uploads then succeeds", async () => {
    let attempts = 0;
    const uploader = vi.fn(async (_item, onProgress: (n: number) => void) => {
      attempts += 1;
      onProgress(0.5);
      if (attempts < 2) throw new Error("network");
      onProgress(1);
    });
    const q = createUploadQueue({ store: createMemoryUploadStore(), uploader, maxAttempts: 3 });
    await q.enqueue({ fileName: "a.wav", sizeBytes: 10, mimeType: "audio/wav" });
    const afterFail = await q.tick();
    expect(afterFail[0]!.status).toBe("failed");
    expect(afterFail[0]!.attempts).toBe(1);

    // drain handles retry
    const done = await q.drain();
    expect(done[0]!.status).toBe("succeeded");
    expect(uploader.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("tracks progress callbacks", async () => {
    const q = createUploadQueue({
      uploader: async (_item, onProgress) => {
        onProgress(0.25);
        onProgress(1);
      },
    });
    await q.enqueue({ fileName: "b.wav", sizeBytes: 1, mimeType: "audio/wav" });
    const items = await q.tick();
    expect(items[0]!.status).toBe("succeeded");
    expect(items[0]!.progress).toBe(1);
  });
});
