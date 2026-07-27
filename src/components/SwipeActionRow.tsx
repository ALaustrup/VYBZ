import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";

/** Desktop: hover reveals actions. Mobile: swipe left reveals; auto-hides if unused. */
export function SwipeActionRow({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const startX = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  function armAutoHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 2800);
  }

  const show = hover || open;

  return (
    <div
      className={cx("relative overflow-hidden", className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={(e) => { startX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const x0 = startX.current;
        startX.current = null;
        const x1 = e.changedTouches[0]?.clientX;
        if (x0 == null || x1 == null) return;
        if (x0 - x1 > 48) { setOpen(true); armAutoHide(); }
        else if (x1 - x0 > 48) setOpen(false);
      }}
    >
      <div className={cx("transition-transform duration-200", show && "-translate-x-[7.5rem]")}>
        {children}
      </div>
      <div
        className={cx(
          "absolute inset-y-0 right-0 flex w-[7.5rem] items-center justify-end gap-0.5 pr-1 transition-opacity",
          show ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {actions}
      </div>
    </div>
  );
}
