import type { HTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Number of stacked blocks. Default 1. */
  lines?: number;
};

/**
 * Shimmer placeholder. Under prefers-reduced-motion, renders static gray.
 */
export function Skeleton({ lines = 1, className, ...rest }: SkeletonProps) {
  const count = Math.max(1, lines);
  return (
    <div className={cx("flex flex-col gap-2", className)} aria-hidden {...rest}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cx(
            "h-3 rounded-suite-sm bg-white/[0.08]",
            "motion-safe:animate-pulse",
            i === count - 1 && count > 1 && "w-2/3"
          )}
        />
      ))}
    </div>
  );
}
