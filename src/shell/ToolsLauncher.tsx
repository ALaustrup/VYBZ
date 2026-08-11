import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, X } from "lucide-react";
import { OverlayPortal } from "@/lib/overlayPortal";
import { activeSuiteAppId, visibleSuiteApps, type SuiteAppDef } from "@/shell/suiteApps";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Tools launcher.
 *
 * VYBZ leads with the social surfaces, so the production tools no longer occupy
 * permanent shell chrome — they live behind one menu. `SUITE_APPS` stays the single
 * registry, so nothing is removed and every tool route is still reachable.
 * Home is excluded: it is the social home, not a tool.
 */
export function toolsLauncherApps(): SuiteAppDef[] {
  return visibleSuiteApps().filter((a) => a.id !== "home");
}

export function ToolsLauncherButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open tools"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-tip="Tools"
        data-testid="tools-launcher-button"
        className={cx("forge-chip flex h-10 w-10 active:scale-90", open && "forge-chip--active", className)}
      >
        <LayoutGrid className="h-6 w-6" />
      </button>
      <ToolsLauncherOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ToolsLauncherOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduce = useReduceFx();
  const activeId = activeSuiteAppId(pathname);
  const apps = toolsLauncherApps();

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
          <motion.div
            className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="tools-launcher"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Tools"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="forge-glass relative w-full max-w-lg overflow-hidden p-4 shadow-suite-lg"
            >
              <span className="forge-glass-edge pointer-events-none" aria-hidden />
              <div className="relative z-[1] mb-3 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="nexus-eyebrow">Tools</p>
                  <p className="text-[12px] text-white/45">
                    Production tools — your profile, library and feed stay in the shell.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close tools"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 hover:text-white active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="relative z-[1] grid grid-cols-3 gap-2 sm:grid-cols-4">
                {apps.map((app) => {
                  const Icon = app.icon;
                  const active = app.id === activeId;
                  return (
                    <li key={app.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate(app.path);
                        }}
                        aria-current={active ? "page" : undefined}
                        data-testid={`tools-launcher-${app.id}`}
                        className={cx(
                          "suite-app-tile group flex w-full flex-col items-center gap-1.5 rounded-xl px-1.5 py-3 text-white/75 hover:text-white",
                          active && "suite-app-tile--active",
                        )}
                      >
                        <span className="suite-app-tile-glow" aria-hidden />
                        <Icon
                          className="suite-app-tile-icon relative z-[1] h-5 w-5"
                          strokeWidth={active ? 2.25 : 1.75}
                        />
                        <span className="relative z-[1] max-w-full truncate text-[10px] font-medium tracking-wide">
                          {app.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  );
}
