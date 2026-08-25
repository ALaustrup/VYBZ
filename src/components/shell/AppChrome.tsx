import type { ReactNode } from "react";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";

/**
 * App chrome: sticky app bar, scroll stage, fixed V-Dock.
 *
 * NowPlayingStage is deliberately not mounted here. It reserved up to 52vh on every
 * route to show an idle placeholder. It belongs to live playback surfaces and will be
 * mounted there when live streaming ships.
 */
export function AppChrome({
  stage,
  dock,
  onCompose,
  onGenerate,
  onBulkUpload,
}: {
  stage: ReactNode;
  /** Always-visible bottom chrome (V-Dock). */
  dock: ReactNode;
  onCompose?: () => void;
  onGenerate?: () => void;
  onBulkUpload?: () => void;
}) {
  return (
    <div className="app-shell">
      <div className="app-shell-main">
        <ContextualAppBar onCompose={onCompose} onGenerate={onGenerate} onBulkUpload={onBulkUpload} />
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
