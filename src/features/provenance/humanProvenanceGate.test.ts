/**
 * Session provenance gate — decision 0006.
 * Proves a live session was hosted. Refuses a not-AI claim.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GATE_REGISTRY,
  HUMAN_PROVENANCE,
  LIVE_MIX_STREAMING,
  PROVENANCE_EVENT_TYPES,
} from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("human / session provenance", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("humanProvenance");
  });

  it("binds to public live mix and refuses a not-AI claim", () => {
    expect(HUMAN_PROVENANCE.bindsToPublicLiveSession).toBe(true);
    expect(HUMAN_PROVENANCE.fullStrengthRequiresAtcBurn).toBe(true);
    expect(HUMAN_PROVENANCE.serverHoldsSigningMaterial).toBe(true);
    expect(HUMAN_PROVENANCE.clientSignalsAreDeclared).toBe(true);
    expect(HUMAN_PROVENANCE.refusesNotAiClaim).toBe(true);
    expect(HUMAN_PROVENANCE.doesNotReplaceForensicWatermark).toBe(true);
    expect(LIVE_MIX_STREAMING.sessionProvenanceAvailable).toBe(true);
    expect(PROVENANCE_EVENT_TYPES).toContain("atc_burn");
  });

  it("writes the refusal into PRODUCT", () => {
    const product = read("PRODUCT.md");
    expect(product).toContain("Version 5");
    expect(product).toContain("0006");
    expect(product).toContain("does not prove the music was not AI-generated");
    expect(product).toContain("No “not AI” proof");
  });

  it("keeps the ledger off Stripe and off Living Mix / 1:1 calls", () => {
    const sql = read("supabase/migrations/20260817_0106_session_provenance.sql");
    expect(sql).toContain("create table if not exists public.provenance_sessions");
    expect(sql).toContain("create table if not exists public.provenance_events");
    expect(sql).toContain("references public.live_sessions");
    expect(sql).toContain("references public.airtime_ledger");
    expect(sql).toContain("host_consume");
    expect(sql).toContain("'full'");
    expect(sql).toContain("'thin'");
    expect(sql).toContain("Not measured");
    expect(sql).not.toMatch(/stripe/i);
    expect(sql).not.toMatch(/livingMix|liveSession\.ts/i);
    expect(sql).toContain("revoke all on function public.open_provenance_session(uuid) from anon");
  });

  it("does not hook Go Live or host burn yet", () => {
    const api = read("src/lib/api.ts");
    expect(api).not.toMatch(/open_provenance_session|seal_provenance_session/);
    const hooks = read("src/features/airtime/AtcLiveHooks.ts");
    expect(hooks).not.toMatch(/provenance/);
  });
});
