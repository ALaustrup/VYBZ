/** Job state machine — see docs/architecture/JOB_SYSTEM.md */
export type JobState =
  | "draft"
  | "validating"
  | "awaiting_cost"
  | "cost_reserved"
  | "queued"
  | "running"
  | "review_required"
  | "completed"
  | "cancelled"
  | "failed_retryable"
  | "failed_terminal"
  | "expired";

export interface AutomationJob {
  id: string;
  type: string;
  state: JobState;
  ownerId: string;
  projectId?: string;
  releaseId?: string;
  inputHashes?: string[];
  provider?: string;
  providerJobId?: string;
  estimatedCostCents?: number;
  reservedCostCents?: number;
  actualCostCents?: number;
  retryCount: number;
  idempotencyKey: string;
  outputs?: Record<string, unknown>;
  failureReason?: string;
  auditRefs?: string[];
  createdAt: string;
  updatedAt: string;
}
