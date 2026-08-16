/**
 * Guarded, off-thread file hashing.
 *
 * A drop must never be lost because a hash was slow. Every failure path here —
 * an oversized file, a missing Worker, a thrown digest, a hash that simply does
 * not come back — resolves `undefined`, which callers store as an absent
 * `sha256`. An absent hash is honest; a hung upload is not.
 */
import { sha256Hex } from "@/lib/waveform";
import type { Sha256WorkerRequest, Sha256WorkerResponse } from "./sha256.worker";
import Sha256Worker from "./sha256.worker?worker";

/**
 * Above this the digest is skipped outright. `crypto.subtle` cannot stream, so
 * hashing means a second full copy of the file in memory, and provenance is not
 * worth an out-of-memory crash.
 */
export const HASH_MAX_BYTES = 512 * 1024 * 1024;

/** A hash that has not landed by now is treated as never landing. */
export const HASH_TIMEOUT_MS = 30_000;

/** Small enough that a main-thread digest is imperceptible when no Worker exists. */
const MAIN_THREAD_MAX_BYTES = 32 * 1024 * 1024;

/**
 * SHA-256 of a blob, or `undefined` when it could not be measured in time.
 * Never rejects.
 */
export async function hashBlobGuarded(
  blob: Blob,
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<string | undefined> {
  const maxBytes = opts?.maxBytes ?? HASH_MAX_BYTES;
  if (!blob || blob.size <= 0 || blob.size > maxBytes) return undefined;

  if (typeof Worker === "undefined") {
    if (blob.size > MAIN_THREAD_MAX_BYTES) return undefined;
    return sha256Hex(blob).catch(() => undefined);
  }

  let worker: Worker;
  try {
    worker = new Sha256Worker();
  } catch {
    return undefined;
  }

  const requestId =
    typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : String(Math.random());

  return new Promise<string | undefined>((resolve) => {
    let settled = false;
    const finish = (hex: string | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(hex);
    };
    // Terminating releases the buffer the stuck digest is holding.
    const timer = setTimeout(() => finish(undefined), opts?.timeoutMs ?? HASH_TIMEOUT_MS);

    worker.addEventListener("message", (ev: MessageEvent<Sha256WorkerResponse>) => {
      const data = ev.data;
      if (!data || data.requestId !== requestId) return;
      finish(data.ok ? data.hex : undefined);
    });
    worker.addEventListener("error", () => finish(undefined));

    const request: Sha256WorkerRequest = { type: "sha256", requestId, blob };
    try {
      worker.postMessage(request);
    } catch {
      finish(undefined);
    }
  });
}
