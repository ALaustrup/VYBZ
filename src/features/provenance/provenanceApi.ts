import { supabase } from "@/lib/supabase";
import type { ProvenanceStrength } from "@/product/invariants";
import { bindStoredAsset, isSha256Hex, type StoredAudioBind } from "./audioBind";
import { buildVprovZip, type SealedProvenance } from "./buildVprov";
import type { DeclaredHostSignals } from "./hostSignals";
import type { WorkSessionLink } from "./workAttestation";

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
    .select("id, live_session_id, host_id, status, strength, event_count, chain_root, atc_burned, opened_at, sealed_at, manifest")
    .eq("live_session_id", liveSessionId)
    .eq("status", "sealed")
    .maybeSingle();
  if (error || !row) return null;
  const { data: evs } = await supabase
    .from("provenance_events")
    .select("seq, event_type, payload, prev_hash, row_hash, created_at")
    .eq("session_id", row.id)
    .order("seq", { ascending: true });
  const manifest = (row.manifest ?? {}) as Record<string, unknown>;
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
    storedAudio: bindStoredAsset({
      sha256: manifest.audio_sha,
      assetId: manifest.audio_asset_id,
      c2paLedgerEvents: manifest.c2pa_ledger_events,
    }),
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

export type HashedAsset = { id: string; title: string | null; sha256: string };

export async function listHostHashedAssets(limit = 24): Promise<HashedAsset[]> {
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("assets")
    .select("id, title, sha256")
    .eq("owner_id", uid)
    .not("sha256", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.flatMap((r) => {
    const hex = typeof r.sha256 === "string" ? r.sha256.toLowerCase() : "";
    if (!isSha256Hex(hex)) return [];
    return [{ id: String(r.id), title: typeof r.title === "string" ? r.title : null, sha256: hex }];
  });
}

export async function bindSessionStoredAudio(
  liveSessionId: string,
  assetId: string,
): Promise<StoredAudioBind | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("bind_session_stored_audio", {
    p_live: liveSessionId,
    p_asset: assetId,
  });
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  if (r.ok !== true) return null;
  return bindStoredAsset({
    sha256: r.audio_sha,
    assetId: r.audio_asset_id,
    c2paLedgerEvents: r.c2pa_ledger_events,
  });
}

function asWorkLink(r: Record<string, unknown>): WorkSessionLink | null {
  const liveSessionId = typeof r.liveSessionId === "string" ? r.liveSessionId : null;
  if (!liveSessionId) return null;
  const strength = r.strength === "full" || r.strength === "thin" ? r.strength : null;
  return {
    liveSessionId,
    assetId: typeof r.assetId === "string" && r.assetId.length > 0 ? r.assetId : null,
    projectId: typeof r.projectId === "string" && r.projectId.length > 0 ? r.projectId : null,
    strength,
    sealedAt: typeof r.sealedAt === "string" ? r.sealedAt : null,
    atcBurned: Number(r.atcBurned ?? 0),
  };
}

function linksFromManifestRows(
  rows: Array<{ live_session_id: string; strength: string | null; sealed_at: string | null; atc_burned: number | null; manifest: unknown }>,
): WorkSessionLink[] {
  return rows.flatMap((row) => {
    const m = (row.manifest ?? {}) as Record<string, unknown>;
    const link = asWorkLink({
      liveSessionId: row.live_session_id,
      assetId: m.audio_asset_id,
      projectId: m.profile_project_id,
      strength: row.strength,
      sealedAt: row.sealed_at,
      atcBurned: row.atc_burned,
    });
    return link ? [link] : [];
  });
}

export async function listCreationSessionLinks(hostId: string): Promise<WorkSessionLink[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("creation_session_links", { p_host: hostId });
  if (!error && Array.isArray(data)) {
    return data.flatMap((row) => {
      const link = asWorkLink((row ?? {}) as Record<string, unknown>);
      return link ? [link] : [];
    });
  }
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.id !== hostId) return [];
  const { data: rows } = await supabase
    .from("provenance_sessions")
    .select("live_session_id, strength, sealed_at, atc_burned, manifest")
    .eq("host_id", hostId)
    .eq("status", "sealed")
    .order("sealed_at", { ascending: false });
  return linksFromManifestRows(rows ?? []);
}

export async function associateSessionWork(
  liveSessionId: string,
  input: { assetId?: string | null; projectId?: string | null },
): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("associate_session_work", {
    p_live: liveSessionId,
    p_asset: input.assetId ?? null,
    p_project: input.projectId ?? null,
  });
  if (!error && data && (data as { ok?: boolean }).ok === true) return true;
  if (input.assetId) {
    const bound = await bindSessionStoredAudio(liveSessionId, input.assetId);
    return Boolean(bound?.hex);
  }
  return false;
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
