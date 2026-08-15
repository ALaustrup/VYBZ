# VYBZ

> **The only authority.** What we are building and what we refuse to build.
> Machine-enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> Where this document and that file disagree, the file wins and this document gets fixed.
>
> Version 1 · 2026-08-15 · supersedes every prior masterplan, backlog and status doctrine.

---

## 1. The problem

You spend a week, or a year, on something. You release it.

Four thousand views. Ninety-one likes. Twelve fire emojis.

And you have no idea what happened. Did anyone reach the part you rebuilt eleven times? Did
anyone finish it? Was it playing muted in a feed while someone scrolled past? You will never
know, because a "view" is three seconds with the sound off, and everybody knows the number is
a lie.

Worse: the silence is unfalsifiable. You cannot tell whether nobody heard it because it was
not good enough, or because an algorithm did not pick you that day. So you cannot learn, you
cannot improve, and you cannot even properly grieve it and move on.

**That is the hole. Not obscurity — the absence of any true signal that your work landed in
another human being.**

## 2. What VYBZ is

**VYBZ is the only place that tells a creator the truth about their work.**

One synchronized station. Real people listening at the same moment. The artist decides what
they need to know, and listeners answer while the music plays. Every number reported is
measured, and everything unknown says so.

Not reach. Not engagement. The honest answer to *did it land*.

## 3. The Station

There is exactly **one** station. Everyone who tunes in hears the same thing at the same
position, kept in step by a server clock with per-client skew correction.

One station is a deliberate constraint. Concurrency pools in a single room, so it always
sounds alive, and when a track airs it is a genuine shared moment rather than a private
impression. Twenty ghost-town stations would be worse than one busy one.

**Taste is handled by time, not fragmentation.** The station is programmed in blocks the way
radio has always solved this — late night is slow, drive time is uptempo. Tracks are placed
into the block that fits.

**Splitting is a measured decision.** A second station opens when queue depth and concurrent
listening justify it — never because a genre list was written in advance.

### Placement inputs, and their honesty

Three inputs decide where a track sits, and each is labelled for what it is:

| Input | Source | Honest description |
|---|---|---|
| **Declared** | Artist's profile and release tags | What the artist says it is |
| **Measured** | BPM, key, duration, loudness, spectral balance | Computed from the audio |
| **Learned** | Listener taste embeddings | Inferred from behaviour |

VYBZ never claims to have *detected* a genre or a chorus. Local metadata inference honestly
returns nothing today, and model-suggested tags are labelled as suggestions. A fabricated
measurement wearing a lab coat is still fabricated.

## 4. Sparks — the feedback mechanic

*Name provisional. It must not be called a star: every product on earth uses stars for
ratings, and listeners would read tapping one as "I like this."*

The artist marks the moments they are unsure about. During playback:

1. Small dots appear quietly **during** the passage — something is coming, stay present.
2. Just **after** the passage ends, a spark forms with a filling ring.
3. Tap it and three options appear, chosen by the artist for that exact moment.
4. Tap one. The artist receives it in real time.
5. Ignore it and it bursts. That opportunity is gone.

### Why the timing is what it is

The prompt lands **after** the passage, never during it. A countdown running into the drop
would make the listener watch numbers instead of hearing the drop — the instrument would
disturb the thing it measures. Dots signal presence; the spark collects the impression while
it is still hot.

The ring fills rather than counting down in digits. Numbers demand reading, and reading is
attention stolen from listening.

### Rules that keep the data worth having

- **Options carry words, not just emoji.** 🔥 "hits hard" · 😐 "flat here" · 🌊 "too much".
  Emoji for speed, the word for meaning. Twenty taps of 🔥 with no label is another fake metric.
- **The three options must span positive, neutral and critical.** An artist who could pick
  three flattering options would build a compliment machine. A feedback system that cannot
  deliver bad news is not a feedback system.
- **Density is capped by price, with enforced spacing.** More than a few per track and the
  song becomes whack-a-mole.
- **No response is recorded as no response.** It might mean bored; it might mean completely
  absorbed. We do not know, so we do not infer.
- **The burst is quiet.** A loud animation during a soft passage is a loud animation during a
  soft passage.

### Automatic placement

An artist who sets nothing still gets sparks, at the **same price**, pre-placed as an editable
draft they can accept, move or replace.

Placement is at **measured structural moments** — the largest energy change, the opening
where listeners actually leave, the ending, the longest quiet passage — never at random.
Random placement asks people about nothing in particular and produces noise. Each is described
by what was measured, never as a musical section we cannot detect.

## 5. What the artist receives

> **19 of 24 answered "still with it" at 0:42.**
> **At 3:10 — 6 too long, 15 just right, 3 too short.**
> **Most present at 1:55: bass (11), vocals (7), drums (4), space (2).**
> **8 no response.**
> **Emotional response beyond the options asked: Not measured.**

Every line is true. The last line is why the others can be believed.

**And they can be there when it happens.** The artist is told when their track airs, shows up,
and watches strangers react in real time. That is the point of the whole system: not a
dashboard the next morning, but being in the room the first time it lands.

## 6. The economy

**One wallet. Two balances. No bridge between them.**

| | **Airtime** | **V¢** |
|---|---|---|
| What it is | Verified time, machine-measured | Judged value, human-decided |
| Earned by | Answering sparks during verified listening | Tips, sales, responses an artist marks useful |
| Spent on | Being answered | Cosmetics, storefront, subscriptions, tips |
| Purchasable | **Never** | Yes, as today |
| Transferable | No | Yes |

**Airtime and V¢ never convert, in either direction.** This is the invariant everything else
rests on. If money can become the right to be heard, VYBZ is a pay-for-promotion service with
nicer design, and the claim that the attention here is real becomes false. If Airtime can
become money, listening becomes a farm.

### How it flows

**Earning:** listening qualifies you; **answering pays you.** Passive playback earns nothing,
so leaving a tab open overnight is pointless. Response quality feeds back into the rate, so
consistent low-effort tapping earns less over time.

**Spending:** the artist commits a budget — up to *N* answers on this spark — and is charged
**per answer received**, not per spark placed. When the budget fills, the spark retires. A
track that airs to four people at 4am is not billed as though thirty answered.

**Rewards exist only on The Station.** Browsing, profiles, the library, Living Mix and all
on-demand playback stay free, unlimited, and earn nothing. One surface to defend against
fraud instead of an entire app.

**Reward-bearing playback is locked-transport** — no seeking, live or replay — so nobody can
jump straight to a spark timestamp and tap.

### Constants are deliberately unset

How much an answer earns, what an answer costs, and how many the guarantee promises **cannot
be derived from anything measured yet**. Inventing them here would be the exact dishonesty
this product exists to oppose. They get set from observed listening supply against real
release demand once the station runs.

## 7. The Guarantee

> Your track will air in a slot with a real audience, and you will receive real answers to
> the questions you asked — or you were not charged.

Because artists are charged per answer received, an unfulfilled guarantee costs nothing. The
scheduler holds a track until a slot with genuine listeners exists rather than burning a
release at 4am to three insomniacs and calling the promise kept.

**The Last Hour** extends witness beyond the broadcast: recently aired tracks can be replayed,
and answers still earn and still count against the artist's budget. This is what lets a single
station serve more releases than its broadcast minutes allow.

## 8. Publishing is always free

Upload anything, any time, at no cost. It lives on your profile and in your library
permanently.

**Only the guarantee is earned.** Airtime buys rotation and answers — never the right to exist
here. A zero balance means your track still airs; it simply carries no sparks and no promise.
New members receive a starter grant so their first release gets the full experience before
they have earned anything, because the feeling is the product and nobody grinds for something
they have not felt.

## 9. What we refuse

**No public vanity metrics.** No follower counts, no play counts as social proof, no
leaderboards. Reception goes privately to the person who made the thing. Nothing worth gaming
means numbers that stay true.

**No purchasable attention.** See §6.

**No paying for uploads.** Pay people to upload and the platform fills with generated slop
within a month, because generating a track now costs seconds. The reward for uploading is
being heard.

**No fabricated measurement.** Unknown reads **"Not measured"**. Approximate is labelled
approximate. Simulated is labelled simulated.

**No dating, romance, meetup or swipe matching.** Permanently out of scope.

**No claim that VYBZ delivers to DSPs.** It prepares releases and produces verified packages.
It does not distribute.

**No undisclosed processing on the play path.** Playback is dry. Simulations are labelled.

## 10. Preservation — hide, never delete

**Nothing already built is deleted.** Everything VYBZ has — the analyzer, correction desk,
translation lab, stem and pack makers, midi maker, converter, storefront, rooms, live,
messages, projects, visualizer studio — stays in the tree, stays reachable, and keeps working.

Surfaces leaving the default experience are **hidden from navigation**, not removed. Routes
still resolve. Code still compiles. History still holds everything.

The new interface becomes the front door. What is behind it is still the house.

## 11. Interface direction

**The new default experience is The Station**, and it is what every user — creator or listener
— lands on.

**Mobile first.** Designed for a phone held in one hand at arm's length, then adapted upward
to desktop. Not a desktop layout squeezed down.

**Android as a first-class target**, through the existing Capacitor shell and Platform Bridge.

**VR is a considered horizon**, not a commitment. A synchronized station with a shared audience
and reactive visuals has an obvious immersive form, and the reactive visual engines already
exist. It gets designed when the core loop is proven, and never at the cost of the phone.

**Foreground earning, honestly stated.** A phone in a pocket cannot tap a spark. Backgrounded
playback still plays; it simply does not earn, and we say so plainly rather than pretending.

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

An artist uploads something they spent months on. Within days it airs to real people. They are
there when it happens. Strangers answer the exact questions they were losing sleep over. They
earn from helping others the same way.

They never again spend a year on something and find out nothing.
