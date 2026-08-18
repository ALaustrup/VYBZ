import { describe, expect, it } from "vitest";
import { PROVENANCE_EVENT_TYPES } from "@/product/invariants";
import {
  isProvenanceEventType,
  provenanceEventBody,
  provenanceStrength,
  PROVENANCE_GENESIS_HASH,
} from "./sessionProvenance";

describe("session provenance helpers", () => {
  it("is full only when measured ATC was burned", () => {
    expect(provenanceStrength(0)).toBe("thin");
    expect(provenanceStrength(30)).toBe("full");
    expect(provenanceStrength(-1)).toBe("thin");
    expect(provenanceStrength(1.5)).toBe("thin");
  });

  it("accepts only the declared event types", () => {
    expect(PROVENANCE_EVENT_TYPES).toEqual(["open", "atc_burn", "signal", "seal"]);
    expect(isProvenanceEventType("atc_burn")).toBe(true);
    expect(isProvenanceEventType("not_ai")).toBe(false);
  });

  it("builds a stable chain body from type, seq, payload, prev", () => {
    expect(PROVENANCE_GENESIS_HASH).toHaveLength(64);
    expect(
      provenanceEventBody({
        eventType: "open",
        seq: 1,
        payload: "{}",
        prevHash: PROVENANCE_GENESIS_HASH,
      }),
    ).toBe(`open|1|{}|${PROVENANCE_GENESIS_HASH}`);
  });
});
