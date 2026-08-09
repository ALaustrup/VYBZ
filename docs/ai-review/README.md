# AI review pipeline

Internal **engineering infrastructure** — not a product feature. Continuous improvement only; never autonomous product changes.

**Hard boundary:** Review artifacts record *what was seen*. They are **not** implementation instructions. **artifact ≠ build order.**

Website review is the first **Perception Engine** module. Engine doctrine and roadmap: [`docs/perception/README.md`](../perception/README.md).

## Stages

### Stage 1a — Secure, read-only fixture portal

```bash
npm run ai-review
```

Open [http://127.0.0.1:4173/__e2e__/ai-review](http://127.0.0.1:4173/__e2e__/ai-review).

- Real suite chrome + alpha surfaces  
- Mock non-admin member (`@aireviewer`)  
- Banner: read-only / no secrets  
- `window.__VYBZ_AI_REVIEW__` MACHINE manifest  
- **JSON endpoint (agents):** `GET http://127.0.0.1:4173/e2e/ai-review` → full MACHINE manifest (`Content-Type: application/json`), including `surfaces[]` with fixture paths. Served by Vite preview middleware only — **not** on production.

Gated by `VITE_E2E_FIXTURES=on` (`npm run build:e2e` only). Production builds must pass `npm run check:no-fixtures`.

### Stage 1b — Live production walker

Read-only Playwright walk against production (default `https://vybz.cloud`):

```bash
# Required env (never commit):
#   AI_REVIEW_EMAIL
#   AI_REVIEW_PASSWORD
# Optional:
#   REVIEW_BASE_URL=https://vybz.cloud

npm run ai-review:prod
```

- Non-admin demo account with alpha access  
- Writes SCHEMA run markdown + `.observations.json` under `runs/`  
- Updates `observations/catalog.json` + `INDEX.md`  
- Screenshots under `runs/assets/` (**gitignored**)  
- Does **not** auto-commit  

Fail closed if credentials are missing or login fails.

### Stage 1c — Public HTTPS manifest (remote agents / Grok)

Grok and other cloud agents cannot reach `127.0.0.1`. Use production:

```http
GET https://vybz.cloud/api/ai-review/manifest
Authorization: Bearer <AI_REVIEW_AGENT_TOKEN>
```

- Returns MACHINE-style JSON with **live product** `surfaces[]` (`/library`, `/releases`, …)  
- **Never** includes `/__e2e__/*` fixture paths  
- Token is a Vercel server env (`AI_REVIEW_AGENT_TOKEN`) — **not** `VITE_*`, never commit  
- Fail closed (`401`) if token missing/wrong  
- Read-only surface map only — does not bypass alpha login for HTML pages  

Local equivalent remains `GET http://127.0.0.1:4173/e2e/ai-review` (fixture paths, Vite preview).

### Ingest agent (Grok) output → SCHEMA run

Do **not** leave reviews only in chat. Pipe them into the catalog:

```bash
# Preferred: structured JSON in docs/ai-review/inbox/
npm run ai-review:ingest -- --file docs/ai-review/inbox/YYYY-MM-DD-prod-grok-unauth.input.json

# Or paste Grok prose (id: / evidence: blocks):
npm run ai-review:ingest -- --file path/to/grok-paste.txt --run-id YYYY-MM-DD-prod-grok-unauth
```

Writes `runs/<id>.md` + `.observations.json`, merges `observations/catalog.json`, updates `INDEX.md`. Status stays **`draft`** until the owner sets `accepted_for_planning`. Does **not** auto-commit.

### Authenticated walk (suite chrome)

Signed-out passes cannot see Library/Correct/Stems/etc. For authenticated observations:

```bash
# Non-admin demo account with alpha_access_at (never commit):
#   AI_REVIEW_EMAIL / AI_REVIEW_PASSWORD
npm run ai-review:prod
```

Then ingest any Grok narrative the same way, or rely on the walker sidecar JSON.

### Scheduling (later — not authorised yet)

Cron / CI for Stage 1b–1c is **parked**. Keep runs `draft` until the owner accepts. No auto-planning or auto-implementation.

### Stage 2 — Versioned observation artifacts

After Stage 1a/1b/ingest, ensure the run uses [`SCHEMA.md`](./SCHEMA.md) and is listed in [`INDEX.md`](./INDEX.md).

Do **not** put patches, tickets, or “do this next” imperatives in the run file.

### Stage 3 — Cursor plans; explicit approval before code

1. Owner sets a run to `accepted_for_planning` if it may seed a plan.  
2. Cursor may read that run and draft a **plan** (cite artifact id + **observation IDs** + origin).  
3. **Stop.** No implementation until the owner explicitly authorises (e.g. “implement the plan”).  
4. Authorities remain Masterplan / AGENTS / ARCHITECTURE / STATUS / IDEAS_BACKLOG — never these artifacts.

Cursor rules: `.cursor/rules/ai-review-pipeline.mdc`, `.cursor/rules/perception-engine.mdc`.

## What this is not

- A production URL or suite nav item  
- Auto-PRs / auto-commits / auto-implementation  
- A substitute for IDEAS_BACKLOG authorisation  
- Audio/image perception (stubs only in the engine — see perception roadmap)  
