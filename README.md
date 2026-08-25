# VYBZ

> **Find Yours.**
> A living place. A social network. Express yourself however you want.

**VYBZ is a premium social network.** Every person gets **My VYBZ** — their living place. They can follow, talk, watch, collect, go live, and create when they want. Creation is optional. Belonging is not. Music is one way to show up, not the product.

Owner: **Astra Matrix, Inc.** Canonical domain: **`vybz.cloud`**.

**One account. Accountable identity, not mandatory public legal identity. No ads. No connection paywalls. Messaging free forever.**

> **One authority:** [`PRODUCT.md`](./PRODUCT.md) — what we are building and what we refuse to build.
> Enforceable rules: [`src/product/invariants.ts`](./src/product/invariants.ts).
> How to work: [`AGENTS.md`](./AGENTS.md) · Where things stand: [`STATE.md`](./STATE.md).
> [`docs/`](./docs/) is reference. [`docs/archive/`](./docs/archive/) is never authoritative.
> Root files named `implementation_plan.md` or “Creator OS Executive Pivot” are **history**, not the product.

## What we are building

| Surface | Job |
|--------|------|
| **My VYBZ** | Home. Your living place (`/`). |
| **Their VYBZ** | Someone else’s place (`/u/:id`). Same object, visitor experience. |
| **Explore** | Target door into other people’s VYBZ. Search lives inside it. **Not shipped as the chrome door yet.** |
| **Library** | Your Creative Work, private until you add it to My VYBZ. Hidden from default chrome. |
| **Live Room** | Real-time presence. A capability, not the product. |
| **VDock** | User-facing product name. **Shipped:** media dock. **Target:** persistent personalized control layer. |

No public content section is required. A person with no published work still has a complete social identity.

## What we are not building (as the product)

These still exist in the repository. Routes may resolve. **Do not treat them as current direction:**

- Living Mix (`/library/mix`)
- Pack Maker, marketplace, sample-pack pipeline
- Workspace as home (`/workspace` is archived from nav)
- Studio tool drawer / DSP desks as kingdoms
- DAW broadcast plug-in as the identity of VYBZ
- Suite product grid (Prepare, Market, Artist storefront, CoverLab, …)

Hide, never delete. Hidden from default chrome ≠ the social product.

## Shipped default chrome

**VYBZ · Search · + · Chat · Alerts · Me.** Target door is **Explore** (Search inside it). Cmd/Ctrl+K is the command palette.

## Local development

```bash
npm install
cp .env.example .env   # set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
npm run lint
npm run test
npm run build
```

Node 20+. Missing Supabase env → app hard-stops.

## Documentation map

| Doc | Purpose |
|-----|---------|
| [`PRODUCT.md`](./PRODUCT.md) | **Only product authority** |
| [`src/product/invariants.ts`](./src/product/invariants.ts) | Rules in code |
| [`AGENTS.md`](./AGENTS.md) | How to work here |
| [`STATE.md`](./STATE.md) | Checkpoint (evidence, not vision) |
| [`docs/decisions/`](./docs/decisions/) | Why a decision was made (history) |
| [`docs/`](./docs/) | Engineering/ops reference — never product law |
| [`docs/archive/`](./docs/archive/) | Historical only |

## Security reporting

Report vulnerabilities privately to the Astra Matrix owners. Do not file public issues that include exploit detail for unpatched production flaws.

## License / ownership

Proprietary — Astra Matrix, Inc. Repository: [ALaustrup/VYBZ](https://github.com/ALaustrup/VYBZ).
