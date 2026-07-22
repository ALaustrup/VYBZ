import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import { YouChip } from "@/components/OrbDock";
import { chromeForPath } from "@/lib/appBarChrome";
import { useAppBarBridge } from "@/lib/appBarBridge";
import { cx } from "@/lib/utils";

/**
 * Sticky contextual app bar (3B). Merges static route chrome with
 * page-registered overrides (title, actions, leading).
 */
export function ContextualAppBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const chrome = chromeForPath(pathname);
  const bridge = useAppBarBridge();

  const title = bridge.title ?? chrome.title;
  const subtitle = bridge.subtitle ?? chrome.subtitle;
  const showBack = chrome.showBack || !!chrome.backTo;
  const hideYou = !!bridge.hideYouChip;

  function onBack() {
    if (chrome.backTo) navigate(chrome.backTo);
    else navigate(-1);
  }

  return (
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
          {!hideYou && <YouChip />}
        </div>
      </div>
    </header>
  );
}
