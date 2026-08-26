import { describe, expect, it } from "vitest";
import { PlatformError } from "@/platform/bridge/errors";
import { requestLocalGenerate } from "./localWorker";

describe("local generate worker client", () => {
  it("refuses an empty prompt without calling the worker", async () => {
    await expect(
      requestLocalGenerate({ prompt: "   ", durationSec: 15 }, async () => {
        throw new Error("should not fetch");
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("maps a refused connection to unavailable", async () => {
    await expect(
      requestLocalGenerate({ prompt: "pad", durationSec: 8 }, async () => {
        throw new TypeError("Failed to fetch");
      }),
    ).rejects.toBeInstanceOf(PlatformError);
  });

  it("returns a wav file from a 200 body", async () => {
    const bytes = new Uint8Array([82, 73, 70, 70]);
    const result = await requestLocalGenerate({ prompt: "pad", durationSec: 8, seed: 9 }, async () => {
      return new Response(bytes, { status: 200, headers: { "Content-Type": "audio/wav" } });
    });
    expect(result.model).toBe("small-music");
    expect(result.seed).toBe(9);
    expect(result.file.mimeType).toBe("audio/wav");
    expect(result.file.blob).toBeTruthy();
    expect(result.file.sizeBytes).toBe(4);
  });
});
