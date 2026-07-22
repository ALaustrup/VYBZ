import type { ReactNode } from "react";
import { ShellAppBar } from "@/components/shell/ShellAppBar";

/**
 * App-like chrome wrapper (Step 3A). Owns shell CSS tokens, sticky top bar,
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
      <ShellAppBar />
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
