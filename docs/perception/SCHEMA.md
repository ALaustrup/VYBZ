# Perception Engine schema

**Outputs are observations and relationships, not implementation instructions.**

## Observation

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Deterministic `{surface}.{slug}` (e.g. `library.empty-state`) |
| `surface` | yes | Surface / module surface id |
| `category` | yes | e.g. `empty-state`, `chrome`, `copy`, `nav`, `gate` |
| `severity` | yes | `info` \| `notice` \| `attention` \| `blocking` |
| `confidence` | yes | `high` \| `medium` \| `low` |
| `evidence` | yes | Refs: screenshot path, truncated body sample, URL |
| `lifecycle` | yes | `new` \| `seen` \| `regressed` \| `resolved` \| `stale` |
| `summary` | yes | One-line factual note |
| `origin` | yes | See below |
| `firstSeenRun` / `lastSeenRun` | yes | Run ids for history |
| `appSha` | yes | SHA when known, else `Not measured` |
| `entityId` | no | **Reserved** — see Entity layer |

### Origin

| Field | Meaning |
|---|---|
| `detector` | Stable detector name (`web.page-chrome`) |
| `version` | Semver of detector contract |
| `sourceType` | `web` \| `audio` \| `image` \| `manual` \| `system` |

## PerceptionContext

Scopes catalog and graph so cross-project queries stay simple later.

| Field | Meaning |
|---|---|
| `projectId` | Workspace / product key (`vybz-app`) |
| `artifactId` | Subject (run id, release id, …) |
| `version` | Version or SHA; else `Not measured` |
| `sessionId` | One walk / analysis session |

## Perception Graph

Typed edges between observation IDs (and later entity IDs):

`depends_on` · `contains` · `same_as` · `derived_from` · `stem_of` · `related_media` · `blocks` · `relates_to`

Edge id is deterministic from `(from, to, relation)`. Each edge carries `origin` + confidence. Graph merge is additive and context-scoped by the caller.

## Entity layer (reserved)

**Not implemented in Phase 2.** Light contract only:

```ts
interface PerceptionEntity {
  id: string;
  kind: 'project' | 'release' | 'stem' | 'surface' | 'media' | 'unknown';
  label?: string;
}
```

**How observations attach later:** set optional `Observation.entityId` to a `PerceptionEntity.id`. Graph edges may then use entity ids as `from`/`to`. Do not invent entity registries or persistence until owner-authorised.

## ModelProvider

Pluggable. Domain code must not hard-code a vendor. Phase 2 ships `NoopModelProvider` only.

`ReasoningTier`: `none` \| `free` \| `premium` (billing UI out of scope).

Pipeline invariant: detect → catalog → graph **before** any `reason()` call.

## Forbidden

- Implementation instructions, patches, tickets  
- Secrets / PII  
- Unverified metrics (Law 1 — say `Not measured`)  
- Auto-planning or auto-implementation from perception output  
