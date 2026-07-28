# VYBZ Market

> Authoritative product brief. Accent: **violet / gold**. Storefront packs first.

## Purpose

Digital music products — sample packs and sellable files today; broader catalog
commerce expands later. Existing `/tools/packs` and `/pack/:slug` are the live
foundation.

## Customer

Producers selling packs; buyers browsing and checking out via Stripe.

## Jobs

- Create / edit packs (`/tools/packs`, editor flows)
- Publish pack pages (`/pack/:slug`) with preview + checkout
- Optional pack copy (Groq `free_only`) and deterministic art
- Expand later: beats, stems, licenses — without rewriting storefront core

## Data sketch

Existing storefront packs / orders / Storage buckets `storefront-previews`,
`storefront-zips` · Stripe Checkout + webhook · spend/copy job metadata.

## Cost behavior

Browse free. Checkout = Stripe success fees. Pack copy Groq `free_only` with
template fallback. Pack art prefer deterministic Edge SVG; fal only if prepaid
and explicitly in scope. No ads.

## Copy one-liner

**Sell the pack. Expand the market later.**

## Design accent

Violet / gold (`--accent-market`). Product pages can be expressive; dashboard
chrome stays denser. Preserve storefront feature module.

## DoD

- [ ] Existing packs dashboard + public pack page remain authoritative
- [ ] Checkout + webhook path intact
- [ ] Suite `/market` maps to packs family without breaking URLs
- [ ] Empty / unpublished / payment-failed states; no fake inventory scale claims
