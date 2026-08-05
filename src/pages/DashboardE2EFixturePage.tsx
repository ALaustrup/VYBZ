import { CommandDashboard } from "@/components/dashboard/CommandDashboard";

/**
 * Renders the real command dashboard with no backend reachable, which exercises the
 * empty-account path end to end: every loader falls back to an empty result and the
 * surface must offer a first scan rather than fabricate figures.
 *
 * The derivation logic itself is covered by `src/lib/dashboardModel.test.ts`.
 * Never reaches production — see `src/app/e2eFixtures.tsx`.
 */
export function DashboardE2EFixturePage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4" data-testid="dashboard-fixture">
      <CommandDashboard />
    </div>
  );
}
