import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";
import { SongWorkspaceBanner } from "@/features/workspace/SongWorkspaceBanner";
import { useShellMode } from "@/platform/bridge/PlatformProvider";
import { CommandBar } from "@/shell/CommandBar";
import { CommandPalette } from "@/shell/CommandPalette";
import { PrimaryRail } from "@/shell/PrimaryRail";
import { SuiteStage, useActiveSuiteAppId } from "@/shell/SuiteStage";
import { shellModeClass } from "@/shell/shellMode";
import { PackPipelineBar } from "@/features/packPipeline/PackPipelineBar";
import { isPackPipelinePath } from "@/features/packPipeline/stages";

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
  const suiteAppId = useActiveSuiteAppId();
  const { pathname } = useLocation();
  return (
    <div
      className={`suite-shell suite-density-premium ${shellModeClass(shellMode)}`}
      data-surface-mode={surfaceMode}
      data-shell-mode={shellMode}
      data-suite-app={suiteAppId ?? "home"}
      data-testid="suite-shell"
    >
      <PrimaryRail />
      <div className="suite-shell-main">
        {appBar ?? (
          <ContextualAppBar onCompose={onCompose} onBulkUpload={onBulkUpload} />
        )}
        {/* Tools moved behind the app-bar launcher so the shell leads with the
            social surfaces. SuiteAppRail stays in the tree, imported by nothing. */}
        {showCommandBar ? <CommandBar /> : null}
        {isPackPipelinePath(pathname) ? <PackPipelineBar /> : null}
        <SongWorkspaceBanner />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <SuiteStage>{stage}</SuiteStage>
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
