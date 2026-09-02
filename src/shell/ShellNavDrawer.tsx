import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { X } from "lucide-react";
import { useReduceFx } from "@/lib/display";
import { overlayVariants, springDrawer, withReduce } from "@/lib/motion";
import { OverlayPortal } from "@/lib/overlayPortal";
import { PrimaryRailNav } from "@/shell/PrimaryRail";
import { closeShellNavDrawer, useShellNavDrawerOpen } from "@/shell/shellNavDrawerStore";
import { DrawerChrome } from "@/components/shell/DrawerChrome";

const leftDrawerVariants: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0 },
  exit: { x: "-100%" },
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function trapFocus(panel: HTMLElement, onClose: () => void) {
  const nodes = () =>
    Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
    );
  const first = nodes()[0];
  first?.focus();

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const list = nodes();
    if (!list.length) return;
    const active = document.activeElement as HTMLElement | null;
    const firstEl = list[0];
    const lastEl = list[list.length - 1];
    if (e.shiftKey && active === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}

/**
 * Accessible left drawer — the default chrome on every viewport.
 * PrimaryRail stays in the tree, unmounted. Destinations share PrimaryRailNav.
 */
export function ShellNavDrawer({
  onCompose,
  onGenerate,
}: {
  onCompose?: () => void;
  onGenerate?: () => void;
}) {
  const open = useShellNavDrawerOpen();
  const reduce = useReduceFx();
  const panelRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    closeShellNavDrawer();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    return trapFocus(panel, closeShellNavDrawer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <OverlayPortal>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={withReduce(reduce, { duration: 0.18 })}
              className="fixed inset-0 z-[70] cursor-default bg-black/70 backdrop-blur-sm"
              onClick={closeShellNavDrawer}
            />
            <motion.aside
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigate VYBZ"
              data-testid="shell-nav-drawer"
              variants={leftDrawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={withReduce(reduce, springDrawer)}
              className="shell-nav-drawer mat-surface-strong fixed inset-y-0 left-0 z-[71] flex w-[min(100%,18.5rem)] flex-col overflow-visible border-r border-white/12"
            >
              <div className="flex items-center justify-between border-b border-[var(--hairline)] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <p className="font-display text-[15px] font-semibold text-white">VYBZ</p>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeShellNavDrawer}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <DrawerChrome onCompose={onCompose} onGenerate={onGenerate} />
              <PrimaryRailNav
                className="min-h-0 flex-1 overflow-y-auto py-2"
                onNavigate={closeShellNavDrawer}
                showIdentity={false}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </OverlayPortal>
  );
}
