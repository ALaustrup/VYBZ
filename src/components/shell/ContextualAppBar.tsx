import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu } from "lucide-react";
import { YouChip } from "@/components/OrbDock";
import { MoreDrawer } from "@/components/shell/MoreDrawer";
import { chromeForPath } from "@/lib/appBarChrome";
import { useAppBarBridge } from "@/lib/appBarBridge";
import { cx } from "@/lib/utils";

/**
 * Sticky contextual app bar. Merges static route chrome with page-registered
 * overrides; opens the More drawer for secondary destinations (3C).
 */
export function ContextualAppBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const chrome = chromeForPath(pathname);
  const bridge = useAppBarBridge();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const title = bridge.title ?? chrome.title;
  const subtitle = bridge.subtitle ?? chrome.subtitle;
  const showBack = chrome.showBack || !!chrome.backTo;
  const hideYou = !!bridge.hideYouChip;

  function onBack() {
    if (chrome.backTo) navigate(chrome.backTo);
    else navigate(-1);
  }

  return (
    <>
      <header className={cx("app-bar shrink-0", subtitle && "app-bar--sub")}>
        <div className="app-bar-inner">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {bridge.leading ?? (showBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass active:scale-90"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null)}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[15px] font-semibold tracking-tight text-white/90">
                {title}
              </p>
              {subtitle && (
                <p className="truncate text-[11px] leading-tight text-white/40">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {bridge.actions}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              aria-expanded={moreOpen}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full glass active:scale-90"
            >
              <Menu className="h-4 w-4" />
            </button>
            {!hideYou && <YouChip />}
          </div>
        </div>
      </header>
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
