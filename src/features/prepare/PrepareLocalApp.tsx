import { Navigate, Route, Routes, Link } from "react-router-dom";
import { BrandMark } from "@/components/Brand";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";
import { PlatformProvider } from "@/platform/bridge/PlatformProvider";
import { ReleasesPage } from "@/features/prepare/ReleasesPage";
import { NewReleasePage } from "@/features/prepare/NewReleasePage";
import { ReleaseDetailPage } from "@/features/prepare/ReleaseDetailPage";
import { ReleaseCreditsPage } from "@/features/credits/ReleaseCreditsPage";
import { DistributionReportPage } from "@/features/distribution/DistributionReportPage";
import { ReleaseMasterPane } from "@/features/mastering/ReleaseMasterPane";

/**
 * Prepare for signed-out visitors.
 *
 * This is the same product in a reduced mode, not a second app: a signed-out
 * visitor has no catalog, so there is no dock, library or navigation to show.
 * The header says so explicitly, because silently swapping chrome on sign-in
 * reads as two different platforms.
 */
export function PrepareLocalApp() {
  return (
    <PlatformProvider>
      <div
        className="public-scroll-frame public-ops-shell nexus-void relative text-white"
        data-public-shell="prepare"
        data-testid="prepare-local-shell"
      >
        <GeometricBackdrop intensity="subtle" />
        <header className="public-ops-header forge-glass relative z-10 mx-3 mt-3 flex shrink-0 flex-wrap items-center gap-2 px-4 py-3 sm:mx-4">
          <span className="forge-glass-edge" aria-hidden />
          <Link to="/" className="relative z-[1] flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" reactive={false} />
            <span className="font-display text-sm font-semibold text-white">VYBZ</span>
          </Link>
          <span className="public-ops-badge relative z-[1] rounded-full px-2.5 py-1 text-[11px] font-semibold">
            Free scan · signed out
          </span>
          <Link
            to="/enter"
            className="relative z-[1] ml-auto forge-cta-ghost min-h-[2.25rem] px-3 py-1.5 text-xs"
          >
            Sign in for the full suite
          </Link>
        </header>
        <main className="relative z-10 px-3 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
          <Routes>
            <Route path="/releases" element={<ReleasesPage />} />
            <Route path="/releases/new" element={<NewReleasePage />} />
            <Route path="/release/:id" element={<ReleaseDetailPage />} />
            <Route path="/release/:id/credits" element={<ReleaseCreditsPage />} />
            <Route path="/release/:id/distribution" element={<DistributionReportPage />} />
            <Route path="/release/:id/master" element={<ReleaseMasterPane />} />
            <Route path="/start" element={<Navigate to="/releases" replace />} />
            <Route path="*" element={<Navigate to="/releases" replace />} />
          </Routes>
        </main>
      </div>
    </PlatformProvider>
  );
}

export function isPreparePath(pathname: string): boolean {
  return (
    pathname === "/releases" ||
    pathname.startsWith("/releases/") ||
    pathname.startsWith("/release/") ||
    pathname === "/start"
  );
}
