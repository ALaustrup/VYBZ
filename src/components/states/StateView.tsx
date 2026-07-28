import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";

export type StateVariant =
  | "empty"
  | "error"
  | "offline"
  | "restricted"
  | "unavailable"
  | "loading";

export type StateViewProps = {
  variant: StateVariant;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const defaults: Record<StateVariant, { tone: string; fallbackIcon?: ReactNode }> = {
  empty: { tone: "text-fog" },
  error: { tone: "text-suite-danger" },
  offline: { tone: "text-suite-warning" },
  restricted: { tone: "text-suite-warning" },
  unavailable: { tone: "text-fog" },
  loading: {
    tone: "text-suite-cyan",
    fallbackIcon: (
      <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden />
    ),
  },
};

export function StateView({
  variant,
  title,
  body,
  action,
  icon,
  className,
}: StateViewProps) {
  const meta = defaults[variant];
  const resolvedIcon = icon ?? meta.fallbackIcon;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cx(
        "flex flex-col items-center justify-center gap-3 px-6 py-10 text-center",
        className
      )}
    >
      {resolvedIcon ? (
        <div className={cx("opacity-90", meta.tone)}>{resolvedIcon}</div>
      ) : null}
      <div className="max-w-sm space-y-1.5">
        <h3 className="font-display text-base font-semibold text-snow">{title}</h3>
        {body ? <p className="text-sm text-fog">{body}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
