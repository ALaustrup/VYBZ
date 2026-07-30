import { CostSentinelDashboardPage } from "@/features/costs/CostSentinelDashboardPage";
import { BrandLockup } from "@/components/Brand";
import { DynamicBackground } from "@/components/DynamicBackground";
import { GrainOverlay } from "@/components/GrainOverlay";
import { BRAND_BG } from "@/lib/surfaceTheme";

/** Playwright fixture — seeded chart + ≥90% cap banner without auth. */
export function CostSentinelE2EFixturePage() {
  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <GrainOverlay />
      <div className="relative z-10 min-h-[100dvh]" data-testid="cost-sentinel-e2e-fixture">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <BrandLockup />
          <p className="text-xs text-fog">Cost Sentinel · e2e</p>
        </header>
        <CostSentinelDashboardPage seedDemo />
      </div>
    </>
  );
}
