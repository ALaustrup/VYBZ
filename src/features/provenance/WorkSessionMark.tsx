import { ShieldCheck } from "lucide-react";
import { SessionProvenanceBadge } from "./SessionProvenanceBadge";
import { attestWorkSessions, type WorkSessionLink } from "./workAttestation";

export function WorkSessionMark({ links }: { links: WorkSessionLink[] }) {
  const att = attestWorkSessions(links);
  if (!att.associated || !att.claim) return null;
  return (
    <div
      data-testid="work-session-claim"
      className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-cyan-100/80"
    >
      <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-cyan-300/80" />
      <span>
        {att.claim}
        {att.strength && (
          <span className="ml-1.5 inline-block align-middle">
            <SessionProvenanceBadge strength={att.strength} compact />
          </span>
        )}
        <span className="mt-0.5 block text-white/35">{att.refusal}</span>
      </span>
    </div>
  );
}
