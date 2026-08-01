import type { ReactElement } from "react";
import { DynamicBackground } from "@/components/DynamicBackground";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { FLAGS } from "@/lib/flags";
import { StorefrontOrdersE2EFixturePage } from "@/pages/StorefrontOrdersE2EFixturePage";
import { CostSentinelE2EFixturePage } from "@/pages/CostSentinelE2EFixturePage";
import { MasteringE2EFixturePage } from "@/pages/MasteringE2EFixturePage";
import { AiCreditsE2EFixturePage } from "@/pages/AiCreditsE2EFixturePage";
import { CollabSessionsE2EFixturePage } from "@/pages/CollabSessionsE2EFixturePage";
import { ShellOrbE2EFixturePage } from "@/pages/ShellOrbE2EFixturePage";

/**
 * Playwright / Lighthouse fixture shells. These render seeded data and deliberately
 * bypass auth and backend gates, so they must never reach a production bundle.
 *
 * The only caller guards on `VITE_E2E_FIXTURES === "on"`, which Vite inlines at build
 * time. In a production build the guard folds to `false` and this module is tree-shaken
 * away. `scripts/check-no-e2e-fixtures.mjs` asserts that in CI.
 */
export function resolveE2eFixture(pathname: string): ReactElement | null {
  switch (pathname) {
    case "/__e2e__/mastering":
      return <MasteringE2EFixturePage />;
    case "/__e2e__/cost-sentinel":
      return <CostSentinelE2EFixturePage />;
    case "/__e2e__/ai-credits":
      return <AiCreditsE2EFixturePage />;
    case "/__e2e__/collab":
      return <CollabSessionsE2EFixturePage />;
    case "/__e2e__/shell":
      return <ShellOrbE2EFixturePage />;
    case "/__e2e__/storefront-orders":
      return FLAGS.storefront ? <StorefrontOrdersE2EFixtureShell /> : null;
    default:
      return null;
  }
}

function StorefrontOrdersE2EFixtureShell() {
  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <div className="min-h-[100dvh] bg-abyss-950/80">
        <StorefrontOrdersE2EFixturePage />
      </div>
    </>
  );
}
