import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A consistent, branded empty state — a soft icon medallion, a clear line, and
 * an optional action. Replaces ad-hoc "nothing here" text for a more intentional
 * feel.
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
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/8 bg-white/[0.02] px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-veil-500/12 text-veil-200">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-display text-base font-semibold text-white">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-white/50">{body}</p>
      {action}
    </div>
  );
}
