import { buildZip, sha256Hex } from "@/features/distribution/packageZip";
import { NOT_MEASURED, type ProvenanceEventType, type ProvenanceStrength } from "@/product/invariants";

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
};

export function buildVprovManifest(row: SealedProvenance): VprovManifest {
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
  };
}

export function buildVerifyReport(row: SealedProvenance): string {
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
    "",
    "Declared signal events are client-observed flags, not studio capture.",
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
