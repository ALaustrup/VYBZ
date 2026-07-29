import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

export type TooltipProps = HTMLAttributes<HTMLSpanElement> & {
  /** Tooltip label — also sets title for fallback. */
  tip: string;
  children: ReactNode;
};

/**
 * Simple hover/focus tooltip via existing `[data-tip]` CSS + `title` fallback.
 */
export function Tooltip({ tip, children, className, ...rest }: TooltipProps) {
  return (
    <span
      data-tip={tip}
      title={tip}
      className={cx("inline-flex", className)}
      {...rest}
    >
      {children}
    </span>
  );
}
