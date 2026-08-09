import { Link } from "react-router-dom";
import { AI_REVIEW_MANIFEST, AI_REVIEW_SURFACES } from "@/app/aiReview/machineManifest";

/**
 * Agent-facing index. Structural only — not a product report.
 */
export function AiReviewHub() {
  return (
    <div className="space-y-6 py-6" data-testid="ai-review-hub">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Engineering · Stage 1
        </p>
        <h1 className="font-display text-2xl font-semibold text-snow">AI review portal</h1>
        <p className="max-w-prose text-sm text-fog">
          Read-only fixture environment for inspecting alpha-tester surfaces. Review artifacts
          written afterward are <strong className="text-white/80">observations</strong>, not
          implementation instructions. See <code className="text-white/70">docs/ai-review/</code>.
        </p>
      </header>

      <section className="rounded-suite border border-[var(--hairline)] bg-white/[0.03] p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">Surfaces</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {AI_REVIEW_SURFACES.filter((s) => s.id !== "hub").map((s) => (
            <li key={s.id}>
              <Link
                to={s.path}
                className="block rounded-xl border border-white/[0.06] px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <span className="font-medium text-white/90">{s.id}</span>
                <span className="mt-0.5 block text-[11px] text-white/40">{s.purpose}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-suite border border-[var(--hairline)] bg-black/30 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
          MACHINE manifest
        </h2>
        <p className="mt-1 text-[11px] text-white/35">
          Also on <code>window.__VYBZ_AI_REVIEW__</code>
        </p>
        <pre
          className="mt-3 max-h-64 overflow-auto text-[10px] leading-relaxed text-white/55"
          data-testid="ai-review-manifest-json"
        >
          {JSON.stringify(AI_REVIEW_MANIFEST, null, 2)}
        </pre>
      </section>
    </div>
  );
}
