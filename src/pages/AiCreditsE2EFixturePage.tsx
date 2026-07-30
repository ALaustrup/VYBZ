import { AiCreditsPage } from "@/features/costs/AiCreditsPage";

/** Playwright shell — seeded low prepaid balance + ledger. */
export function AiCreditsE2EFixturePage() {
  return (
    <div className="min-h-[100dvh] bg-ink text-snow" data-testid="ai-credits-e2e-fixture">
      <AiCreditsPage seedDemo />
    </div>
  );
}
