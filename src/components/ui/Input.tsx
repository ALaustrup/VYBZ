import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

type FieldChrome = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
};

const fieldClass = (error?: ReactNode, className?: string) =>
  cx(
    "w-full rounded-suite-md border bg-abyss/60 px-3 py-2 text-sm text-snow",
    "placeholder:text-fog/60 transition duration-suite-base ease-suite",
    "focus-visible:outline-none focus-visible:shadow-suite-focus",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "motion-reduce:transition-none",
    error ? "border-suite-danger/50" : "border-[var(--hairline)]",
    className
  );

function FieldWrap({
  id,
  label,
  hint,
  error,
  children,
}: FieldChrome & { id?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={id}>
      {label ? <span className="font-medium text-snow">{label}</span> : null}
      {children}
      {error ? (
        <span className="text-xs text-suite-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-fog">{hint}</span>
      ) : null}
    </label>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldChrome;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, ...rest },
  ref
) {
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error}>
      <input ref={ref} id={id} className={fieldClass(error, className)} aria-invalid={!!error || undefined} {...rest} />
    </FieldWrap>
  );
});

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldChrome;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, className, id, rows = 4, ...rest },
  ref
) {
  return (
    <FieldWrap id={id} label={label} hint={hint} error={error}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={fieldClass(error, cx("min-h-[5rem] resize-y", className))}
        aria-invalid={!!error || undefined}
        {...rest}
      />
    </FieldWrap>
  );
});
