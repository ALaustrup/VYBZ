import { ShieldCheck } from "lucide-react";
import { cx } from "@/lib/utils";
import type { ProvenanceStrength } from "@/product/invariants";

export function SessionProvenanceBadge({
  strength,
  compact = false,
}: {
  strength: ProvenanceStrength | null;
  compact?: boolean;
}) {
  const label = strength === "full" ? "Full" : strength === "thin" ? "Thin" : null;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-400/10 font-mono font-medium text-cyan-100",
        compact ? "px-1.5 py-0.5 text-[9px] uppercase tracking-wider" : "px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
      )}
      title="Session provenance. Does not prove the music was not AI-generated."
    >
      <ShieldCheck className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      Session provenance{label ? ` · ${label}` : ""}
    </span>
  );
}
