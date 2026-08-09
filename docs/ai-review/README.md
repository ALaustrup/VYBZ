# AI review pipeline

Internal **engineering infrastructure** — not a product feature. Continuous improvement only; never autonomous product changes.

**Hard boundary:** Review artifacts record *what was seen*. They are **not** implementation instructions. **artifact ≠ build order.**

## Stages

### Stage 1 — Secure, read-only review

Fixture-only portal (never deployable):

```bash
npm run ai-review
```

Open [http://127.0.0.1:4173/__e2e__/ai-review](http://127.0.0.1:4173/__e2e__/ai-review).

- Real suite chrome + alpha surfaces  
- Mock non-admin member (`@aireviewer`)  
- Banner: read-only / no secrets  
- `window.__VYBZ_AI_REVIEW__` MACHINE manifest  

Gated by `VITE_E2E_FIXTURES=on` (`npm run build:e2e` only). Production builds must pass `npm run check:no-fixtures`.

### Stage 2 — Versioned observation artifacts

After inspecting Stage 1, write a run under [`runs/`](./runs/) using [`SCHEMA.md`](./SCHEMA.md). List it in [`INDEX.md`](./INDEX.md).

Do **not** put patches, tickets, or “do this next” imperatives in the run file.

### Stage 3 — Cursor plans; explicit approval before code

1. Owner sets a run to `accepted_for_planning` if it may seed a plan.  
2. Cursor may read that run and draft a **plan** (cite artifact id + observations).  
3. **Stop.** No implementation until the owner explicitly authorises (e.g. “implement the plan”).  
4. Authorities remain Masterplan / AGENTS / ARCHITECTURE / STATUS / IDEAS_BACKLOG — never these artifacts.

Cursor rule: `.cursor/rules/ai-review-pipeline.mdc`.

## What this is not

- A production URL or suite nav item  
- Auto-PRs / auto-commits  
- A live Auth “AI reviewer” product account  
- A substitute for IDEAS_BACKLOG authorisation  
