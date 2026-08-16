import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isPackPipelinePath } from "@/features/packPipeline/stages";
import { cx } from "@/lib/utils";
import { activeSuiteAppId } from "@/shell/suiteApps";

/**
 * Suite stage mount — Wave R0.
 * Hosts route content and exposes active suite app via parent data-suite-app
 * (set on SuiteShell). Keeps dock-reserve padding on the inner scroll surface.
 */
export function SuiteStage({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const pack = isPackPipelinePath(pathname);
  return (
    <main
      className={cx("suite-stage suite-stage-frame", pack && "suite-stage--pack")}
      data-testid="suite-stage"
    >
      <ErrorBoundary>
        <div className="suite-stage-inner">{children}</div>
      </ErrorBoundary>
    </main>
  );
}

/** Active suite app id for the current pathname (null if none). */
export function useActiveSuiteAppId() {
  const { pathname } = useLocation();
  return activeSuiteAppId(pathname);
}
