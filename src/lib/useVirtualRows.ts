import { useEffect, useMemo, useState, type RefObject } from "react";

export type VirtualWindow = {
  start: number;
  end: number;
  padTop: number;
  padBottom: number;
  totalHeight: number;
};

/**
 * Minimal fixed-height row windowing. Deliberately dependency-free: uniform row
 * heights cover every library view (the grid maps N items onto ceil(N/cols) rows),
 * so a full virtualization library would be weight without benefit here.
 *
 * Falls back to rendering everything when the scroll container is not measurable,
 * which keeps server rendering and tests correct.
 */
export function useVirtualRows({
  count,
  rowHeight,
  scrollRef,
  overscan = 4,
  enabled = true,
}: {
  count: number;
  rowHeight: number;
  scrollRef: RefObject<HTMLElement>;
  overscan?: number;
  enabled?: boolean;
}): VirtualWindow {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    const sync = () => {
      setScrollTop(el.scrollTop);
      setViewport(el.clientHeight);
    };
    sync();

    el.addEventListener("scroll", sync, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro?.disconnect();
    };
  }, [scrollRef, enabled, count]);

  return useMemo(() => {
    const totalHeight = count * rowHeight;
    if (!enabled || viewport === 0 || rowHeight <= 0) {
      return { start: 0, end: count, padTop: 0, padBottom: 0, totalHeight };
    }
    const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(viewport / rowHeight) + overscan * 2;
    const last = Math.min(count, first + visible);
    return {
      start: first,
      end: last,
      padTop: first * rowHeight,
      padBottom: Math.max(0, (count - last) * rowHeight),
      totalHeight,
    };
  }, [count, rowHeight, scrollTop, viewport, overscan, enabled]);
}
