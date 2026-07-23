import type { ReactNode } from "react";
import { ContextualAppBar } from "@/components/shell/ContextualAppBar";
import { useMediaQuery } from "@/lib/useMediaQuery";

export type TaskbarPlacement = "dock" | "rail";

/**
 * App-like chrome wrapper. Sticky ContextualAppBar, scroll stage, player dock.
 * Mobile: Taskbar in the bottom dock. Desktop (lg+): same Taskbar in a left rail.
 * Does not alter Orb / pin behavior — placement only.
 */
export function AppChrome({
  stage,
  player,
  taskbar,
}: {
  stage: ReactNode;
  player: ReactNode;
  taskbar: (placement: TaskbarPlacement) => ReactNode;
}) {
  const rail = useMediaQuery("(min-width: 1024px)");

  return (
    <div className={rail ? "app-shell app-shell--rail" : "app-shell"}>
      {rail && <aside className="app-rail">{taskbar("rail")}</aside>}
      <div className="app-shell-main">
        <ContextualAppBar />
        <main className="app-stage">
          <div className="app-stage-inner">{stage}</div>
        </main>
        <div className="app-dock">
          {player}
          {!rail && taskbar("dock")}
        </div>
      </div>
    </div>
  );
}
