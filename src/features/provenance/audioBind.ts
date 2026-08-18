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

export type StoredAudioBind = {
  hex: string | null;
  assetId: string | null;
  linkKind: "declared" | null;
  c2paLedgerEvents: number | null;
};

/** SHA from assets.sha256 is measured. Linking that file to the live mix is declared. */
export function bindStoredAsset(input: {
  sha256?: unknown;
  assetId?: unknown;
  c2paLedgerEvents?: unknown;
}): StoredAudioBind {
  const hex = typeof input.sha256 === "string" ? input.sha256.toLowerCase() : null;
  const n = input.c2paLedgerEvents;
  return {
    hex: isSha256Hex(hex) ? hex : null,
    assetId: typeof input.assetId === "string" && input.assetId.length > 0 ? input.assetId : null,
    linkKind: isSha256Hex(hex) ? "declared" : null,
    c2paLedgerEvents: typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null,
  };
}

export function c2paLedgerLabel(count: number | null): string {
  if (count == null) return NOT_MEASURED;
  return `${count} ledger event${count === 1 ? "" : "s"} (file C2PA box: ${NOT_MEASURED})`;
}
