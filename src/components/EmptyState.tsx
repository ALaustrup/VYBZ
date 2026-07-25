import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Quiet empty state — soft icon, clear line, optional action. No card chrome.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="stage-empty gap-3 py-14">
      <Icon className="relative z-[1] h-6 w-6 text-cyan-200/40" />
      <p className="relative z-[1] font-display text-base font-semibold text-white">{title}</p>
      <p className="relative z-[1] max-w-xs text-sm leading-relaxed text-white/45">{body}</p>
      {action ? <div className="relative z-[1]">{action}</div> : null}
    </div>
  );
}
