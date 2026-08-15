import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { getSnapshot, seek } from "@/lib/audioBus";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import {
  SPARK_OPTION_SETS,
  MAX_SPARKS_PER_TRACK,
  placementRejectionMessage,
  rejectPlacement,
  suggestedPositions,
  type Spark,
} from "./sparkEngine";
import { listSparks, placeSpark, removeSpark, sparkReport, type SparkReportRow } from "./sparkApi";

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, "0")}`;
}

/**
 * The artist's side: place prompts at the moments you are unsure about, and read
 * what came back.
 *
 * Reported figures are counts of recorded answers. Nothing is inferred — a
 * listener who let the prompt burst is reported as "no response", because we do
 * not know whether they were bored or absorbed.
 */
export function SparkDesk({
  dropId,
  durationSec,
  peaks,
}: {
  dropId: string;
  durationSec?: number | null;
  peaks?: number[] | null;
}) {
  const { showToast } = useSession();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [report, setReport] = useState<SparkReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [setId, setSetId] = useState(SPARK_OPTION_SETS[0]!.id);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, rep] = await Promise.all([listSparks(dropId), sparkReport(dropId)]);
    setSparks(list);
    setReport(rep);
    setLoading(false);
  }, [dropId]);

  useEffect(() => {
    void load();
  }, [load]);

  const suggestions = useMemo(
    () => suggestedPositions({ peaks, durationSec, limit: 3 }),
    [peaks, durationSec],
  );

  async function place(atSec: number) {
    const set = SPARK_OPTION_SETS.find((s) => s.id === setId) ?? SPARK_OPTION_SETS[0]!;
    const rejection = rejectPlacement({
      existing: sparks,
      positionSec: atSec,
      durationSec,
      options: set.options,
    });
    if (rejection) {
      setError(placementRejectionMessage(rejection));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await placeSpark({
      dropId,
      positionSec: atSec,
      optionSetId: set.id,
      question: set.question,
      options: set.options,
    });
    setBusy(false);
    if (!res.ok) {
      setError(
        res.reason === "not_owner"
          ? "Only the owner can place sparks on this track."
          : `Could not place that spark (${res.reason}).`,
      );
      return;
    }
    showToast(`Spark placed at ${fmt(atSec)}`);
    await load();
  }

  async function drop(id: string) {
    setBusy(true);
    const ok = await removeSpark(id);
    setBusy(false);
    if (!ok) {
      setError("Could not remove that spark.");
      return;
    }
    await load();
  }

  const atCapacity = sparks.length >= MAX_SPARKS_PER_TRACK;

  return (
    <section className="forge-glass relative !rounded-2xl p-4" data-testid="spark-desk">
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <div className="relative z-[1]">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
          <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--accent-rgb))]" aria-hidden />
          Sparks · {sparks.length} of {MAX_SPARKS_PER_TRACK}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/50">
          Ask listeners about the moments you are unsure about. The prompt appears just
          after the moment, so it never sits on top of the part you are asking about.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--accent-rgb))]" />
          </div>
        ) : (
          <>
            <label className="mt-3 block">
              <span className="text-[11px] uppercase tracking-wider text-white/40">Question</span>
              <select
                value={setId}
                onChange={(e) => setSetId(e.target.value)}
                data-testid="spark-question-select"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-veil-400/60 focus:outline-none"
              >
                {SPARK_OPTION_SETS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-ink-950">
                    {s.question}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {(SPARK_OPTION_SETS.find((s) => s.id === setId) ?? SPARK_OPTION_SETS[0]!).options.map(
                (o) => (
                  <span
                    key={o.label}
                    className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/60"
                  >
                    {o.emoji} {o.label}
                  </span>
                ),
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || atCapacity}
                onClick={() => void place(getSnapshot().currentTime)}
                data-testid="spark-place-here"
                className="forge-cta !min-h-9 !px-3 !text-xs disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden /> Place at playhead
              </button>
              {suggestions.map((s) => (
                <button
                  key={s.because}
                  type="button"
                  disabled={busy || atCapacity}
                  onClick={() => void place(s.positionSec)}
                  className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:text-white active:scale-95 disabled:opacity-40"
                  title={`Measured: ${s.because}`}
                >
                  {fmt(s.positionSec)} · {s.because}
                </button>
              ))}
            </div>

            {atCapacity ? (
              <p className="mt-2 text-[11px] text-white/40">
                At capacity. Remove one to place another.
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 text-[12px] font-medium text-wild" role="alert">
                {error}
              </p>
            ) : null}

            {report.length > 0 ? (
              <ul className="mt-4 space-y-2" data-testid="spark-report">
                {report.map((r) => {
                  const answers = r.counts[0] + r.counts[1] + r.counts[2];
                  return (
                    <li key={r.id} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => seek(r.positionSec)}
                          className="font-mono text-[11px] text-[rgb(var(--accent-rgb))] hover:underline"
                        >
                          {fmt(r.positionSec)}
                        </button>
                        <p className="min-w-0 flex-1 truncate text-[13px] text-white/85">
                          {r.question}
                        </p>
                        <button
                          type="button"
                          onClick={() => void drop(r.id)}
                          disabled={busy}
                          aria-label="Remove spark"
                          className="text-white/35 hover:text-wild disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {r.shown === 0 ? (
                        <p className="mt-1 text-[11px] text-white/35">Not shown to anyone yet.</p>
                      ) : (
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                          {r.options.map((o, i) => (
                            <span key={o.label} className={cx(r.counts[i] === 0 && "text-white/30")}>
                              {o.emoji} {o.label}{" "}
                              <span className="font-mono text-white/70">{r.counts[i]}</span>
                            </span>
                          ))}
                          <span className="text-white/40">
                            no response <span className="font-mono">{r.noResponse}</span>
                          </span>
                          <span className="text-white/30">
                            {answers} of {r.shown} answered
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : sparks.length === 0 ? (
              <p className="mt-3 text-[12px] text-white/40">
                No sparks yet. Place one at a moment you are unsure about.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
