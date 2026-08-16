import { supabase } from "@/lib/supabase";

/**
 * What actually happened when people played a track.
 *
 * Every field is a count or a measured position. Anything unknown stays null so
 * the view can say "Not measured" instead of substituting a plausible number.
 */
export type ListenReport = {
  sessions: number;
  listeners: number;
  finished: number;
  /** Listeners who came back on a different day. */
  returning: number;
  medianReachedSec: number | null;
  maxReachedSec: number | null;
  /** Null when no session ever reported a track length. */
  durationSec: number | null;
};

export type DropoffBucket = { bucket: number; stopped: number };

export async function recordListen(input: {
  sessionId: string;
  dropId: string;
  reachedSec: number;
  durationSec?: number | null;
  completed?: boolean;
}): Promise<void> {
  if (!supabase) return;
  await supabase.rpc("record_listen", {
    p_session: input.sessionId,
    p_drop: input.dropId,
    p_reached_sec: Math.max(0, Math.round(input.reachedSec)),
    p_duration_sec:
      input.durationSec && Number.isFinite(input.durationSec) && input.durationSec > 0
        ? Math.round(input.durationSec)
        : null,
    p_completed: input.completed ?? false,
  });
}

/** Owner only. Returns null for anyone else, and for a track nobody has played. */
export async function listenReport(dropId: string): Promise<ListenReport | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("listen_report", { p_drop: dropId });
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  if (r.ok !== true) return null;
  const num = (v: unknown): number | null =>
    v === null || v === undefined ? null : Number(v);
  return {
    sessions: Number(r.sessions ?? 0),
    listeners: Number(r.listeners ?? 0),
    finished: Number(r.finished ?? 0),
    returning: Number(r.returning ?? 0),
    medianReachedSec: num(r.medianReachedSec),
    maxReachedSec: num(r.maxReachedSec),
    durationSec: num(r.durationSec),
  };
}

/** Catalogue-wide reception for the signed-in creator's own dashboard. */
export type ListenSummary = {
  listeners: number;
  finished: number;
  sessions: number;
  answers: number;
};

export async function myListenSummary(): Promise<ListenSummary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_listen_summary");
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    listeners: Number(r.listeners ?? 0),
    finished: Number(r.finished ?? 0),
    sessions: Number(r.sessions ?? 0),
    answers: Number(r.answers ?? 0),
  };
}

export async function listenDropoff(dropId: string, buckets = 10): Promise<DropoffBucket[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("listen_dropoff", {
    p_drop: dropId,
    p_buckets: buckets,
  });
  if (error || !Array.isArray(data)) return [];
  return (data as Array<Record<string, unknown>>).map((b) => ({
    bucket: Number(b.bucket ?? 0),
    stopped: Number(b.stopped ?? 0),
  }));
}
