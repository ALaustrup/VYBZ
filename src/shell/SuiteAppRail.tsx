import { useLocation, useNavigate } from "react-router-dom";
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

/** Mobile / narrow: compact horizontal strip (primary apps only). */
export function SuiteAppRailMobile() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeId = activeSuiteAppId(pathname);
  const apps = [...primarySuiteApps(), ...overflowSuiteApps().slice(0, 2)];

  return (
    <nav
      className="suite-app-rail-mobile no-scrollbar flex shrink-0 gap-0.5 overflow-x-auto border-b border-white/[0.06] px-2 py-1 lg:hidden"
      aria-label="Suite apps"
      data-testid="suite-app-rail-mobile"
    >
      {apps.map((app) => {
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
    </nav>
  );
}
