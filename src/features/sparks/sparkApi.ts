import { supabase } from "@/lib/supabase";
import type { Spark, SparkOption } from "./sparkEngine";

/** Aggregate result for one spark. Counts only — never who answered. */
export type SparkReportRow = {
  id: string;
  positionSec: number;
  question: string;
  options: SparkOption[];
  counts: [number, number, number];
  noResponse: number;
  shown: number;
};

function client() {
  if (!supabase) throw new Error("backend disabled");
  return supabase;
}

/** Prompts on a track, visible to anyone allowed to see the drop. */
export async function listSparks(dropId: string): Promise<Spark[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("track_sparks")
    .select("id, position_sec, question, options")
    .eq("drop_id", dropId)
    .order("position_sec", { ascending: true });
  if (error || !data) return [];
  return data.flatMap((row) => {
    const options = row.options as SparkOption[] | null;
    if (!Array.isArray(options) || options.length !== 3) return [];
    return [
      {
        id: String(row.id),
        positionSec: Number(row.position_sec),
        question: String(row.question),
        options: options as Spark["options"],
      },
    ];
  });
}

export type PlaceSparkResult = { ok: true; id: string } | { ok: false; reason: string };

export async function placeSpark(input: {
  dropId: string;
  positionSec: number;
  optionSetId: string;
  question: string;
  options: readonly SparkOption[];
}): Promise<PlaceSparkResult> {
  try {
    const { data, error } = await client().rpc("place_track_spark", {
      p_drop: input.dropId,
      p_position_sec: Math.round(input.positionSec),
      p_option_set_id: input.optionSetId,
      p_question: input.question,
      p_options: input.options,
    });
    if (error) return { ok: false, reason: error.message };
    const res = data as { ok?: boolean; reason?: string; id?: string } | null;
    if (!res?.ok || !res.id) return { ok: false, reason: res?.reason ?? "failed" };
    return { ok: true, id: res.id };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function removeSpark(sparkId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("track_sparks").delete().eq("id", sparkId);
  return !error;
}

/**
 * Record that a listener saw the prompt.
 *
 * This is what makes "no response" a measurement. Without it we could only infer
 * silence, and inferring is the thing we refuse to do.
 */
export async function markSparkShown(sparkId: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc("mark_spark_shown", { p_spark: sparkId });
}

export async function answerSpark(sparkId: string, optionIndex: number): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("answer_spark", {
    p_spark: sparkId,
    p_option: optionIndex,
  });
  return !error && data === true;
}

/** Owner-only aggregate. Returns [] for anyone else. */
export async function sparkReport(dropId: string): Promise<SparkReportRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("spark_report", { p_drop: dropId });
  if (error || !Array.isArray(data)) return [];
  return (data as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    positionSec: Number(r.positionSec ?? 0),
    question: String(r.question ?? ""),
    options: (r.options as SparkOption[]) ?? [],
    counts: [Number(r.count0 ?? 0), Number(r.count1 ?? 0), Number(r.count2 ?? 0)],
    noResponse: Number(r.noResponse ?? 0),
    shown: Number(r.shown ?? 0),
  }));
}
