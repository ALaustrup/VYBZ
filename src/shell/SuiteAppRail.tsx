import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import {
  activeSuiteAppId,
  overflowSuiteApps,
  primarySuiteApps,
  visibleSuiteApps,
  type SuiteAppDef,
} from "@/shell/suiteApps";
import { cx } from "@/lib/utils";

function AppTile({
  app,
  active,
  onSelect,
}: {
  app: SuiteAppDef;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = app.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      title={app.label}
      aria-label={app.label}
      aria-current={active ? "page" : undefined}
      className={cx(
        "suite-app-tile group relative flex w-full flex-col items-center gap-1 rounded-xl px-1.5 py-2.5",
        active && "suite-app-tile--active"
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
  );
}

/**
 * Right-rail suite apps selector (replaces Now Playing inspector).
 * Hover glows; selected illuminates.
 */
export function SuiteAppRail() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeId = activeSuiteAppId(pathname);
  // Desktop rail shows all visible apps stacked; overflow flag only mattered for horizontal.
  const apps = visibleSuiteApps();

  return (
    <aside
      className="suite-app-rail suite-inspector glass-vibrant hidden w-[4.75rem] shrink-0 flex-col border-l border-[var(--hairline)] lg:flex"
      aria-label="Suite apps"
      data-testid="suite-app-rail"
    >
      <p className="px-2 pb-1 pt-3 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
        Apps
      </p>
      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-4">
        {apps.map((app: SuiteAppDef) => (
          <AppTile
            key={app.id}
            app={app}
            active={app.id === activeId}
            onSelect={() => navigate(app.path)}
          />
        ))}
      </nav>
    </aside>
  );
}

/** Mobile / narrow: primary apps + overflow "More tools" menu. */
export function SuiteAppRailMobile() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeId = activeSuiteAppId(pathname);
  const primary = primarySuiteApps();
  const overflow = overflowSuiteApps();
  const [moreOpen, setMoreOpen] = useState(false);
  const overflowActive = overflow.some((a) => a.id === activeId);

  return (
    <nav
      className="suite-app-rail-mobile relative flex shrink-0 gap-0.5 border-b border-white/[0.06] px-2 py-1 lg:hidden"
      aria-label="Suite apps"
      data-testid="suite-app-rail-mobile"
    >
      <div className="no-scrollbar flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
        {primary.map((app) => {
          const Icon = app.icon;
          const active = app.id === activeId;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => navigate(app.path)}
              title={app.label}
              aria-current={active ? "page" : undefined}
              className={cx(
                "suite-app-tile relative flex shrink-0 flex-col items-center gap-0.5 px-2.5 py-1.5",
                active && "suite-app-tile--active"
              )}
            >
              <span className="suite-app-tile-glow" aria-hidden />
              <Icon className="suite-app-tile-icon relative z-[1] h-4 w-4" />
              <span className="relative z-[1] text-[9px] font-medium">{app.label}</span>
            </button>
          );
        })}
      </div>
      {overflow.length > 0 && (
        <div className="relative shrink-0">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            title="More tools"
            onClick={() => setMoreOpen((v) => !v)}
            className={cx(
              "suite-app-tile relative flex flex-col items-center gap-0.5 px-2.5 py-1.5",
              (moreOpen || overflowActive) && "suite-app-tile--active"
            )}
            data-testid="suite-app-rail-more"
          >
            <span className="suite-app-tile-glow" aria-hidden />
            <MoreHorizontal className="suite-app-tile-icon relative z-[1] h-4 w-4" />
            <span className="relative z-[1] text-[9px] font-medium">More</span>
          </button>
          {moreOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close more tools"
                onClick={() => setMoreOpen(false)}
              />
              <ul
                role="menu"
                className="forge-glass forge-plasma absolute right-0 top-full z-50 mt-1 min-w-[10rem] !rounded-xl py-1 shadow-xl"
                data-testid="suite-app-rail-more-menu"
              >
                <span className="forge-glass-edge pointer-events-none" aria-hidden />
                {overflow.map((app) => {
                  const Icon = app.icon;
                  const active = app.id === activeId;
                  return (
                    <li key={app.id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreOpen(false);
                          navigate(app.path);
                        }}
                        className={cx(
                          "relative z-[1] flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-white/[0.06] hover:text-white",
                          active && "text-white"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {app.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
