import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx, haptic } from "@/lib/utils";

const THRESHOLD = 70; // px pulled before a release triggers a refresh
const MAX = 110;
const MIN_SPIN_MS = 600; // keep the spinner up long enough to feel intentional

/**
 * Mobile pull-to-refresh. Owns its scroll container; when the user drags down
 * from the top past a threshold and releases, it runs `onRefresh` with a brief
 * minimum spinner. Inert with a mouse/desktop (no touch) — normal scrolling.
 */
export function PullToRefresh({
  onRefresh,
  className,
  children,
}: {
  onRefresh: () => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const settling = startY.current === null;

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const el = ref.current;
    startY.current = el && el.scrollTop <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    setPull(dy <= 0 ? 0 : Math.min(MAX, dy * 0.5));
  };
  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      haptic(12);
      try {
        await Promise.all([
          Promise.resolve(onRefresh()),
          new Promise((r) => setTimeout(r, MIN_SPIN_MS)),
        ]);
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cx("no-scrollbar relative overflow-y-auto", className)}
    >
      {/* Pull indicator. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full glass"
          style={{
            transform: `translateY(${pull - 20}px)`,
            opacity: refreshing ? 1 : progress,
            transition: settling ? "transform 0.25s, opacity 0.25s" : "none",
          }}
        >
          <Loader2
            className={cx("h-4 w-4 text-veil-200", refreshing && "animate-spin")}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: settling ? "transform 0.25s cubic-bezier(0.16,1,0.3,1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
