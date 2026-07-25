import type { ReactNode } from "react";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";

/**
 * App chrome: sticky app bar, scroll stage, and fixed V-Dock overlay
 * (pins + widgets + Now Playing + Orb). Same layout on mobile and desktop.
 */
export function AppChrome({
  stage,
  dock,
}: {
  stage: ReactNode;
  /** Always-visible bottom chrome (V-Dock). */
  dock: ReactNode;
}) {
  return (
    <div className="app-shell">
      <div className="app-shell-main">
        <ContextualAppBar />
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
