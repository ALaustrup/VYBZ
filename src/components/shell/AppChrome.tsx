import type { ReactNode } from "react";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";

/**
 * App chrome: sticky app bar, scroll stage, and a fixed bottom dock overlay
 * (taskbar + integrated player). Same layout on mobile and desktop — no side rail.
 */
export function AppChrome({
  stage,
  dock,
}: {
  stage: ReactNode;
  /** Always-visible bottom chrome (taskbar + player). */
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
      <div className="app-dock" role="complementary" aria-label="Playback and navigation">
        {dock}
      </div>
    </div>
  );
}
