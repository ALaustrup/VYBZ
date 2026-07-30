import { Route, Routes } from "react-router-dom";
import { BrandLockup } from "@/components/Brand";
import { DynamicBackground } from "@/components/DynamicBackground";
import { GrainOverlay } from "@/components/GrainOverlay";
import { PlatformProvider } from "@/platform/bridge/PlatformProvider";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { DesktopBatchPanel } from "@/features/processing/DesktopBatchPanel";
import { WaveformPreviewPage } from "@/pages/WaveformPreviewPage";

/** Unsigned / e2e shell for Desktop-only routes (Phase 12). */
export function DesktopLocalApp() {
  return (
    <PlatformProvider>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <GrainOverlay />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <BrandLockup />
          <p className="text-xs text-fog">Desktop · local</p>
        </header>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/desktop/process" element={<DesktopBatchPanel />} />
            <Route path="/desktop/waveform" element={<WaveformPreviewPage />} />
          </Routes>
        </main>
      </div>
    </PlatformProvider>
  );
}

export function isDesktopLocalPath(pathname: string): boolean {
  return pathname === "/desktop/process" || pathname === "/desktop/waveform";
}
