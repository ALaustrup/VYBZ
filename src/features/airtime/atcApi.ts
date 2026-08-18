import { supabase } from "@/lib/supabase";
import { recordAtcBurnEvent } from "@/features/provenance/provenanceApi";
import type { AtcBalances } from "./atcAccounting";

export type AtcBalanceResponse = AtcBalances & {
  ok: boolean;
  total: number;
  error?: string;
  minimum?: number;
};

function asBalances(r: Record<string, unknown> | null): AtcBalanceResponse {
  const daily = Number(r?.daily_free_remaining ?? 0);
  const earned = Number(r?.earned_balance ?? 0);
  return {
    ok: r?.ok === true,
    dailyFreeRemaining: Number.isFinite(daily) ? daily : 0,
    earnedBalance: Number.isFinite(earned) ? earned : 0,
    total: Number(r?.total ?? daily + earned) || 0,
    error: typeof r?.error === "string" ? r.error : undefined,
    minimum: typeof r?.minimum === "number" ? r.minimum : undefined,
  };
}

export async function fetchAtcBalance(): Promise<AtcBalanceResponse | null> {
  if (!supabase) return null;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, error } = await supabase.rpc("get_airtime_balance", { p_timezone: tz });
  if (error || !data) return null;
  return asBalances(data as Record<string, unknown>);
}

export async function canStartLive(): Promise<AtcBalanceResponse | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("can_start_live");
  if (error || !data) return null;
  return asBalances(data as Record<string, unknown>);
}

export async function consumeHostAirtime(
  sessionId: string,
  seconds: number,
): Promise<AtcBalanceResponse | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("consume_airtime", {
    p_session: sessionId,
    p_seconds: seconds,
  });
  if (error || !data) return null;
  const balances = asBalances(data as Record<string, unknown>);
  if (balances.ok) {
    void recordAtcBurnEvent(sessionId, seconds).catch(() => false);
  }
  return balances;
}

export type ListenHeartbeatResult = {
  ok: boolean;
  awarded: number;
  creditedSeconds: number;
  error?: string;
};

export async function reportListenHeartbeat(
  sessionId: string,
  focused: boolean,
  playing: boolean,
): Promise<ListenHeartbeatResult | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("report_listen_heartbeat", {
    p_session: sessionId,
    p_focused: focused,
    p_playing: playing,
  });
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    ok: r.ok === true,
    awarded: Number(r.atc_awarded ?? 0) || 0,
    creditedSeconds: Number(r.credited_seconds ?? 0) || 0,
    error: typeof r.error === "string" ? r.error : undefined,
  };
}

export type AtcAbuseRow = {
  listenerId: string;
  events24h: number;
  atc24h: number;
  hosts24h: number;
  rateLimited: boolean;
};

export async function fetchAtcAbuseReview(): Promise<AtcAbuseRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("atc_abuse_review", { p_limit: 20 });
  if (error || !data) return null;
  const r = data as { ok?: boolean; rows?: Record<string, unknown>[] };
  if (r.ok !== true || !Array.isArray(r.rows)) return null;
  return r.rows.map((row) => ({
    listenerId: String(row.listener_id ?? ""),
    events24h: Number(row.events_24h ?? 0),
    atc24h: Number(row.atc_24h ?? 0),
    hosts24h: Number(row.hosts_24h ?? 0),
    rateLimited: row.rate_limited === true,
  }));
}
