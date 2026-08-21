import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { listHostStageNights, type StageNight } from "@/features/profile/stageNights";
import { SessionProvenanceBadge } from "./SessionProvenanceBadge";

export function ProvenanceHistory({ hostId }: { hostId: string }) {
  const navigate = useNavigate();
  const [nights, setNights] = useState<StageNight[] | null>(null);

  useEffect(() => {
    let alive = true;
    void listHostStageNights(hostId, 24).then((list) => {
      if (alive) setNights(list.filter((n) => n.sealed));
    });
    return () => {
      alive = false;
    };
  }, [hostId]);

  if (!nights || nights.length === 0) return null;

  return (
    <section data-testid="provenance-history" className="mt-6 space-y-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        <ShieldCheck className="h-3.5 w-3.5 text-cyan-200/80" /> Session provenance
      </p>
      <p className="text-[12px] text-white/40">
        Sealed lives you hosted. Associate a file from Library via Validate Humanity.
      </p>
      <ul className="space-y-1.5">
        {nights.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => navigate(`/live/${n.id}`)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left hover:border-white/16"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-white/85">
                  {n.title || n.intent || "Live"}
                </span>
                <span className="font-mono text-[10px] text-white/35">{n.id.slice(0, 8)}</span>
              </span>
              {n.strength && <SessionProvenanceBadge strength={n.strength} compact />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
