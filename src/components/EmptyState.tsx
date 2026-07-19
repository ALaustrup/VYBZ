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
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Icon className="h-6 w-6 text-white/25" />
      <p className="font-display text-base font-semibold text-white">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-white/45">{body}</p>
      {action}
    </div>
  );
}
