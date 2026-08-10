import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { activeSuiteAppId } from "@/shell/suiteApps";

/**
 * Suite stage mount — Wave R0.
 * Hosts route content and exposes active suite app via parent data-suite-app
 * (set on SuiteShell). Keeps dock-reserve padding on the inner scroll surface.
 */
export function SuiteStage({ children }: { children: ReactNode }) {
  return (
    <main className="suite-stage suite-stage-frame" data-testid="suite-stage">
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
