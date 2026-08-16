# VYBZ

> **The only authority.** What we are building and what we refuse to build.
> Machine-enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> Where this document and that file disagree, the file wins and this document gets fixed.
>
> Version 2 · 2026-08-16 · supersedes Version 1 (The Station, 2026-08-15).
> Decision: [`docs/decisions/0003-pack-suite-marketplace.md`](./docs/decisions/0003-pack-suite-marketplace.md).

---

## 1. The problem

You finish a folder of loops, oneshots, and phrases. It is the work. It is not a product.

The names are a mess. Tempo is in the filename if you are lucky. Kind is a guess. There is no
ZIP a stranger can unzip and trust. There is no page that takes a card. So the folder sits
on a drive, or it gets dumped on a marketplace that invents plays and "trending" shelves, or
you spend a weekend making the pack by hand and never do it again.

**That is the hole. Not obscurity — a folder of files that never becomes something you can
sell, honestly.**

## 2. What VYBZ is

**VYBZ is a sample pack creation suite with a marketplace.**

A producer drops a folder, hears the files, gives them honest tags, builds a measured ZIP,
and can sell it. Every number on a pack is measured. Everything unknown reads
**Not measured**.

Not a radio station. Not a social network. Not DSP distribution. The job is organize, tag,
preview, package, sell.

## 3. The suite

Five jobs, in this order. Each already has a surface. None of them is allowed to invent
inventory or a measurement.

| Job | Surface | Honest description |
|---|---|---|
| **Ingest** | Library uploader, or Pack Maker dropzone | Bytes land. Filename tempo/key fill only when the name states them. |
| **Organize** | Library | Search, filter, sort, group by fields a `Drop` actually carries. |
| **Tag** | Filename hints, Pack Maker kind, metadata editor | Declared and measured are labelled as such. A bare `F` is not "F major". |
| **Preview** | VDock, pack preview audio | Playback is dry. A pack preview plays only when a `preview_path` exists. |
| **Package** | Pack Maker | Measured WAVs in `loops/` `oneshots/` `samples/`, plus a SHA manifest. |
| **Sell** | Storefront → `/pack/:slug` → Market | Stripe Checkout. Buyer gets the ZIP. Producer is settled by hand until Connect payouts are verified. |

**Two ingest paths, both kept:**

1. **Library** — files become catalog rows you can search and reuse.
2. **Pack Maker** — files stay in the pack working set and are **never** auto-ingested into
   the library. Assembling a pack must not dump samples into the public catalog.

Pack Maker is a multi-file suite, not a one-track desk. It belongs in the default experience.

## 4. Honesty of tags

Three kinds of label, never mixed:

| Kind | Source | What we may say |
|---|---|---|
| **Declared** | Filename, artist-typed fields, pack title and genre | What a person wrote |
| **Measured** | Duration, peak, RMS, sample rate, channels, content SHA | Computed from the bytes |
| **Inferred** | Analysis that has no evidence | **Not used.** Local genre/mood inference returns nothing today. |

VYBZ never claims to have *detected* a genre, a key mode the name did not state, or a
musical section we cannot measure. A fabricated BPM wearing a lab coat is still fabricated.

## 5. The marketplace

Published packs are listed on **Market** (`/market`) from `storefront_packs_public` only.
Empty means zero published packs, not a placeholder catalog. Filters never invent rows.
There are no play counts, no trending shelves, no "guaranteed placement."

A public pack page (`/pack/:slug`) shows title, price, description, and a preview when one
exists. It never exposes `zip_path`. The ZIP is delivered after payment — today by a signed
download link mailed to the buyer.

**Selling is optional.** Packaging a ZIP for yourself is a full use of the product. The
marketplace is the front door for buyers, not a tax on making a pack.

Platform fee is **10%**, tracked on the order. Settlement of the producer is
`pending_manual` → `settled_off_platform` until automatic payouts are
production-verified. That is the designed path, not a temporary shame.

Measured 2026-08-16: one live $1.00 purchase completed; the buyer received the ZIP by email.
Checkout and fulfillment for that order are **DELIVERED AND PRODUCTION-VERIFIED**. A second,
non-owner customer is **Not measured**.

## 6. Money

**Buyers pay in fiat, through Stripe, on the platform account.** That is how a pack is sold.

**V¢ remains** the purchasable utility credit it already is — cosmetics, tips, storefront
adjacent spend. It does not buy a listing, a search rank, or the right to upload.

**Airtime** — verified listening time from The Station — stays in the invariants file and
in the parked Station subsystem. It is not used by the pack suite. Airtime and V¢ still
never convert, in either direction. Money still cannot buy the right to be heard on any
future Station surface.

Pack price bounds are $1.00–$5,000.00, as the storefront already enforces.

No economy constant for "what a pack should cost" is invented here. Producers set a price.

## 7. Publishing is always free

Upload anything, any time, at no cost. It lives in your library.

**Only a sale is charged.** A zero balance still lets you ingest, tag, preview, and build a
ZIP. The marketplace takes a cut of a completed purchase, not of existence.

We do not pay people to upload. Pay-for-upload fills a catalog with generated slop.

## 8. Parked: The Station

Version 1 of this document made one synchronized station the product. That decision is
superseded. The radio, the line, sparks, reception, and Airtime remain implemented to the
degree `STATE.md` records. They are not deleted. They are not the front door.

If The Station returns, it returns as a measured decision with its own record, not by
quietly rewriting this file back.

## 9. What we refuse

**No public vanity metrics.** No follower counts, no play counts as social proof, no
leaderboards of packs. Reception and sales figures go to the person who made the thing.

**No purchasable attention.** Money does not buy Market rank, "featured," or a fake listen.

**No paying for uploads.** See §7.

**No fabricated measurement.** Unknown reads **"Not measured"**. Approximate is labelled
approximate. Simulated is labelled simulated. Filename tempo is declared-from-name.

**No dating, romance, meetup or swipe matching.** Permanently out of scope.

**No claim that VYBZ delivers to DSPs.** It prepares packs and listings. It does not
distribute to Beatport, Splice, or Spotify.

**No invented inventory.** Market shows published `storefront_packs` rows or an honest empty
state.

**No undisclosed processing on the play path.** Playback is dry. Simulations are labelled.

**No Station, radio, or social expansion** while the pack loop is the product. Those
surfaces stay in the tree. They do not get new work, new nav, or new promises.

## 10. Preservation — hide, never delete

**Nothing already built is deleted.** The analyzer, correction desk, translation lab, stem
maker, midi maker, converter, storefront, rooms, live, messages, projects, visualizer
studio, sparks, reception, Living Mix, and Vibes Radio stay in the tree, stay reachable,
and keep working.

Surfaces leaving the default experience are **hidden from navigation**, not removed. Routes
still resolve. Code still compiles. History still holds everything.

The Station, sparks-on-station, Airtime earning, and the social home are **parked**. Their
invariants in `src/product/invariants.ts` still apply *to those surfaces* if they are
switched on again. They are not the default product.

The new interface becomes the front door. What is behind it is still the house.

## 11. Interface direction

**The default experience is the pack loop:** Library → Pack Maker → Storefront / Market.

Signed-in navigation should make those three findable without a memorized URL. Desks that
operate on one track stay summonable from that track. Routes for parked surfaces still
resolve.

**Mobile first.** Designed for a phone held in one hand, then adapted upward to desktop.

**Android as a first-class target**, through the existing Capacitor shell and Platform
Bridge.

**VR is a considered horizon**, not a commitment, and never at the cost of the phone or
the pack loop.

## 12. Delivery vocabulary

A capability is delivered only when it is implemented, integrated, reachable, discoverable,
deployed, production-verified, and changes what a user can do.

Permitted states — never "complete":

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

Production is the truth about the product. The repository is the truth about the code. When
they disagree about what a user experiences, **production wins and the documents get fixed.**

## 13. Definition of success

A producer drops a folder they have been sitting on. The same day they have a measured ZIP
and a page that takes a card. A stranger buys it. The ZIP arrives. The producer can see the
order and settle it.

They never again finish the work and have only a folder.
