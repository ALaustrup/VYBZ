import { useState } from "react";
import { DynamicBackground } from "@/components/DynamicBackground";
import { PlatformProvider } from "@/platform/bridge/PlatformProvider";
import { SuiteShell } from "@/shell/SuiteShell";
import { BRAND_BG } from "@/lib/surfaceTheme";

/**
 * Renders the real SuiteShell — and therefore the real OrbMenu and command
 * palette — without the auth gate, so navigation can be exercised in Playwright
 * and inspected visually. The stage content is deliberately inert; this fixture
 * exists to test the shell, not a page.
 *
 * The compose and bulk handlers record that they fired rather than opening the
 * real sheets, so a test can prove the palette invoked the right action.
 */
export function ShellOrbE2EFixturePage() {
  const [fired, setFired] = useState<string[]>([]);

  return (
    <PlatformProvider>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <SuiteShell
        showCommandBar
        onCompose={() => setFired((f) => [...f, "compose"])}
        onBulkUpload={() => setFired((f) => [...f, "bulk"])}
        stage={
          <div className="flex flex-col gap-4 py-8" data-testid="shell-fixture-stage">
            <h1 className="font-display text-2xl font-semibold text-snow">Shell harness</h1>
            <p className="max-w-prose text-sm text-fog">
              The orb below is the only navigation surface. It is collapsed by default and
              opens on hover with a pointer, or on tap.
            </p>
            <p data-testid="shell-fixture-fired">{fired.join(",")}</p>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="rounded-suite border border-[var(--hairline)] bg-white/[0.03] p-6 text-sm text-fog"
              >
                Scroll region {i + 1}
              </div>
            ))}
          </div>
        }
        dock={<div className="h-[5.25rem] w-full" aria-hidden />}
      />
    </PlatformProvider>
  );
}
