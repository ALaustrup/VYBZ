/**
 * Session-provenance helpers. The database is the authority for the chain.
 * This module is the spec tests share with the SQL (strength + allowed types).
 */
import {
  PROVENANCE_EVENT_TYPES,
  type ProvenanceEventType,
  type ProvenanceStrength,
} from "@/product/invariants";

export function provenanceStrength(atcBurned: number): ProvenanceStrength {
  if (!Number.isInteger(atcBurned) || atcBurned < 0) return "thin";
  return atcBurned > 0 ? "full" : "thin";
}

export function isProvenanceEventType(value: string): value is ProvenanceEventType {
  return (PROVENANCE_EVENT_TYPES as readonly string[]).includes(value);
}

/** Hash payload for one chained event. Matches the SQL body shape. */
export function provenanceEventBody(input: {
  eventType: ProvenanceEventType;
  seq: number;
  payload: string;
  prevHash: string;
}): string {
  return `${input.eventType}|${input.seq}|${input.payload}|${input.prevHash}`;
}

export const PROVENANCE_GENESIS_HASH = "0".repeat(64);
