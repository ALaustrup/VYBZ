> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# VYBZ

> **Find Yours.**

VYBZ is the **music home for indie artists and their fans** ΓÇö upload your catalog,
stream on **VDock**, tip with **Vc** (`~username`), and go **live**. Real identity.
No ads. Messaging free forever. Owner: **Astra Matrix, Inc.** Canonical domain:
**`vybz.cloud`**.

**VYBZ has no anonymity.** Every account is a durable creator identity.

> ≡ƒôÉ See [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) for product + GTM doctrine,
> [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the technical map, and
> [`VERSIONING.md`](./VERSIONING.md) for release labels.
>
> **Current release:** **Beta-0B** line ΓÇö launch reposition in progress (see [`CHANGELOG.md`](./CHANGELOG.md)).

## What VYBZ is (launch wedge)

- **Listen** ΓÇö upload drops, stream in VDock, discover by taste.
- **Tip** ΓÇö support artists with closed-loop **Vc**; cosmetics are primary revenue.
- **Live** ΓÇö go live on your profile; chat + presence on the same identity.
- **Identity** ΓÇö email + passkey; artist pages at `/u/:id`.
- **Optional Connection Lab** ΓÇö people matching (including adult-gated intents) only for users who opt in. Never the front door.

Public visitors hit the **marketing landing** (alpha waitlist + Enter VYBZ). Signed-in users land on the **music hub**.

## What's shipped

- **Marketing landing** ΓÇö brand hero, product story, alpha waitlist (Resend launch notify).
- **Passkey-first auth** with password fallback ΓåÆ username ΓåÆ music-first Intent Mix.
- **Hub** ΓÇö Listen / Live / Connect / You / Wallet; artist storefronts `/u/:id`.
- **VDock** ΓÇö always-on player + Orb; cinema stage for live / track visuals.
- **Vc tips** + cosmetic store + Stripe top-ups (tips secondary to Flair).
- **Live** ΓÇö streams, Social hub, room voice (LiveKit).
- **Codex & Legal** ΓÇö industry templates + Terms / Privacy / DMCA / AUP / Vc whitepaper.

## Local development

```bash
npm install
cp .env.example .env.local   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

Requires Node ΓëÑ 20. Production deploys via Vercel project **`astramatrix/vybz`**
(GitHub [`ALaustrup/VYBZ`](https://github.com/ALaustrup/VYBZ) ΓåÆ `main`). Canonical host: **vybz.cloud**
(preview: `vybz-astramatrix.vercel.app`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
as project env vars (production Supabase ref: `xixmneooyufbeftdfpcm`). Auth redirect allowlist includes `https://vybz.cloud/**`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | `tsc --noEmit` |
| `scripts/deploy.sh` | Migrations + Edge Functions + Vercel |
| `scripts/activate-vybz-domains.sh` | Point parked GoDaddy satellite domains at Vercel |
| `scripts/configure-resend-smtp.sh` | Wire Resend SMTP via Management API |
| `scripts/provision-stripe-vybz.sh` | Stripe secrets for Edge |
| `scripts/provision-oauth-turn-tips.sh` | OAuth / TURN / tips provisioning |
| `scripts/setup-vybz-infra.ps1` | Local Phase-0 infra orchestration (Windows) |

## Satellite domains

The satellite domains **`vybz.work`**, **`vybz.space`**, **`vybz.world`**,
**`vybz.guru`**, and **`vybz.cc`** are registered at GoDaddy and each already has
a **308 redirect ΓåÆ `vybz.cloud`** configured on the Vercel project. Activating
them only requires repointing their GoDaddy DNS at Vercel (apex `A ΓåÆ 76.76.21.21`,
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

Proprietary ΓÇö Astra Matrix, Inc. All rights reserved.
