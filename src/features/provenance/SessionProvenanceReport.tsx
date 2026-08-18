import { Download, Loader2, ShieldCheck } from "lucide-react";
import { NOT_MEASURED } from "@/product/invariants";
import { audioShaLabel } from "./audioBind";
import { resolveSessionAudio, type SealedProvenance } from "./buildVprov";
import { SessionProvenanceBadge } from "./SessionProvenanceBadge";

/** In-app verification report for a sealed live mix. Not a human-certified claim. */
export function SessionProvenanceReport({
  row,
  busy,
  onDownload,
}: {
  row: SealedProvenance;
  busy?: boolean;
  onDownload?: () => void;
}) {
  const { audio } = resolveSessionAudio(row);
  const full = row.strength === "full" && row.atcBurned > 0;

  return (
    <section data-testid="session-provenance-report" className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-200/80" /> Session provenance
        </p>
        <SessionProvenanceBadge strength={row.strength} compact />
      </div>
      <p className="text-[12px] leading-snug text-white/50">
        Measured proof that this authenticated host ran a public live mix.
        {full ? " Full strength because Airtime was burned." : " Thin — no measured Airtime burn."}
        {" "}Does not prove the music was not AI-generated.
      </p>
      <dl className="space-y-1.5 font-mono text-[11px] text-white/70">
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">ATC burned</dt>
          <dd>{row.atcBurned}s</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Events</dt>
          <dd>{row.eventCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Chain</dt>
          <dd className="truncate">{row.chainRoot ? `${row.chainRoot.slice(0, 12)}…` : NOT_MEASURED}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Audio SHA</dt>
          <dd className="truncate text-right">{audioShaLabel(audio)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/35">Not AI</dt>
          <dd>{NOT_MEASURED}</dd>
        </div>
      </dl>
      {onDownload && (
        <button
          type="button"
          disabled={busy}
          onClick={onDownload}
          data-testid="download-vprov"
          className="btn btn-primary flex h-9 w-full items-center justify-center gap-1.5 py-0 text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download .vprov
        </button>
      )}
    </section>
  );
}
