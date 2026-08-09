import type { PerceptionContext } from "./context";
import type { Observation, PerceptionEdge } from "./types";

/**
 * Reasoning tier contract (billing UI out of scope).
 * Free = basic analysis; Premium = deeper comparisons / mentoring.
 */
export type ReasoningTier = "none" | "free" | "premium";

export interface PerceptionBundle {
  context: PerceptionContext;
  observations: Observation[];
  edges: PerceptionEdge[];
}

/** Descriptive analysis only — never patches or build orders. */
export interface ReasoningResult {
  narrative?: string;
  comparisons?: string[];
  mentoring?: string[];
  tier: ReasoningTier;
  providerId: string;
}

/**
 * Pluggable model — implementation detail, not product IP.
 * Domain code must not hard-code a vendor.
 */
export interface ModelProvider {
  id: string;
  reason(input: PerceptionBundle, tier: ReasoningTier): Promise<ReasoningResult>;
}

/** Default provider for Phase 2 — no network, no LLM. */
export class NoopModelProvider implements ModelProvider {
  readonly id = "noop";

  async reason(
    _input: PerceptionBundle,
    tier: ReasoningTier,
  ): Promise<ReasoningResult> {
    return {
      tier,
      providerId: this.id,
    };
  }
}
