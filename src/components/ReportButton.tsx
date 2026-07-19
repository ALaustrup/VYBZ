import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { cx } from "@/lib/utils";
import type { ReportKind } from "@/types";

/**
 * Universal, one-tap flag/report affordance for any piece of content (§ Trust &
 * Safety). Self-contained: owns its modal state and feeds the same moderation
 * queue as every other report (reasons include "Illegal"). Keep it subtle but
 * always present on user-generated content.
 */
export function ReportButton({ kind, targetId, label, className, iconClassName }: {
  kind: ReportKind;
  targetId: string;
  label?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label={`Report ${kind}`}
        title="Report or flag content"
        className={cx("text-white/25 transition hover:text-wild active:scale-95", className)}
      >
        <Flag className={cx("h-3.5 w-3.5", iconClassName)} />
      </button>
      <ReportModal open={open} onClose={() => setOpen(false)} targetKind={kind} targetId={targetId} targetLabel={label} />
    </>
  );
}
