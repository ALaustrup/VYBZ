import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export type FormFieldProps = {
  id?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Labeled form chrome with programmatic error association.
 * Wrap Input/TextArea (or custom controls) that already carry focus-ring tokens.
 */
export function FormField({ id, label, hint, error, children, className }: FormFieldProps) {
  const hintId = id ? `${id}-hint` : undefined;
  const errorId = id ? `${id}-error` : undefined;
  return (
    <div className={cx("flex flex-col gap-1.5 text-sm", className)} data-testid="form-field">
      {label ? (
        <label htmlFor={id} className="font-medium text-snow">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <span id={errorId} className="text-xs text-suite-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-xs text-fog">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
