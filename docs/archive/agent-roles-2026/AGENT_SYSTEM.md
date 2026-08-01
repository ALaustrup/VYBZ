> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Agent System — Suite Genesis

> How specialized agents collaborate on VYBZ. Product authority: `VYBZ_MASTERPLAN.md`.

## Roles

| Agent | Doc | Owns |
|-------|-----|------|
| Product | [`PRODUCT_AGENT.md`](./PRODUCT_AGENT.md) | Scope, lifecycle, non-goals |
| Architect | [`ARCHITECT_AGENT.md`](./ARCHITECT_AGENT.md) | Boundaries, inventories, ADRs |
| Implementation | [`IMPLEMENTATION_AGENT.md`](./IMPLEMENTATION_AGENT.md) | Code in SPA / EF / SQL |
| Security | [`SECURITY_AGENT.md`](./SECURITY_AGENT.md) | RLS, secrets, threat review |
| Cost | [`COST_AGENT.md`](./COST_AGENT.md) | ProviderMode, reservations, caps |
| QA | [`QA_AGENT.md`](./QA_AGENT.md) | Gates, smoke, test plans |
| Documentation | [`DOCUMENTATION_AGENT.md`](./DOCUMENTATION_AGENT.md) | Manifest, short authoritative docs |
| Release | [`RELEASE_AGENT.md`](./RELEASE_AGENT.md) | Checklist, tags, deploy notes |

## Workflow

```text
Product intent → Architect plan → Cost+Security review → Implementation → QA → Docs → Release
```

Prompts: [`PROMPT_CONTRACTS.md`](./PROMPT_CONTRACTS.md).

## Human gates (never agent-solo)

- Spend / vendor upgrades / secret application
- Production release tag (Beta-1A)
- Destructive data ops / restore overwrite
- Enabling Bunny or paid providers above free/prepaid defaults
- Committing creative approvals (splits, rights, distribution submit)

## Hard laws

No greenfield rewrite · no second DB/auth · Storage+LiveKit only · no unbounded paid calls ·
Masterplan wins over legacy chrome.
