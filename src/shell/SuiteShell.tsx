import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";
import { NowPlayingStage } from "@/components/shell/NowPlayingStage";
import { useShellMode } from "@/platform/bridge/PlatformProvider";
import { CommandBar } from "@/shell/CommandBar";
import { ContextInspector } from "@/shell/ContextInspector";
import { MobileNav } from "@/shell/MobileNav";
import { PrimaryRail } from "@/shell/PrimaryRail";
import { shellModeClass } from "@/shell/shellMode";

export function SuiteShell({
  stage,
  dock,
  appBar,
  onCompose,
  onBulkUpload,
  surfaceMode = "professional",
  showCommandBar = false,
  showInspector = false,
}: {
  stage: ReactNode;
  dock: ReactNode;
  /** Optional chrome slot; defaults to ContextualAppBar. */
  appBar?: ReactNode;
  onCompose?: () => void;
  onBulkUpload?: () => void;
  surfaceMode?: "professional" | "audience";
  showCommandBar?: boolean;
  showInspector?: boolean;
}) {
  const shellMode = useShellMode();
  return (
    <div
      className={`suite-shell ${shellModeClass(shellMode)}`}
      data-surface-mode={surfaceMode}
      data-shell-mode={shellMode}
    >
      <PrimaryRail />
      <div className="suite-shell-main">
        {appBar ?? (
          <ContextualAppBar onCompose={onCompose} onBulkUpload={onBulkUpload} />
        )}
        {showCommandBar ? <CommandBar /> : null}
        <ErrorBoundary>
          <NowPlayingStage />
        </ErrorBoundary>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="suite-stage">
            <ErrorBoundary>
              <div className="suite-stage-inner">{stage}</div>
            </ErrorBoundary>
          </main>
          <ContextInspector defaultOpen={showInspector} />
        </div>
        <MobileNav />
      </div>
      <div className="app-dock" role="complementary" aria-label="V-Dock">
        {dock}
      </div>
    </div>
  );
}
