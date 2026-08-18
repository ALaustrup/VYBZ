import { createSha256, type IncrementalSha256 } from "./sha256Incremental";

type Digest = { hex: string; bytesHashed: number };

let hasher: IncrementalSha256 | null = null;
let bytesHashed = 0;

export function startDeclaredPcmHash(): void {
  hasher = createSha256();
  bytesHashed = 0;
}

export function pushDeclaredPcm(bytes: Uint8Array): void {
  if (!hasher || bytes.byteLength < 1) return;
  hasher.update(bytes);
  bytesHashed += bytes.byteLength;
}

export function finishDeclaredPcmHash(): Digest | null {
  if (!hasher || bytesHashed < 1) {
    hasher = null;
    bytesHashed = 0;
    return null;
  }
  const hex = hasher.hex();
  const n = bytesHashed;
  hasher = null;
  bytesHashed = 0;
  return { hex, bytesHashed: n };
}

export function peekDeclaredPcmBytes(): number {
  return bytesHashed;
}

/** Tests only. */
export function resetDeclaredPcmHash(): void {
  hasher = null;
  bytesHashed = 0;
}
