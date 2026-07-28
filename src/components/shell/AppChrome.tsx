import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";
import { NowPlayingStage } from "@/components/shell/NowPlayingStage";

/**
 * App chrome: sticky app bar, now-playing stage, scroll stage, fixed V-Dock.
 */
export function AppChrome({
  stage,
  dock,
  onCompose,
  onBulkUpload,
}: {
  stage: ReactNode;
  /** Always-visible bottom chrome (V-Dock). */
  dock: ReactNode;
  onCompose?: () => void;
  onBulkUpload?: () => void;
}) {
  return (
    <div className="app-shell">
      <div className="app-shell-main">
        <ContextualAppBar onCompose={onCompose} onBulkUpload={onBulkUpload} />
        <ErrorBoundary>
          <NowPlayingStage />
        </ErrorBoundary>
        <main className="app-stage">
          <div className="app-stage-inner">{stage}</div>
        </main>
      </div>
      <div className="app-dock" role="complementary" aria-label="V-Dock">
        {dock}
      </div>
    </div>
  );
}
