# VYBZ Credits

> Product brief — reference only. Not authoritative; see `VYBZ_MASTERPLAN.md`. Accent: **indigo**. Credit Passport.

## Purpose

Metadata, contributors, splits, and approvals for a release. The Credit Passport
is the durable identity of who did what — and who agreed.

## Customer

Artists, producers, featured talent, and managers who need correct credits and
splits before distribution — with human confirmation, not silent AI inventing.

## Jobs

- Build contributor lists and roles for a release
- Propose splits; collect approvals from multi-accounts
- Normalize / suggest metadata (AI may help draft only)
- Export credits for package and public Artist presentation

## Data sketch

`contributor_passports` · `contributor_aliases` · `release_contributors` ·
`credit_roles` · `credit_approvals` · `split_proposals` · `split_approvals` ·
`credit_exports`.

## Cost behavior

Core passport and approvals free on Creator+ workspace. AI suggest = free_only or
template fallback; never auto-approves. No paid ranking of credits.

## Copy one-liner

**Every name accounted for. Every split confirmed.**

## Design accent

Indigo (`--accent-credits`). Forms and approval states over spectacle. Clear
pending / approved / rejected chips.

## DoD

- [ ] Credit Passport CRUD + release contributor binding
- [ ] Multi-account approval path for splits
- [ ] **AI may suggest, never invent contributors or approve splits**
- [ ] Empty / conflict / unsigned-agreement states; audit on approvals
