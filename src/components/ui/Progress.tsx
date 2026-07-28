import type { HTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  label?: string;
};

/** Determinate progress bar (0–max). */
export function Progress({
  value,
  max = 100,
  label,
  className,
  ...rest
}: ProgressProps) {
  const pct = Math.max(0, Math.min(100, max <= 0 ? 0 : (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx(
        "h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]",
        className
      )}
      {...rest}
    >
      <div
        className="h-full rounded-full bg-suite-cyan transition-[width] duration-suite-base ease-suite motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export type StatusDotTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

export type StatusDotProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusDotTone;
  pulse?: boolean;
  label?: string;
};

const dotTone: Record<StatusDotTone, string> = {
  neutral: "bg-fog",
  success: "bg-suite-success",
  warning: "bg-suite-warning",
  danger: "bg-suite-danger",
  info: "bg-suite-info",
  accent: "bg-suite-cyan",
};

export function StatusDot({
  tone = "neutral",
  pulse = false,
  label,
  className,
  ...rest
}: StatusDotProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        dotTone[tone],
        pulse && "animate-pulse motion-reduce:animate-none",
        className
      )}
      {...rest}
    />
  );
}
