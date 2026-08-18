import { supabase } from "@/lib/supabase";
import type { ProvenanceStrength } from "@/product/invariants";
import { buildVprovZip, type SealedProvenance } from "./buildVprov";
import type { DeclaredHostSignals } from "./hostSignals";

const byLive = new Map<string, string>();

export type ProvenanceOpenResult = {
  ok: boolean;
  id?: string;
  status?: string;
  error?: string;
};

function asOpen(r: Record<string, unknown> | null): ProvenanceOpenResult {
  if (!r) return { ok: false };
  return {
    ok: r.ok === true,
    id: typeof r.id === "string" ? r.id : undefined,
    status: typeof r.status === "string" ? r.status : undefined,
    error: typeof r.error === "string" ? r.error : undefined,
  };
}

export async function openProvenanceForLive(liveSessionId: string): Promise<ProvenanceOpenResult> {
  if (!supabase) return { ok: false, error: "unavailable" };
  const { data, error } = await supabase.rpc("open_provenance_session", { p_live: liveSessionId });
  if (error || !data) return { ok: false, error: error?.message ?? "open_failed" };
  const opened = asOpen(data as Record<string, unknown>);
  if (opened.ok && opened.id) byLive.set(liveSessionId, opened.id);
  return opened;
}

export async function recordAtcBurnEvent(liveSessionId: string, seconds: number): Promise<boolean> {
  if (!supabase) return false;
  let pid = byLive.get(liveSessionId);
  if (!pid) {
    const opened = await openProvenanceForLive(liveSessionId);
    pid = opened.id;
  }
  if (!pid) return false;
  const { data, error } = await supabase.rpc("append_provenance_event", {
    p_session: pid,
    p_type: "atc_burn",
    p_payload: { seconds },
    p_ledger: null,
  });
  if (error || !data) return false;
  return (data as { ok?: boolean }).ok === true;
}

export async function recordDeclaredSignals(
  liveSessionId: string,
  signals: DeclaredHostSignals,
): Promise<boolean> {
  if (!supabase) return false;
  let pid = byLive.get(liveSessionId);
  if (!pid) {
    const opened = await openProvenanceForLive(liveSessionId);
    pid = opened.id;
  }
  if (!pid) return false;
  const { data, error } = await supabase.rpc("append_provenance_event", {
    p_session: pid,
    p_type: "signal",
    p_payload: signals,
    p_ledger: null,
  });
  if (error || !data) return false;
  return (data as { ok?: boolean }).ok === true;
}

export async function recordDeclaredAudioSha(
  liveSessionId: string,
  hex: string,
  bytesHashed: number,
): Promise<boolean> {
  if (!supabase) return false;
  let pid = byLive.get(liveSessionId);
  if (!pid) {
    const opened = await openProvenanceForLive(liveSessionId);
    pid = opened.id;
  }
  if (!pid) return false;
  const { data, error } = await supabase.rpc("append_provenance_event", {
    p_session: pid,
    p_type: "signal",
    p_payload: {
      kind: "declared",
      audioSha: hex,
      source: "daw_pcm_client",
      bytesHashed,
      alg: "sha256",
    },
    p_ledger: null,
  });
  if (error || !data) return false;
  return (data as { ok?: boolean }).ok === true;
}

export async function sealProvenanceForLive(liveSessionId: string): Promise<boolean> {
  if (!supabase) return false;
  let pid = byLive.get(liveSessionId);
  if (!pid) {
    const { data } = await supabase
      .from("provenance_sessions")
      .select("id")
      .eq("live_session_id", liveSessionId)
      .maybeSingle();
    pid = data?.id ?? undefined;
  }
  if (!pid) return false;
  const { data, error } = await supabase.rpc("seal_provenance_session", { p_session: pid });
  byLive.delete(liveSessionId);
  if (error || !data) return false;
  return (data as { ok?: boolean }).ok === true;
}

export async function fetchSealedProvenance(liveSessionId: string): Promise<SealedProvenance | null> {
  if (!supabase) return null;
  const { data: row, error } = await supabase
    .from("provenance_sessions")
    .select("id, live_session_id, host_id, status, strength, event_count, chain_root, atc_burned, opened_at, sealed_at")
    .eq("live_session_id", liveSessionId)
    .eq("status", "sealed")
    .maybeSingle();
  if (error || !row) return null;
  const { data: evs } = await supabase
    .from("provenance_events")
    .select("seq, event_type, payload, prev_hash, row_hash, created_at")
    .eq("session_id", row.id)
    .order("seq", { ascending: true });
  return {
    id: row.id,
    liveSessionId: row.live_session_id,
    hostId: row.host_id,
    status: row.status,
    strength: (row.strength as ProvenanceStrength | null) ?? null,
    eventCount: Number(row.event_count ?? 0),
    chainRoot: row.chain_root ?? null,
    atcBurned: Number(row.atc_burned ?? 0),
    openedAt: row.opened_at,
    sealedAt: row.sealed_at ?? null,
    events: (evs ?? []).map((e) => ({
      seq: Number(e.seq),
      eventType: String(e.event_type),
      payload: (e.payload ?? {}) as Record<string, unknown>,
      prevHash: String(e.prev_hash),
      rowHash: String(e.row_hash),
      createdAt: String(e.created_at),
    })),
  };
}

export async function downloadVprovPackage(liveSessionId: string): Promise<boolean> {
  const row = await fetchSealedProvenance(liveSessionId);
  if (!row) return false;
  const { bytes } = await buildVprovZip(row);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vybz-session-${liveSessionId.slice(0, 8)}.vprov`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
