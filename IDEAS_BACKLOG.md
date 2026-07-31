# Opportunity Register

> Replaces the pre–Suite “Ideas Backlog.” Nothing here is committed to build until
> it is promoted into [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) with phase fit,
> cost, and legal review. Archived Music Hub backlog:
> [`docs/archive/pre-suite-2026/IDEAS_BACKLOG.md`](./docs/archive/pre-suite-2026/IDEAS_BACKLOG.md).

## Schema

Each entry uses:

| Field | Meaning |
|-------|---------|
| **Problem** | What pain exists |
| **Customer** | Who feels it |
| **Strategic fit** | Which Suite module / law |
| **Dependencies** | Tech or business blockers |
| **Estimated cost** | Fixed / usage / legal |
| **Legal risk** | Low / medium / high |
| **Status** | `parked` · `ready` · `active` · `shipped` · `rejected` |
| **Promotion criteria** | What must be true to enter a phase |

---

## Register

### OR-001 — Sample Pack Storefront (Market)
- **Problem:** Producers need a fast path to sell packs with copy, art, and fulfillment.
- **Customer:** Producers
- **Strategic fit:** VYBZ Market
- **Dependencies:** Migration `0080`, `GROQ_API_KEY`, EF deploys, Stripe webhook
- **Estimated cost:** Groq free tier ceiling; Stripe success fees only
- **Legal risk:** Medium (seller terms)
- **Status:** `shipped` (SPA); owner deploy smoke remaining
- **Promotion criteria:** N/A — expand under Phase 8 Market unification

### OR-002 — AI visualizer stills → Compose
- **Problem:** Artists need drop backdrops without leaving Studio.
- **Customer:** Artists
- **Strategic fit:** CoverLab / Artist presentation (stills only)
- **Dependencies:** `FAL_KEY`, cost reservation doctrine
- **Estimated cost:** fal metered — prepaid / Vc debit only
- **Legal risk:** Low–medium (AI transparency)
- **Status:** `shipped` (code); secrets/deploy smoke remaining
- **Promotion criteria:** Keep T2V / generative music `parked` until attribution + cost model

### OR-003 — Tip + live + catalog audience loop
- **Problem:** Indie artists need a public home and direct support.
- **Customer:** Artists and fans
- **Strategic fit:** Artist + VDock + Live (audience third of Suite lifecycle)
- **Dependencies:** Prod smoke on vybz.cloud
- **Estimated cost:** $0 fixed beyond existing infra
- **Legal risk:** Low
- **Status:** `active` (preserved; no longer sole GTM north star)
- **Promotion criteria:** Remains continuous with Prepare → Relay → publish

### OR-004 — Bunny CDN / Stream
- **Problem:** Historical alternate media origin.
- **Customer:** Platform ops
- **Strategic fit:** None — contradicts Storage-only law
- **Dependencies:** N/A
- **Estimated cost:** High (reason retired)
- **Legal risk:** Low
- **Status:** `rejected` / retired — do not re-provision
- **Promotion criteria:** Never, unless Masterplan explicitly reverses media law

### OR-005 — Text-to-video visualizers + generative AI music
- **Problem:** Motion backdrops and AI tracks.
- **Customer:** Artists
- **Strategic fit:** CoverLab / Market — weak until cost + originality rules
- **Dependencies:** Video API, ffmpeg pipeline, attribution policy
- **Estimated cost:** High usage
- **Legal risk:** High
- **Status:** `parked`
- **Promotion criteria:** Cosmetics + tip path profitable; written attribution rules; prepaid cost kernel live

### OR-006 — VYBZ Immersive / VR
- **Problem:** Spatial listening and collab.
- **Customer:** Experimenters
- **Strategic fit:** Frozen — out of Suite Genesis scope
- **Dependencies:** WebXR / Quest, AudioBus single clock
- **Estimated cost:** High
- **Legal risk:** Medium
- **Status:** `parked`
- **Promotion criteria:** Suite Phases 2–7 complete and revenue-positive

### OR-007 — Engagement habit loops (Daily Drop, Listen Circles, …)
- **Problem:** Retention beyond release workflow.
- **Customer:** Fans and artists
- **Strategic fit:** Artist / Live — after Prepare MVP
- **Dependencies:** Notification budget (Resend free caps)
- **Estimated cost:** Low–medium
- **Legal risk:** Low
- **Status:** `parked`
- **Promotion criteria:** Phase 2 exit gate passed; email quota policy enforced

### OR-008 — Cloudflare Pages commercial host
- **Problem:** Vercel Hobby is not acceptable permanent commercial host; Pro has fixed cost.
- **Customer:** Astra Matrix ops
- **Strategic fit:** Operations / zero-new-fixed-cost launch
- **Dependencies:** SPA rewrites, PWA, passkeys, DNS
- **Estimated cost:** $0 Pages static; verify Workers quota unused
- **Legal risk:** Low
- **Status:** `ready` (document in Phase 0; execute later)
- **Promotion criteria:** Phase 1 shell stable; canary `app.vybz.cloud` green

### OR-009 — Direct distribution (Relay Stage 4)
- **Problem:** Artists want VYBZ to deliver to DSPs without a partner.
- **Customer:** Labels / managers
- **Strategic fit:** Relay — **only after** commercial agreements, fraud, royalty, tax, takedown
- **Dependencies:** Legal + ops maturity
- **Estimated cost:** High fixed + compliance
- **Legal risk:** High
- **Status:** `parked`
- **Promotion criteria:** Stage 2–3 partner delivery proven; counsel-approved agreements

### OR-010 — Migration history formalization (`db push` vs raw SQL)
- **Problem:** Remote `schema_migrations` drifts from local filenames; `supabase db push` fails while raw SQL apply works.
- **Customer:** Platform ops / agents
- **Strategic fit:** Correctness / CI
- **Dependencies:** Decide single source of truth; checksum table; CI guard
- **Estimated cost:** Low engineering; care on prod history repair
- **Legal risk:** Low
- **Status:** `ready` (noted at Phase 2/3 boundary — not a Phase 3 blocker)
- **Promotion criteria:** Include in Phase 4 ops hardening or earlier if `db push` blocks a release

### OR-011 — Two-user live RLS e2e
- **Problem:** Owner-only RLS is covered by SQL policies + contract tests, not a live two-session Playwright suite.
- **Customer:** Platform security
- **Strategic fit:** Prepare / Credits correctness
- **Dependencies:** Test users + auth harness against linked Supabase
- **Estimated cost:** Low–medium
- **Legal risk:** Low
- **Status:** `parked` (contract tests sufficient for Phase 2–3)
- **Promotion criteria:** Before multi-account Credits approval or public beta

### OR-012 — iOS TestFlight live upload (Phase 19 ops)
- **Problem:** Capacitor iOS shell + CI exist, but no signed IPA / TestFlight without Apple Developer + certs.
- **Customer:** Alpha testers on iPhone
- **Strategic fit:** Multi-platform shell · Phase 19 follow-up
- **Dependencies:** Apple Developer Program (~$99/yr); secrets `IOS_CERT_*` / `APPLE_TEAM_ID`; AASA `TEAMID`; optional ASC API key
- **Estimated cost:** $99/yr Apple + GitHub macOS Actions minutes
- **Legal risk:** Low
- **Status:** `parked` (explicitly deferred 2026-07-30 — not blocking Suite)
- **Promotion criteria:** Owner enrolls Apple Developer + budgets CI minutes; then follow [`IOS_RELEASE.md`](./docs/operations/IOS_RELEASE.md)

---

## Ritual

At each phase boundary, ask: *Any new opportunities to register?* Append with the
schema above. Promote only via Masterplan amendment + human approval.
