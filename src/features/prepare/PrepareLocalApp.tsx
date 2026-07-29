import { Navigate, Route, Routes } from "react-router-dom";
import { BrandLockup } from "@/components/Brand";
import { DynamicBackground } from "@/components/DynamicBackground";
import { GrainOverlay } from "@/components/GrainOverlay";
import { PlatformProvider } from "@/platform/bridge/PlatformProvider";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { ReleasesPage } from "@/features/prepare/ReleasesPage";
import { NewReleasePage } from "@/features/prepare/NewReleasePage";
import { ReleaseDetailPage } from "@/features/prepare/ReleaseDetailPage";
import { ReleaseCreditsPage } from "@/features/credits/ReleaseCreditsPage";

/**
 * Minimal Prepare shell for unsigned / backend-local flows.
 * Same routes as Suite Prepare; local repository for hard-refresh durability.
 */
export function PrepareLocalApp() {
  return (
    <PlatformProvider>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <GrainOverlay />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <BrandLockup />
          <p className="text-xs text-fog">Prepare · local drafts</p>
        </header>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/releases" element={<ReleasesPage />} />
            <Route path="/releases/new" element={<NewReleasePage />} />
            <Route path="/release/:id" element={<ReleaseDetailPage />} />
            <Route path="/release/:id/credits" element={<ReleaseCreditsPage />} />
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
