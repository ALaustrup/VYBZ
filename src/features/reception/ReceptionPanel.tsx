import { useCallback, useEffect, useState } from "react";
import { Ear, Loader2 } from "lucide-react";
import { NOT_MEASURED } from "@/product/invariants";
import { seek } from "@/lib/audioBus";
import { sparkReport, type SparkReportRow } from "@/features/sparks/sparkApi";
import { listenDropoff, listenReport, type DropoffBucket, type ListenReport } from "./listenApi";

function fmt(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec) || sec < 0) return NOT_MEASURED;
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, "0")}`;
}

/**
 * What actually happened to a track.
 *
 * Every figure here is counted or measured. Where something is unknown it reads
 * "Not measured" rather than a plausible substitute — which is the only reason
 * the numbers that are here can be believed.
 */
export function ReceptionPanel({ dropId }: { dropId: string }) {
  const [report, setReport] = useState<ListenReport | null>(null);
  const [dropoff, setDropoff] = useState<DropoffBucket[]>([]);
  const [sparks, setSparks] = useState<SparkReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, d, s] = await Promise.all([
      listenReport(dropId),
      listenDropoff(dropId),
      sparkReport(dropId),
    ]);
    setReport(r);
    setDropoff(d);
    setSparks(s);
    setLoading(false);
  }, [dropId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--accent-rgb))]" />
      </div>
    );
  }

  const nothingYet = !report || report.sessions === 0;
  const peak = Math.max(1, ...dropoff.map((b) => b.stopped));

  return (
    <div className="space-y-4" data-testid="reception-panel">
      <section className="forge-glass relative !rounded-2xl p-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <div className="relative z-[1]">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            <Ear className="h-3.5 w-3.5 text-[rgb(var(--accent-rgb))]" aria-hidden /> Reception
          </p>

          {nothingYet ? (
            <p className="mt-2 text-[13px] leading-relaxed text-white/55" data-testid="reception-empty">
              Nobody has played this yet. When they do, you will see how far they got —
              not a view count.
            </p>
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="started it" value={String(report!.sessions)} />
                <Stat label="reached the end" value={String(report!.finished)} />
                <Stat label="people" value={String(report!.listeners)} />
                <Stat label="came back another day" value={String(report!.returning)} />
              </dl>
              <p className="mt-3 text-[13px] leading-relaxed text-white/65">
                Median stop: <span className="font-mono text-white">{fmt(report!.medianReachedSec)}</span>
                {report!.durationSec ? (
                  <> of <span className="font-mono text-white">{fmt(report!.durationSec)}</span></>
                ) : (
                  <> · track length {NOT_MEASURED}</>
                )}
              </p>
            </>
          )}

          <p className="mt-3 border-t border-white/10 pt-2 text-[11px] leading-relaxed text-white/35">
            Counted from real playback. Whether anyone enjoyed it: <strong>{NOT_MEASURED}</strong> —
            we only know what was asked.
          </p>
        </div>
      </section>

      {dropoff.length > 0 && (
        <section className="forge-glass relative !rounded-2xl p-4" data-testid="reception-dropoff">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[1]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Where unfinished listens stopped
            </p>
            <div className="mt-3 flex h-20 items-end gap-1" role="img" aria-label="Stop points across the track">
              {Array.from({ length: 10 }, (_, i) => {
                const b = dropoff.find((x) => x.bucket === i);
                const n = b?.stopped ?? 0;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-[rgb(var(--accent-rgb)/0.55)]"
                      style={{ height: `${(n / peak) * 100}%`, minHeight: n > 0 ? 3 : 0 }}
                      title={`${n} stopped in the ${i * 10}–${i * 10 + 10}% stretch`}
                    />
                    <span className="text-[9px] text-white/25">{i * 10}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-white/35">
              Percent through the track. Completed listens are excluded.
            </p>
          </div>
        </section>
      )}

      <section className="forge-glass relative !rounded-2xl p-4" data-testid="reception-sparks">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <div className="relative z-[1]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            What you asked
          </p>
          {sparks.length === 0 ? (
            <p className="mt-2 text-[13px] text-white/50">
              No sparks on this track yet. Place one on the Overview tab and people will
              answer it while the music plays.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sparks.map((s) => {
                const answers = s.counts[0] + s.counts[1] + s.counts[2];
                const total = Math.max(1, answers);
                return (
                  <li key={s.id}>
                    <div className="flex items-baseline gap-2">
                      <button
                        type="button"
                        onClick={() => seek(s.positionSec)}
                        className="font-mono text-[11px] text-[rgb(var(--accent-rgb))] hover:underline"
                      >
                        {fmt(s.positionSec)}
                      </button>
                      <p className="min-w-0 flex-1 truncate text-[13px] text-white/85">{s.question}</p>
                    </div>
                    {s.shown === 0 ? (
                      <p className="mt-1 text-[11px] text-white/35">Not shown to anyone yet.</p>
                    ) : (
                      <>
                        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          {s.counts.map((c, i) => (
                            <div
                              key={i}
                              className={
                                i === 0
                                  ? "bg-emerald-400/70"
                                  : i === 1
                                    ? "bg-white/30"
                                    : "bg-amber-400/70"
                              }
                              style={{ width: `${(c / total) * 100}%` }}
                            />
                          ))}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/60">
                          {s.options.map((o, i) => (
                            <span key={o.label}>
                              {o.emoji} {o.label} <span className="font-mono text-white/85">{s.counts[i]}</span>
                            </span>
                          ))}
                          <span className="text-white/35">
                            no response <span className="font-mono">{s.noResponse}</span>
                          </span>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
      <dt className="text-[11px] text-white/40">{label}</dt>
      <dd className="font-display text-xl font-semibold text-white">{value}</dd>
    </div>
  );
}
