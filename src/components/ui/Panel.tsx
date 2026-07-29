import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/utils";

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  children?: ReactNode;
};

const pad: Record<NonNullable<PanelProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

/** Flat graphite panel for professional Suite surfaces. */
export function Panel({ padding = "md", className, children, ...rest }: PanelProps) {
  return (
    <div
      className={cx(
        "suite-surface-professional bg-graphite text-snow border border-[var(--hairline)] rounded-suite-md",
        pad[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  children?: ReactNode;
};

/** Thinner interactive card for lists / pickers. */
export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-suite-md border border-[var(--hairline)] bg-graphite/80 text-snow p-3",
        "transition duration-suite-base ease-suite motion-reduce:transition-none",
        interactive &&
          "cursor-pointer hover:border-[var(--hairline-strong)] hover:bg-graphite focus-visible:outline-none focus-visible:shadow-suite-focus",
        className
      )}
      tabIndex={interactive ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
