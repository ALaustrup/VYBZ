import { supabase } from "@/lib/supabase";
import type { LiveSource } from "@/types";
import type { ProvenanceStrength } from "@/product/invariants";
import { resolveLiveSource } from "@/features/broadcast/liveSource";

export type StageNight = {
  id: string;
  title: string | null;
  status: "live" | "ended" | string;
  source: LiveSource;
  intent: string | null;
  viewerCount: number;
  playbackHls: string | null;
  startedAt: number;
  endedAt: number | null;
  sealed: boolean;
  strength: ProvenanceStrength | null;
  atcBurned: number | null;
};

function asNight(r: Record<string, unknown>, sealedKnown: boolean): StageNight {
  const strength = r.strength === "full" || r.strength === "thin" ? r.strength : null;
  return {
    id: String(r.id),
    title: typeof r.title === "string" ? r.title : null,
    status: typeof r.status === "string" ? r.status : "ended",
    source: resolveLiveSource(r.source),
    intent: typeof r.intent === "string" ? r.intent : null,
    viewerCount: Number(r.viewer_count ?? 0),
    playbackHls: typeof r.playback_hls === "string" ? r.playback_hls : null,
    startedAt: r.started_at ? new Date(String(r.started_at)).getTime() : Date.now(),
    endedAt: r.ended_at ? new Date(String(r.ended_at)).getTime() : null,
    sealed: sealedKnown && r.sealed === true,
    strength: sealedKnown ? strength : null,
    atcBurned: !sealedKnown || r.atc_burned == null ? null : Number(r.atc_burned),
  };
}

export async function listHostStageNights(hostId: string, limit = 24): Promise<StageNight[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("list_host_stage_nights", {
      p_host: hostId,
      p_limit: limit,
    });
    if (!error && data) {
      const rows = Array.isArray(data) ? data : [];
      return rows.map((r: Record<string, unknown>) => asNight(r, true));
    }
    const { data: rows } = await supabase
      .from("live_sessions")
      .select("id, title, status, source, intent, viewer_count, playback_hls, started_at, ended_at, visibility")
      .eq("host_id", hostId)
      .order("started_at", { ascending: false })
      .limit(limit);
    return (rows ?? [])
      .filter((r) => {
        const vis = String(r.visibility ?? "world");
        return vis === "world" || vis === "public";
      })
      .map((r) => asNight(r as Record<string, unknown>, false));
  } catch {
    return [];
  }
}
