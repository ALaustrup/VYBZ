import { Disc3 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import type { Credit } from "@/types";

/**
 * Public discography — verified credits from released Collabs.
 */
export function Discography({
  credits,
  isOwner = false,
}: {
  credits: Credit[];
  isOwner?: boolean;
}) {
  if (credits.length === 0) {
    return (
      <EmptyState
        icon={Disc3}
        title="No discography yet"
        body={
          isOwner
            ? "Release a Collab with agreed splits to earn verified credits here."
            : "This creator hasn’t released a Collab credit yet."
        }
      />
    );
  }

  return (
    <div>
      <p className="eyebrow mb-3">Discography · {credits.length}</p>
      <div className="divide-y divide-[var(--hairline)]">
        {credits.map((c) => (
          <div key={`${c.projectId}-${c.role ?? "x"}-${c.releasedAt}`} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-semibold text-white">{c.title}</p>
              <p className="mt-0.5 text-[12px] text-white/40">
                {c.role ?? "Credit"}
                {typeof c.split === "number" ? ` · ${c.split}%` : ""}
                {c.releasedAt ? ` · ${new Date(c.releasedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
            <Disc3 className="mt-1 h-4 w-4 shrink-0 text-white/25" />
          </div>
        ))}
      </div>
    </div>
  );
}
