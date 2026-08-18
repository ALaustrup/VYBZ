import { NOT_MEASURED } from "@/product/invariants";
import type { SealedProvenanceEvent } from "./buildVprov";

export type AudioShaKind = "measured" | "declared";

export type AudioShaBind = {
  hex: string | null;
  kind: AudioShaKind | null;
  source: "asset" | "daw_pcm_client" | null;
  bytesHashed: number | null;
};

const SHA_RE = /^[a-f0-9]{64}$/;

export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && SHA_RE.test(value);
}

/** Measured wins only when it is a real 64-hex from stored bytes. Client hex stays declared. */
export function bindAudioSha(input: {
  measuredHex?: string | null;
  declaredHex?: string | null;
  declaredSource?: "daw_pcm_client" | null;
  declaredBytesHashed?: number | null;
}): AudioShaBind {
  if (isSha256Hex(input.measuredHex)) {
    return { hex: input.measuredHex, kind: "measured", source: "asset", bytesHashed: null };
  }
  if (isSha256Hex(input.declaredHex)) {
    const n = input.declaredBytesHashed;
    return {
      hex: input.declaredHex,
      kind: "declared",
      source: input.declaredSource ?? "daw_pcm_client",
      bytesHashed: typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null,
    };
  }
  return { hex: null, kind: null, source: null, bytesHashed: null };
}

export function audioShaLabel(bind: AudioShaBind): string {
  if (!bind.hex || !bind.kind) return NOT_MEASURED;
  if (bind.kind === "measured") return `${bind.hex} (measured from stored bytes)`;
  return `${bind.hex} (declared client DAW PCM)`;
}

export function audioBindFromEvents(events: SealedProvenanceEvent[]): AudioShaBind {
  let declared: AudioShaBind = { hex: null, kind: null, source: null, bytesHashed: null };
  for (const ev of events) {
    const p = ev.payload ?? {};
    if (p.kind !== "declared" || !isSha256Hex(p.audioSha)) continue;
    declared = bindAudioSha({
      declaredHex: p.audioSha,
      declaredSource: p.source === "daw_pcm_client" ? "daw_pcm_client" : null,
      declaredBytesHashed: typeof p.bytesHashed === "number" ? p.bytesHashed : null,
    });
  }
  return declared;
}
