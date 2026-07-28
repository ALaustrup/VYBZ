import {
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { OverlayPortal } from "@/lib/overlayPortal";
import { cx } from "@/lib/utils";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** When false, backdrop click does not close. Default true. */
  closeOnBackdrop?: boolean;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  closeOnBackdrop = true,
}: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-modal flex items-center justify-center p-4"
        role="presentation"
      >
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 bg-abyss/70 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          className={cx(
            "relative z-[1] w-full max-w-md rounded-suite-md border border-[var(--hairline)]",
            "bg-graphite p-5 text-snow shadow-suite-lg outline-none",
            "focus-visible:shadow-suite-focus",
            className
          )}
        >
          {title ? (
            <h2 id={titleId} className="mb-3 font-display text-lg font-semibold text-snow">
              {title}
            </h2>
          ) : null}
          {children}
        </div>
      </div>
    </OverlayPortal>
  );
}

export type DialogActionsProps = HTMLAttributes<HTMLDivElement>;

export function DialogActions({ className, ...rest }: DialogActionsProps) {
  return <div className={cx("mt-5 flex justify-end gap-2", className)} {...rest} />;
}
