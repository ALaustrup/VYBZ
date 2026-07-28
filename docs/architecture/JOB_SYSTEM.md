# Job System

## State machine

```text
draft → validating → awaiting_cost → cost_reserved → queued → running
  → review_required → completed

Failures: cancelled | failed_retryable | failed_terminal | expired
```

Each job stores: type, owner, project/release, input hashes, provider, provider job id,
estimated/reserved/actual cost, retry count, idempotency key, outputs, failure reason, audit refs.

## Compute router (cheapest valid)

```text
Browser → VYBZ Engine → OVH worker → Edge Function → free external → paid external
```

Factors: privacy, file size, processing need, device capability, quota, entitlement, budget, deadline.

## Deterministic before AI

Use normal code for validation, hashing, measurements, dimensions, conversion, permissions,
cost math, delivery state machines. Use models for explanations, suggestions, copy, concepts,
and classification only when deterministic methods fail.

Implementation lands Phase 1 (model) + product phases (executors). No silent creative commits.
