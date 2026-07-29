# Migrations

## Rules

1. **Additive only** — no destructive drops on production data without owner + backup plan.
2. Files under `supabase/migrations/` with timestamp prefixes (`YYYYMMDD_NNNN_*.sql`).
3. Newest Suite refs: `0079` visual_generate_spend · `0080` storefront_packs.
4. Pair schema with RLS; never rely on client-only checks.
5. Apply to project `xixmneooyufbeftdfpcm` only.

## Workflow

```bash
# Prefer reviewed SQL in repo, then apply via CLI or Dashboard SQL
npx supabase db push --project-ref xixmneooyufbeftdfpcm
# or: supabase migration up (local stack when used)
```

1. Draft migration + RLS notes.
2. Review for SECURITY DEFINER `search_path` and `REVOKE` from `anon` where JWT-only.
3. Apply staging/branch if available; else careful prod apply with owner gate.
4. Redeploy Edge functions if they depend on new tables/RPCs.
5. Note in CHANGELOG.

## Registry

Table inventory: [`../architecture/DATABASE_REGISTRY.md`](../architecture/DATABASE_REGISTRY.md).
RLS patterns: [`RLS_POLICY_GUIDE.md`](./RLS_POLICY_GUIDE.md).
