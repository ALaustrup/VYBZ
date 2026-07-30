import { BrandLockup } from "@/components/Brand";
import { DynamicBackground } from "@/components/DynamicBackground";
import { GrainOverlay } from "@/components/GrainOverlay";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { ReleaseMasterPane } from "@/features/mastering/ReleaseMasterPane";

/** Playwright fixture — Analyze & Master without auth. */
export function MasteringE2EFixturePage() {
  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <GrainOverlay />
      <div className="relative z-10 min-h-[100dvh]" data-testid="mastering-e2e-fixture">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <BrandLockup />
          <p className="text-xs text-fog">AI Mastering · e2e</p>
        </header>
        <ReleaseMasterPane e2eMode projectId="e2e-release" />
      </div>
    </>
  );
}
