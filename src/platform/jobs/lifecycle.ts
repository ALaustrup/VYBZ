import type { JobState, AutomationJob } from "./types";

const TRANSITIONS: Record<JobState, readonly JobState[]> = {
  draft: ["validating", "cancelled"],
  validating: ["awaiting_cost", "queued", "failed_terminal", "cancelled"],
  awaiting_cost: ["cost_reserved", "cancelled", "failed_terminal"],
  cost_reserved: ["queued", "cancelled", "failed_terminal"],
  queued: ["running", "cancelled", "expired"],
  running: ["review_required", "completed", "failed_retryable", "failed_terminal", "cancelled"],
  review_required: ["completed", "failed_terminal", "cancelled"],
  completed: [],
  cancelled: [],
  failed_retryable: ["queued", "failed_terminal", "cancelled"],
  failed_terminal: [],
  expired: [],
};

export function canTransition(from: JobState, to: JobState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionJob(job: AutomationJob, to: JobState, patch?: Partial<AutomationJob>): AutomationJob {
  if (!canTransition(job.state, to)) {
    throw new Error(`Invalid job transition ${job.state} → ${to}`);
  }
  return {
    ...job,
    ...patch,
    state: to,
    updatedAt: new Date().toISOString(),
  };
}

export function createDraftJob(input: {
  id?: string;
  type: string;
  ownerId: string;
  projectId?: string;
  idempotencyKey: string;
}): AutomationJob {
  const now = new Date().toISOString();
  return {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    state: "draft",
    ownerId: input.ownerId,
    projectId: input.projectId,
    retryCount: 0,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
}

/** Happy-path portable analyze lifecycle: draft → validating → queued → running → completed */
export function runPortableAnalyzeLifecycle(job: AutomationJob): AutomationJob {
  let next = transitionJob(job, "validating");
  next = transitionJob(next, "queued");
  next = transitionJob(next, "running");
  next = transitionJob(next, "completed", { actualCostCents: 0 });
  return next;
}
