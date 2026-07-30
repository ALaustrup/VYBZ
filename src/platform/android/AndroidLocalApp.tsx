import { Route, Routes } from "react-router-dom";
import { BrandLockup } from "@/components/Brand";
import { DynamicBackground } from "@/components/DynamicBackground";
import { GrainOverlay } from "@/components/GrainOverlay";
import { PlatformProvider } from "@/platform/bridge/PlatformProvider";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { AndroidBetaPage } from "@/pages/AndroidBetaPage";

/** Unsigned / e2e shell for Android Beta routes (Phase 13). */
export function AndroidLocalApp() {
  return (
    <PlatformProvider>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <GrainOverlay />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <BrandLockup />
          <p className="text-xs text-fog">Android · local</p>
        </header>
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/mobile/uploads" element={<AndroidBetaPage />} />
            <Route path="/android/beta" element={<AndroidBetaPage />} />
          </Routes>
        </div>
      </div>
    </PlatformProvider>
  );
}

export function isAndroidLocalPath(pathname: string): boolean {
  return pathname === "/mobile/uploads" || pathname === "/android/beta";
}
