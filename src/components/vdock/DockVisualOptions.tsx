import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { OverlayPortal } from "@/lib/overlayPortal";
import {
  getVdockVizMode,
  setVdockVizMode,
  subscribeVdockVizMode,
  VDOCK_VIZ_MODES,
  vdockVizLabel,
} from "@/lib/vdockVizMode";
import { getVdockVisualId, setVdockVisualId, subscribeVdockVisualId } from "@/lib/vdockVisualChoice";
import { VDOCK_VISUALS } from "@/lib/vdockVisualManifest";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Visual options for the dock, anchored bottom-right of the page.
 *
 * Opened by clicking the dock's visual surface. The chosen mode is the same store
 * the expanded player reads, so the dock and the full-screen visualizer always show
 * the same thing rather than drifting apart.
 */
export function DockVisualOptions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mode = useSyncExternalStore(subscribeVdockVizMode, getVdockVizMode, getVdockVizMode);
  const visualId = useSyncExternalStore(subscribeVdockVisualId, getVdockVisualId, getVdockVisualId);
  const reduce = useReduceFx();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <OverlayPortal>
          {/* Click-away catcher sits below the panel but above the page. */}
          <button
            type="button"
            aria-label="Close visual options"
            onClick={onClose}
            className="fixed inset-0 z-[90] cursor-default bg-transparent"
          />
          <motion.div
            role="dialog"
            aria-label="Dock visuals"
            data-testid="dock-visual-options"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="forge-glass fixed right-3 z-[91] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden p-3 shadow-suite-lg sm:right-5"
            style={{ bottom: "calc(var(--dock-reserve, 6.25rem) + 0.75rem)" }}
          >
            <span className="forge-glass-edge pointer-events-none" aria-hidden />
            <div className="relative z-[1] mb-2.5 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--accent-rgb))]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Visuals
                </p>
                <p className="truncate text-[11px] text-white/45">
                  Vizualz film plus the meter — dock and full-screen
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/55 hover:text-white active:scale-90"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="relative z-[1] mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Film
            </p>
            <div className="relative z-[1] mb-3 max-h-[11.5rem] overflow-y-auto pr-0.5">
              <ul className="grid grid-cols-3 gap-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setVdockVisualId(null)}
                    aria-pressed={!visualId}
                    data-testid="dock-visual-film-none"
                    className={cx(
                      "flex aspect-video w-full items-center justify-center rounded-lg text-[10px] font-semibold uppercase tracking-wide transition",
                      !visualId
                        ? "bg-white/15 text-white ring-1 ring-white/25"
                        : "bg-white/[0.04] text-white/45 hover:text-white/80",
                    )}
                  >
                    None
                  </button>
                </li>
                {VDOCK_VISUALS.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setVdockVisualId(v.id)}
                      aria-pressed={visualId === v.id}
                      title={v.title}
                      data-testid={`dock-visual-film-${v.id}`}
                      className={cx(
                        "relative aspect-video w-full overflow-hidden rounded-lg transition",
                        visualId === v.id
                          ? "ring-1 ring-white/40"
                          : "opacity-75 hover:opacity-100",
                      )}
                    >
                      <img src={v.previewUrl} alt="" className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white/90">
                        {v.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="relative z-[1] mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Meter
            </p>
            <ul className="relative z-[1] grid grid-cols-2 gap-1.5">
              {VDOCK_VIZ_MODES.map((m) => (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => setVdockVizMode(m)}
                    aria-pressed={mode === m}
                    data-testid={`dock-visual-${m}`}
                    className={cx(
                      "w-full rounded-lg px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide transition",
                      mode === m
                        ? "bg-white/15 text-white ring-1 ring-white/25"
                        : "bg-white/[0.04] text-white/45 hover:text-white/80",
                    )}
                  >
                    {vdockVizLabel(m)}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  );
}
