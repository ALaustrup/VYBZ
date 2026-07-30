/**
 * Phase 18 — prepaid AI mastering seconds ledger (local memory + optional Supabase).
 * Purchase grants +seconds; jobs debit −seconds. Hard-stop when available ≤ 0.
 */

import { AI_MASTERING_USD_PER_SECOND } from "@vybz/processing/mastering";

/** Default Stripe pack: 100 minutes / $10 → 6000 seconds. */
export const AI_MINUTE_PACK_SECONDS = 6000;
export const AI_MINUTE_PACK_CENTS = 1000;
export const AI_MINUTE_PACK_ID = "minutes_100";

/** Show low-balance banner on Master page below this prepaid balance. */
export const AI_LOW_BALANCE_SECONDS = 120;

export type AiCreditLedgerRow = {
  id: string;
  user_id: string | null;
  delta_seconds: number;
  usd: number;
  reason: string;
  created_at: string;
  meta?: Record<string, unknown>;
};

export type AiCreditStore = {
  list(): Promise<AiCreditLedgerRow[]>;
  insert(
    row: Omit<AiCreditLedgerRow, "id" | "created_at"> & {
      id?: string;
      created_at?: string;
    }
  ): Promise<AiCreditLedgerRow>;
};

function memoryStore(): AiCreditStore {
  let rows: AiCreditLedgerRow[] = [];
  return {
    async list() {
      return rows.map((r) => ({ ...r }));
    },
    async insert(input) {
      const row: AiCreditLedgerRow = {
        id: input.id ?? crypto.randomUUID(),
        user_id: input.user_id,
        delta_seconds: input.delta_seconds,
        usd: input.usd,
        reason: input.reason,
        created_at: input.created_at ?? new Date().toISOString(),
        meta: input.meta,
      };
      rows = [row, ...rows];
      return { ...row };
    },
  };
}

let store: AiCreditStore = memoryStore();

export function setAiCreditStore(next: AiCreditStore): void {
  store = next;
}

export function resetAiCreditStore(): void {
  store = memoryStore();
}

export function getAiCreditStore(): AiCreditStore {
  return store;
}

export async function getAiCreditBalance(userId?: string | null): Promise<number> {
  const rows = await store.list();
  let sum = 0;
  for (const r of rows) {
    if (userId && r.user_id && r.user_id !== userId) continue;
    sum += r.delta_seconds;
  }
  return sum;
}

export async function listAiCreditLedger(limit = 50): Promise<AiCreditLedgerRow[]> {
  const rows = await store.list();
  return rows.slice(0, limit);
}

/** Simulate / apply a purchase credit (unit tests + local fulfill stub). */
export async function creditAiSeconds(
  seconds: number,
  opts?: {
    userId?: string | null;
    usd?: number;
    reason?: string;
    meta?: Record<string, unknown>;
  }
): Promise<AiCreditLedgerRow> {
  const secs = Math.max(0, seconds);
  if (secs <= 0) throw new Error("seconds must be positive");
  return store.insert({
    user_id: opts?.userId ?? null,
    delta_seconds: secs,
    usd: opts?.usd ?? (secs / AI_MINUTE_PACK_SECONDS) * (AI_MINUTE_PACK_CENTS / 100),
    reason: opts?.reason ?? "purchase",
    meta: opts?.meta,
  });
}

/**
 * Debit prepaid seconds after an AI job. Throws when balance insufficient
 * (hard-stop path for paid minutes).
 */
export async function debitAICredits(
  seconds: number,
  opts?: {
    userId?: string | null;
    usd?: number;
    reason?: string;
    meta?: Record<string, unknown>;
  }
): Promise<AiCreditLedgerRow> {
  const secs = Math.max(0, seconds);
  if (secs <= 0) throw new Error("seconds must be positive");
  const bal = await getAiCreditBalance(opts?.userId);
  if (bal < secs) {
    throw new Error("AI credits exhausted (balance ≤ 0) — top up at /settings/credits");
  }
  const usd = opts?.usd ?? secs * AI_MASTERING_USD_PER_SECOND;
  return store.insert({
    user_id: opts?.userId ?? null,
    delta_seconds: -secs,
    usd,
    reason: opts?.reason ?? "ai_mastering",
    meta: opts?.meta,
  });
}

/** Convert processing seconds to billable AI minutes (ceil). */
export function secondsToAiMinutes(seconds: number): number {
  return Math.ceil(Math.max(0, seconds) / 60);
}
