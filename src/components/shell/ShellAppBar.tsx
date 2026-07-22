import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { surfaceForPath } from "@/lib/surfaceTheme";
import { YouChip } from "@/components/OrbDock";

/**
 * Minimal sticky top chrome (3A). Holds surface label + You controls so content
 * no longer reserves pr-14 for a floating avatar. 3B will expand this into a
 * full ContextualAppBar with back/actions/More.
 */
export function ShellAppBar({ leading, trailing }: { leading?: ReactNode; trailing?: ReactNode }) {
  const { pathname } = useLocation();
  const surface = surfaceForPath(pathname);

  return (
    <header className="app-bar shrink-0">
      <div className="app-bar-inner">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leading}
          <p className="truncate font-display text-[15px] font-semibold tracking-tight text-white/90">
            {surface.label}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {trailing}
          <YouChip />
        </div>
      </div>
    </header>
  );
}
