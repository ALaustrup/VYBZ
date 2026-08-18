import { supabase } from "@/lib/supabase";
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
