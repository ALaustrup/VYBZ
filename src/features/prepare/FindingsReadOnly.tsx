import type { ReleaseFinding } from "@vybz/domain/releases";
import { Badge } from "@/components/ui/Badge";
import { StateView } from "@/components/states/StateView";

/**
 * Mobile-optimised read-only Findings list (Android Alpha).
 * Editing remains on Prepare detail / desktop.
 */
export function FindingsReadOnly({
  findings,
  title = "Findings",
}: {
  findings: ReleaseFinding[];
  title?: string;
}) {
  if (!findings.length) {
    return <StateView variant="empty" title="No findings" body="This release has no open findings." />;
  }

  return (
    <section className="flex flex-col gap-3" data-testid="findings-readonly">
      <h2 className="nexus-eyebrow !text-sm">{title}</h2>
      <ul className="flex flex-col gap-2">
        {findings.map((f) => (
          <li
            key={f.id}
            className="forge-card"
            data-testid={`findings-readonly-${f.code}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-snow">{f.title}</p>
              <Badge tone={f.severity === "blocking" ? "danger" : f.severity === "warning" ? "warning" : "neutral"}>
                {f.severity}
              </Badge>
            </div>
            {f.detail ? <p className="mt-1 text-xs leading-relaxed text-fog">{f.detail}</p> : null}
            <p className="mt-2 text-[10px] uppercase tracking-wider text-fog/80">{f.status}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
