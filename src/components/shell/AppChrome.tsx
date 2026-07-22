import type { ReactNode } from "react";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";

/**
 * App-like chrome wrapper. Owns shell CSS tokens, sticky ContextualAppBar,
 * scroll stage, and reserved bottom stack for GlobalPlayer + Taskbar.
 * Does not alter Taskbar / Orb behavior — only placement in the column.
 */
export function AppChrome({
  stage,
  player,
  taskbar,
}: {
  stage: ReactNode;
  player: ReactNode;
  taskbar: ReactNode;
}) {
  return (
    <div className="app-shell">
      <ContextualAppBar />
      <main className="app-stage">
        <div className="app-stage-inner">{stage}</div>
      </main>
      <div className="app-dock">
        {player}
        {taskbar}
      </div>
    </div>
  );
}
