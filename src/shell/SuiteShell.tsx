import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";
import { useShellMode } from "@/platform/bridge/PlatformProvider";
import { CommandBar } from "@/shell/CommandBar";
import { CommandPalette } from "@/shell/CommandPalette";
import { PrimaryRail } from "@/shell/PrimaryRail";
import { SuiteAppRail, SuiteAppRailMobile } from "@/shell/SuiteAppRail";
import { shellModeClass } from "@/shell/shellMode";

export function SuiteShell({
  stage,
  dock,
  appBar,
  onCompose,
  onBulkUpload,
  surfaceMode = "professional",
  showCommandBar = false,
  showInspector: _showInspector = false,
}: {
  stage: ReactNode;
  dock: ReactNode;
  /** Optional chrome slot; defaults to ContextualAppBar. */
  appBar?: ReactNode;
  onCompose?: () => void;
  onBulkUpload?: () => void;
  surfaceMode?: "professional" | "audience";
  showCommandBar?: boolean;
  /** @deprecated Right rail is SuiteAppRail (apps), not an inspector. */
  showInspector?: boolean;
}) {
  const shellMode = useShellMode();
  return (
    <div
      className={`suite-shell suite-density-premium ${shellModeClass(shellMode)}`}
      data-surface-mode={surfaceMode}
      data-shell-mode={shellMode}
    >
      <PrimaryRail />
      <div className="suite-shell-main">
        {appBar ?? (
          <ContextualAppBar onCompose={onCompose} onBulkUpload={onBulkUpload} />
        )}
        {/* Narrow viewports: horizontal suite apps. Desktop: SuiteAppRail (right). */}
        <SuiteAppRailMobile />
        {showCommandBar ? <CommandBar /> : null}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="suite-stage suite-stage-frame">
            <ErrorBoundary>
              <div className="suite-stage-inner">{stage}</div>
            </ErrorBoundary>
          </main>
          <SuiteAppRail />
        </div>
      </div>
      <div className="app-dock" role="complementary" aria-label="V-Dock">
        {dock}
      </div>
      {/* Renders nothing until invoked, but owns the global Ctrl/Cmd+K binding. */}
      <ErrorBoundary>
        <CommandPalette onCompose={onCompose} onBulkUpload={onBulkUpload} />
      </ErrorBoundary>
    </div>
  );
}
