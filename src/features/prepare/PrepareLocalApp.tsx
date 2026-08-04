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
 * Minimal Prepare shell for unsigned / backend-local flows.
 * Same routes as Suite Prepare; local repository for hard-refresh durability.
 */
export function PrepareLocalApp() {
  return (
    <PlatformProvider>
      <div className="public-scroll-frame nexus-void relative text-white">
        <GeometricBackdrop intensity="subtle" />
        <header className="forge-glass relative z-10 mx-3 mt-3 flex shrink-0 items-center justify-between px-4 py-3 sm:mx-4">
          <span className="forge-glass-edge" aria-hidden />
          <Link to="/" className="relative z-[1] flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" reactive={false} />
            <span className="font-display text-sm font-semibold text-white">VYBZ Prepare</span>
          </Link>
          <Link to="/enter" className="relative z-[1] forge-cta-ghost min-h-[2.25rem] px-3 py-1.5 text-xs">
            Sign in
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
            <Route path="/start" element={<Navigate to="/releases/new" replace />} />
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
