import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children?: ReactNode;
};

const tones: Record<BadgeTone, string> = {
  neutral: "bg-white/[0.08] text-fog border-[var(--hairline)]",
  success: "bg-suite-success/15 text-suite-success border-suite-success/25",
  warning: "bg-suite-warning/15 text-suite-warning border-suite-warning/25",
  danger: "bg-suite-danger/15 text-suite-danger border-suite-danger/25",
  info: "bg-suite-info/15 text-suite-info border-suite-info/25",
  accent: "bg-suite-cyan/15 text-suite-cyan border-suite-cyan/25",
};

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-suite-sm border px-2 py-0.5",
        "text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
