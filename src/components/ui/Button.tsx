import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-suite-cyan text-abyss hover:brightness-110 shadow-btn-primary disabled:bg-suite-cyan/40",
  secondary:
    "bg-graphite text-snow border border-[var(--hairline)] hover:border-[var(--hairline-strong)] hover:bg-white/[0.04]",
  ghost: "bg-transparent text-fog hover:bg-white/[0.06] hover:text-snow",
  danger:
    "bg-suite-danger/15 text-suite-danger border border-suite-danger/30 hover:bg-suite-danger/25",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      className,
      children,
      type = "button",
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cx(
          "inline-flex items-center justify-center rounded-suite-md font-semibold",
          "transition duration-suite-base ease-suite",
          "focus-visible:outline-none focus-visible:shadow-suite-focus",
          "disabled:pointer-events-none disabled:opacity-50",
          "motion-reduce:transition-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);
