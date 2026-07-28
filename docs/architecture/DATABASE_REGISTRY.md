# Database Registry

## Migration inventory (newest first)

| Migration | Status | Notes |
|-----------|--------|-------|
| `20260728_0080_storefront_packs` | **keep** | Market packs/orders + buckets + RLS |
| `20260728_0079_visual_generate_spend` | **keep** | Vc spend + events for stills |
| `20260728_0078_site_visuals_public_bucket` | **keep** | Public CDN bucket |
| `20260728_0077_alpha_waitlist` | **keep** | Waitlist |
| `20260728_0076_audio_assets_supabase_backend` | **keep** | Storage-origin audio |
| `20260728_0075` … `20260727_*` | **keep** | Vc, social, live goals, etc. |
| `20260725_0066_love_meetup_spark` | **keep schema** | Demoted product surface; do not expand UX |
| `20260724_0062` / `0061` unified social live | **keep** | LiveKit SFU foundations |
| `20260724_0060` / `0059` music repos | **keep** | Studio CAS core |
| `20260724_0058` … `20260709_0001` | **keep** | Platform spine |
| Bunny-oriented paths in older migrations / EFs | **dormant** | Superseded by Storage doctrine; do not revive |

## Status legend

- **keep** — active Suite foundation
- **keep schema** — tables remain; product chrome demoted
- **supersede-by-additive** — future Suite tables extend; never reset
- **dormant** — code/paths unused; leave in place

## Planned Suite tables

See [`DATA_ARCHITECTURE.md`](./DATA_ARCHITECTURE.md). First additive release schema arrives Phase 2 (Prepare).

## Rules

No greenfield DB · no second project · destructive DDL needs backup + human approval ·
every new table: ownership, RLS, timestamps, audit hook, idempotency for external ops.
