# VYBZ

> **Find Yours.**

VYBZ is an **identity-first** creator social, collaboration, and precision
matchmaking platform — for music, art, film, writing, game design, and every
creative discipline. Owner: **Astra Matrix, Inc.** Canonical domain:
**`vybz.cloud`**.

**VYBZ has no anonymity.** Every account is a real, durable creator identity.

> 📐 See [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) for the product + engineering
> plan, and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the technical map.

## What's shipped

- **Passkey-first auth** with password fallback, then username claim → Role + Intent onboarding (optional avatar).
- **Creator profiles** — role/intents mapped into `profile_modules` + complementary seeks for matchmaking; genres, DAWs, plugins, influences.
- **Precision matchmaking** — `collab_matches` v5 (roles, modules, affinity, embeddings, Space follows, reputation) on **Connect** + **Spark**.
- **Spaces** (public microblogs on your profile) and **Studio** (private collab rooms with versions, splits, credits).
- **Sound-first feed** of drops + Space posts (audio / image / video / writing), discovery anti-popularity mode.
- **Connections + DMs**, Rooms, Opportunities, Activity (accept/decline connections).
- **Bunny-protected media** (secure originals + signed previews; forensic watermark path).
- **Staff / mod** queue + rewards → **cosmetic store** (Lane B).
- **Codex & Legal** — free industry templates + Terms / Privacy / DMCA / AUP.

## Local development

```bash
npm install
cp .env.example .env.local   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Requires Node ≥ 20. Production deploys via Vercel project **`astramatrix/vybz`**
(GitHub [`ALaustrup/VYBZ`](https://github.com/ALaustrup/VYBZ) → `main`). Canonical host: **vybz.cloud**
(preview: `vybz-astramatrix.vercel.app`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
as project env vars. Auth redirect allowlist includes `https://vybz.cloud/**`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | `tsc --noEmit` |
| `scripts/deploy.sh` | Migrations + Edge Functions + Vercel |
| `scripts/activate-vybz-domains.sh` | Point parked GoDaddy satellite domains at Vercel |

## Satellite domains

The satellite domains **`vybz.work`**, **`vybz.space`**, **`vybz.world`**,
**`vybz.guru`**, and **`vybz.cc`** are registered at GoDaddy and each already has
a **308 redirect → `vybz.cloud`** configured on the Vercel project. Activating
them only requires repointing their GoDaddy DNS at Vercel (apex `A → 76.76.21.21`,
matching the canonical `vybz.cloud`). Run:

```bash
export GODADDY_API_KEY="..." GODADDY_API_SECRET="..."   # PRODUCTION keys
export VERCEL_TOKEN="..."                                # optional: post-write verification
DRY_RUN=1 bash scripts/activate-vybz-domains.sh          # preview first
bash scripts/activate-vybz-domains.sh                    # apply
```

The script is idempotent and verifies each record after writing. GoDaddy keys are
created at <https://developer.godaddy.com/keys> (use the **Production** key/secret).

## License

Proprietary — Astra Matrix, Inc. All rights reserved.
