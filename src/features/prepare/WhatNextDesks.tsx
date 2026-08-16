import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { NextDeskStep } from "@/features/prepare/nextDeskFromFindings";

/**
 * OR-035 — measured next-desk chips from finding codes (no invented scores).
 */
export function WhatNextDesks({
  steps,
  title = "What next",
  className,
}: {
  steps: NextDeskStep[];
  title?: string;
  className?: string;
}) {
  if (steps.length === 0) return null;

  return (
    <div className={className} data-testid="what-next-desks">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
        {title}
      </p>
      <ul className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <li key={`${step.desk}:${step.code}`}>
            <Link
              to={step.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--app-accent-rgb)/0.35)] bg-[rgb(var(--app-accent-rgb)/0.1)] px-3 py-1.5 text-[12px] text-white/85 transition hover:border-[rgb(var(--app-accent-rgb)/0.55)] hover:text-white"
              data-testid={`what-next-desk-${step.desk}`}
              title={step.code}
            >
              {step.label}
              <ArrowRight className="h-3 w-3 opacity-70" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-white/35">
        From open issues only. Not a score.
      </p>
    </div>
  );
}
