import { buildZip, sha256Hex } from "@/features/distribution/packageZip";
import { NOT_MEASURED, type ProvenanceEventType, type ProvenanceStrength } from "@/product/invariants";
import {
  audioBindFromEvents,
  audioShaLabel,
  bindAudioSha,
  bindStoredAsset,
  c2paLedgerLabel,
  type AudioShaKind,
  type StoredAudioBind,
} from "./audioBind";

export type SealedProvenanceEvent = {
  seq: number;
  eventType: string;
  payload: Record<string, unknown>;
  prevHash: string;
  rowHash: string;
  createdAt: string;
};

export type SealedProvenance = {
  id: string;
  liveSessionId: string;
  hostId: string;
  status: string;
  strength: ProvenanceStrength | null;
  eventCount: number;
  chainRoot: string | null;
  atcBurned: number;
  openedAt: string;
  sealedAt: string | null;
  events: SealedProvenanceEvent[];
  storedAudio?: StoredAudioBind | null;
};

export type VprovManifest = {
  version: 1;
  format: "vybz.vprov";
  liveSessionId: string;
  hostId: string;
  openedAt: string;
  sealedAt: string | null;
  strength: ProvenanceStrength | null;
  atcBurned: number;
  eventCount: number;
  chainRoot: string | null;
  notAiClaim: typeof NOT_MEASURED;
  audioSha: string | null;
  audioShaKind: AudioShaKind | null;
  audioAssetId: string | null;
  audioLink: "declared" | null;
  c2paLedgerEvents: number | null;
};

export function resolveSessionAudio(row: SealedProvenance) {
  const declared = audioBindFromEvents(row.events);
  const stored = row.storedAudio ?? bindStoredAsset({});
  const audio = bindAudioSha({
    measuredHex: stored.hex,
    declaredHex: declared.hex,
    declaredSource: declared.source === "daw_pcm_client" ? "daw_pcm_client" : null,
    declaredBytesHashed: declared.bytesHashed,
  });
  return { audio, stored };
}

export function buildVprovManifest(row: SealedProvenance): VprovManifest {
  const { audio, stored } = resolveSessionAudio(row);
  return {
    version: 1,
    format: "vybz.vprov",
    liveSessionId: row.liveSessionId,
    hostId: row.hostId,
    openedAt: row.openedAt,
    sealedAt: row.sealedAt,
    strength: row.strength,
    atcBurned: row.atcBurned,
    eventCount: row.eventCount,
    chainRoot: row.chainRoot,
    notAiClaim: NOT_MEASURED,
    audioSha: audio.hex,
    audioShaKind: audio.kind,
    audioAssetId: stored.assetId,
    audioLink: stored.linkKind,
    c2paLedgerEvents: stored.c2paLedgerEvents,
  };
}

export function buildVerifyReport(row: SealedProvenance): string {
  const { audio, stored } = resolveSessionAudio(row);
  const lines = [
    "VYBZ session provenance",
    "",
    "This file records what was measured about a public live mix session.",
    "It does not claim the music was human-composed or not AI-generated.",
    "",
    `Live session: ${row.liveSessionId}`,
    `Host: ${row.hostId}`,
    `Opened: ${row.openedAt}`,
    `Sealed: ${row.sealedAt ?? NOT_MEASURED}`,
    `Strength: ${row.strength ?? NOT_MEASURED}`,
    `ATC burned: ${row.atcBurned} seconds (measured from host_consume)`,
    `Events: ${row.eventCount}`,
    `Chain root: ${row.chainRoot ?? NOT_MEASURED}`,
    `Not AI: ${NOT_MEASURED}`,
    `Audio SHA: ${audioShaLabel(audio)}`,
    `Audio link to session: ${stored.linkKind ?? NOT_MEASURED}`,
    `C2PA: ${c2paLedgerLabel(stored.c2paLedgerEvents)}`,
    "",
    "Declared signal events are client-observed flags, not studio capture.",
    "A client DAW PCM digest is declared. A measured SHA requires stored bytes.",
    "Binding a catalog file to this live session is declared, even when the SHA is measured.",
    "C2PA ledger events are counted. The file C2PA box is not parsed. The C2PA worker is not replaced.",
    "Full strength means this session burned Airtime. Thin means it did not.",
  ];
  return lines.join("\n");
}

export function eventsJsonl(events: SealedProvenanceEvent[]): string {
  return events
    .map((e) =>
      JSON.stringify({
        seq: e.seq,
        eventType: e.eventType as ProvenanceEventType | string,
        payload: e.payload,
        prevHash: e.prevHash,
        rowHash: e.rowHash,
        createdAt: e.createdAt,
      }),
    )
    .join("\n");
}

export async function buildVprovZip(row: SealedProvenance): Promise<{
  bytes: Uint8Array;
  manifest: VprovManifest;
  zipSha256: string;
}> {
  const manifest = buildVprovManifest(row);
  const enc = new TextEncoder();
  const bytes = buildZip([
    { path: "manifest.json", bytes: enc.encode(`${JSON.stringify(manifest, null, 2)}\n`) },
    { path: "events.jsonl", bytes: enc.encode(`${eventsJsonl(row.events)}\n`) },
    { path: "verify.txt", bytes: enc.encode(`${buildVerifyReport(row)}\n`) },
  ]);
  return { bytes, manifest, zipSha256: await sha256Hex(bytes) };
}
