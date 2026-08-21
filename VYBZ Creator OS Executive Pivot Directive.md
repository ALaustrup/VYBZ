# VYBZ CREATOR OS
## Executive Product Pivot, Architecture Directive, and Phased Implementation Order

### STATUS: EXECUTIVE AUTHORIZATION
### PRODUCT: VYBZ
### NEW PRIMARY IDENTITY: THE CREATOR OPERATING SYSTEM
### PRIORITY: MAXIMUM
### DEVELOPMENT MODE: RAPID, PRESERVATION-FIRST, COST-CONSTRAINED
### PRIMARY OBJECTIVE: SHIP THE SMALLEST REAL VERSION OF THIS VISION AS QUICKLY AS POSSIBLE WITHOUT DESTROYING THE SUBSTANTIAL WORK ALREADY COMPLETED

---

# 0. EXECUTIVE ORDER

Greetings.

This directive formally authorizes a major product refocus of VYBZ.

You are to perform a comprehensive analysis of the repository, existing documentation, application architecture, frontend, backend, database, desktop client, mobile client, infrastructure, routes, feature flags, services, schemas, APIs, utilities, creator-facing tools, social functionality, streaming functionality, upload systems, media systems, and all other relevant project assets in order to determine the most efficient path toward the product defined below.

Do not treat this as a request for brainstorming.

Treat this as an **engineering and product execution directive**.

VYBZ has undergone multiple changes in direction. That history is acknowledged rather than ignored. Approximately **$7,000 has already been invested attempting to make this project viable**, meaning development from this point forward must aggressively favor:

1. reuse over replacement;
2. extension over reinvention;
3. local-first architecture over expensive infrastructure;
4. existing services over new vendors;
5. incremental migrations over rewrites;
6. reversible changes over destructive changes;
7. measurable functionality over conceptual complexity;
8. shipping useful product surfaces over endless architectural preparation.

The repository contains substantial existing work.

Assume nothing is useless until you have inspected it.

At the same time, do not preserve a bad architecture merely because it exists.

The objective is to **extract maximum value from everything already built while changing the center of gravity of the entire product.**

---

# 1. THE NEW PRODUCT DEFINITION

VYBZ is to become:

> **The operating system for creators.**

Not merely musicians.

Not merely producers.

Not merely visual artists.

Not merely developers.

Not merely livestreamers.

VYBZ should eventually support essentially any human whose creative work can be represented digitally.

Examples include:

- musicians;
- music producers;
- sound designers;
- recording artists;
- DJs;
- visual artists;
- illustrators;
- photographers;
- filmmakers;
- animators;
- 3D artists;
- game designers;
- game developers;
- software developers;
- writers;
- designers;
- digital sculptors;
- video editors;
- VFX artists;
- modders;
- creators of sample packs;
- creators of presets;
- creators of plugins;
- creators of digital assets;
- mixed-media creators;
- emerging creator categories that do not fit neatly into traditional platforms.

The architecture must therefore stop assuming that the fundamental unit of VYBZ is a song.

The fundamental unit is:

> **Creative Work.**

A Creative Work may contain one or many digital assets.

A Creative Work may be:

- private;
- local;
- shared privately;
- publicly showcased;
- streamed while being created;
- versioned;
- collaboratively referenced;
- published;
- sold later;
- validated through creator provenance;
- included in collections;
- attached to projects;
- displayed through a Creator Profile.

This abstraction is critical.

Build the system around creators, projects, works, assets, versions, sessions, provenance, and relationships.

Music-specific functionality should become a specialization of this larger system rather than the foundation upon which every creator must conform.

---

# 2. CORE PRODUCT PHILOSOPHY

VYBZ should provide something modern creator platforms have largely failed to provide:

> **One environment where a creator can organize their work, control their files, demonstrate their process, build their identity, communicate with other creators, share selectively, publish selectively, and maintain ownership of the underlying creative material.**

VYBZ should feel less like another social network and more like a **creative operating environment with a social layer built into it.**

This distinction is fundamental.

The application should prioritize:

**Create → Organize → Version → Preview → Validate → Share → Showcase → Connect**

Social functionality exists around creation.

Creation does not exist merely to generate social content.

---

# 3. NON-NEGOTIABLE PRESERVATION RULE

## DO NOT DELETE EXISTING FUNCTIONALITY SIMPLY BECAUSE IT DOES NOT CURRENTLY FIT THE NEW DEFAULT EXPERIENCE.

We have invested too much time and money into the existing application to destroy potentially useful work during another pivot.

Instead, classify existing functionality using the following states:

### KEEP
Directly useful to Creator OS.

### ADAPT
Useful technology or functionality requiring reframing.

### INTEGRATE
Existing capability that should become part of another Creator OS surface.

### HIDE
Functional but not currently relevant to the default product experience.

### ARCHIVE
Code that should remain available but should not participate in active product execution.

### DEPRECATE
Functionality proven obsolete or incompatible.

### REMOVE
Allowed only when the code is objectively dangerous, irreparably broken, security-sensitive, duplicated after migration, or demonstrably unnecessary.

Removal must never be the default response.

When functionality is removed from the visible application, prefer:

- route isolation;
- feature flags;
- configuration flags;
- archived modules;
- documented deprecation;
- reversible commits.

The repository must not be bulldozed because product direction changed.

Human beings have apparently already tried that strategy enough times.

---

# 4. VISUAL DESIGN AUTHORITY

The **existing VYBZ interface theme is now the visual foundation of the Creator OS.**

Do not perform another wholesale visual redesign.

Do not replace the design system simply because a new product direction exists.

Do not introduce an unrelated SaaS aesthetic.

Do not convert the application into a generic dashboard template.

Instead:

> **Evolve the existing VYBZ design language into a sophisticated desktop-oriented Creator OS.**

You are explicitly authorized to:

- expand the existing design system;
- create new components;
- refine existing components;
- improve spacing;
- improve hierarchy;
- improve typography;
- improve responsiveness;
- add motion;
- add contextual menus;
- add windowing concepts;
- add panes;
- add inspectors;
- add docks;
- add workspaces;
- add adaptive layouts;
- add creator-specific visual modes;
- introduce new tokens where genuinely necessary;
- improve accessibility;
- reorganize existing interface components.

However, all additions must feel genetically related to the current VYBZ interface.

The goal is evolution, not replacement.

---

# 5. THE CREATOR OS EXPERIENCE

The desktop and large-screen experience should become the richest implementation of VYBZ.

Think in terms of a modern creative workstation rather than a website.

The VYBZ environment should gradually support concepts such as:

- creator workspace;
- project navigator;
- library;
- asset browser;
- collections;
- activity;
- notifications;
- profile;
- live state;
- communication;
- tools;
- previews;
- file inspector;
- metadata inspector;
- version history;
- sharing controls;
- provenance information;
- publishing controls.

Do not copy an existing operating system literally.

Do not build fake draggable windows simply for visual novelty.

Use workstation concepts only where they improve usability.

The experience should remain fast, understandable, and visually restrained.

---

# 6. CREATOR PROFILE: THE LIVING PORTFOLIO

The Creator Profile becomes one of VYBZ's defining surfaces.

It should not merely be a biography page.

It becomes the creator's **living digital portfolio and presence layer.**

A profile should eventually be capable of presenting:

- identity;
- avatar;
- banner;
- description;
- creator disciplines;
- featured projects;
- creative works;
- collections;
- releases;
- images;
- audio;
- video;
- games;
- software;
- downloadable works;
- external references;
- current activity;
- livestream state;
- previous creative sessions;
- VYBs;
- followers;
- followed creators;
- provenance badges;
- validation records;
- creator timeline.

Profiles should be **dynamic**.

Different creators should be capable of emphasizing different media without requiring entirely different products.

A musician's profile might foreground a player.

A visual artist's might foreground a gallery.

A game developer's might foreground builds, screenshots, repositories, videos, or playable media.

A filmmaker's might foreground video.

A developer's might foreground projects, builds, releases, documentation, and demonstrations.

Build a modular profile composition model instead of hardcoding a music profile and pretending everyone else is a musician with strange file extensions.

---

# 7. THE UNIVERSAL CREATIVE ASSET MODEL

Before expanding functionality, establish or adapt a generalized conceptual model.

Prefer extending the existing schema when practical.

Do not initiate a database rewrite merely to produce aesthetically pleasing entity names.

Conceptually VYBZ should understand:

## Creator
The account or identity controlling creative work.

## Workspace
The creator's private operating environment.

## Project
A logical creative undertaking.

Examples:

- album;
- game;
- illustration series;
- application;
- film;
- sample pack;
- plugin;
- photography collection.

## Work
A creator-facing item representing something meaningful.

## Asset
An actual file or locally referenced digital object.

## Version
A revision of a Work or Asset.

## Collection
A creator-defined grouping.

## Live Session
A recorded creation or broadcast session.

## Provenance Record
Evidence linking creative activity to Works, Assets, and Sessions.

## Publication
A publicly exposed representation of a Work.

## Share
Authorization granting another user or the public access.

Do not force this exact schema if the current database already expresses these concepts efficiently.

The objective is semantic capability, not schema churn.

---

# 8. LOCAL-FIRST AND USER-HOSTED STORAGE

One of the central architectural goals of this pivot is to dramatically reduce centralized file-storage cost.

The user's original creative files should, whenever practical, remain under the creator's control.

VYBZ should move toward a:

> **local-first, user-hosted, peer-assisted creative asset architecture.**

The VYBZ cloud should primarily function as the:

- authentication plane;
- identity plane;
- social plane;
- metadata plane;
- discovery plane;
- permissions plane;
- coordination plane;
- signaling plane;
- provenance registry;
- lightweight control plane.

The creator's desktop or mobile device can function as an:

> **Asset Node**

The Asset Node may expose creator-authorized material to VYBZ without requiring every original file to be permanently stored on centralized VYBZ infrastructure.

---

# 9. DO NOT IMPLEMENT "P2P" AS A BUZZWORD

Before selecting a networking architecture, analyze:

- browser restrictions;
- NAT traversal;
- WebRTC;
- device availability;
- mobile background restrictions;
- desktop availability;
- offline behavior;
- local networking;
- encrypted transport;
- relay requirements;
- TURN bandwidth costs;
- remote access;
- permissions;
- caching;
- file integrity;
- revoked shares;
- discoverability;
- device identity;
- attack surfaces.

The MVP does **not** require a perfect global decentralized storage network.

Do not waste months building one.

The first implementation may be a hybrid.

Example conceptual architecture:

**VYBZ Cloud Control Plane**

↕

**Authenticated Creator Account**

↕

**Desktop / Mobile Asset Node**

↕

**Local Creator Files**

Remote VYBZ clients should receive authorized access only when an Asset Node is available or when the creator has explicitly enabled some future caching/storage mechanism.

The interface must honestly communicate availability.

Examples:

- Available
- Device Offline
- Local Only
- Shared
- Private
- Syncing
- Remote Access Unavailable

Do not pretend locally hosted files magically remain globally available after the hosting computer is turned off.

---

# 10. PRIVACY AND FILE CONTROL

This architecture should produce a genuine user benefit, not merely save VYBZ money.

Creator files are extremely sensitive.

Therefore:

- private files are private by default;
- sharing is explicit;
- public exposure is explicit;
- local assets must not silently become public;
- access should use scoped authorization;
- sharing links should be revocable;
- device identity should be authenticated;
- file hashes should be recorded where useful;
- transport should be encrypted;
- secrets must never be embedded in the client;
- indexing should reveal the minimum information necessary;
- metadata exposure must respect visibility;
- remote users must never be allowed to browse arbitrary creator filesystem paths.

The Asset Node exposes **authorized assets**, not a creator's filesystem.

That distinction is absolute.

---

# 11. DESKTOP APPLICATION

The desktop application should ultimately become the strongest VYBZ client.

Its responsibilities may include:

- local asset indexing;
- folder registration;
- filesystem watching;
- hashing;
- metadata extraction;
- thumbnail generation;
- waveform generation;
- preview generation;
- local playback;
- local search;
- project management;
- asset organization;
- version tracking;
- secure remote access;
- broadcast capture;
- provenance collection;
- controlled sharing;
- creator tools;
- synchronization with the VYBZ control plane.

Do not duplicate web functionality unnecessarily.

Use a shared application model and shared components wherever the existing architecture allows it.

Desktop-specific functionality should primarily exist where native operating-system access provides a genuine advantage.

---

# 12. MOBILE APPLICATION

Mobile must not become an abandoned companion application.

The mobile client should ultimately allow creators to:

- manage their account;
- view their workspace;
- browse their catalog;
- organize assets;
- preview works;
- publish;
- update profiles;
- communicate;
- VYB creators;
- follow creators;
- watch streams;
- perform audio broadcasts;
- selectively register compatible files from device storage;
- act as a limited Asset Node where the operating system permits it.

However:

Do not falsely promise persistent mobile hosting when Android or iOS background execution policies prevent it.

Design around platform reality.

Desktop, mobile, and web should share the same creator identity and metadata state while having platform-specific capabilities.

---

# 13. WEB OS

`vybz.cloud` becomes the universal browser-accessible VYBZ environment.

Its purpose is not to contain every original creator file.

Its purpose is to provide universal access to the creator's VYBZ environment.

The web application should be capable of showing:

- creator identity;
- projects;
- works;
- metadata;
- collections;
- availability;
- public content;
- authorized private content;
- social relationships;
- live status;
- provenance;
- communication;
- creator tools that function safely in-browser.

When a linked Asset Node is online, additional content may become available.

This relationship should eventually feel nearly seamless.

---

# 14. LIVE CREATION

VYBZ should evolve livestreaming around **the act of creation itself.**

Creators should eventually be able to broadcast:

### SCREEN / WINDOW
A selected desktop window, application, display, or compatible capture source.

### AUDIO + SCREEN
Creation process plus creator audio.

### AUDIO ONLY
Creator audio without a visual feed.

### CAMERA
Where appropriate.

When no visual broadcast is present, the Creator Profile banner may transform into an audio-reactive live environment using:

- waveform visualization;
- spectrum visualization;
- reactive artwork;
- creator-selected visual themes;
- procedural motion.

Do not turn this into decorative nonsense at the expense of performance.

Audio-reactive visuals should be GPU-conscious and degrade gracefully.

---

# 15. LIVE COMMUNICATION

During broadcasts, viewers should eventually be able to:

- watch;
- listen;
- VYB;
- follow;
- participate in public chat;
- privately message where allowed;
- view the creator profile;
- inspect the Work or Project associated with the session.

Reuse existing communication infrastructure wherever practical.

Do not build separate chat systems for every product surface.

---

# 16. "VYB"

For the initial social interaction model:

**VYB** becomes the lightweight positive creator interaction.

It can conceptually represent:

- appreciation;
- support;
- resonance;
- acknowledgment.

Avoid immediately introducing complicated engagement scoring.

A user should also be capable of following another creator.

Tipping may be implemented later.

Do not make payments a blocker for the Creator OS pivot.

---

# 17. VALIDATE HUMANITY

This is a major long-term differentiator and must be engineered carefully.

A creator participating in VYBZ Live should accumulate **creation provenance evidence**.

Potential evidence may include:

- authenticated creator identity;
- Live Session ID;
- session start;
- session end;
- device identity;
- capture source metadata;
- timestamps;
- creator actions;
- relevant generated file hashes;
- project associations;
- Work associations;
- asset hashes;
- version hashes;
- signed VYBZ records;
- session-to-file relationships.

A creator should eventually be capable of selecting an eligible final file and choosing:

> **Validate Humanity**

VYBZ then attempts to associate the final asset with evidence collected during relevant creative sessions.

However:

## DO NOT CLAIM ABSOLUTE PROOF OF HUMAN AUTHORSHIP UNLESS THE EVIDENCE ACTUALLY SUPPORTS THAT CLAIM.

The technically defensible initial concept should be closer to:

> **Human Creation Provenance**

or

> **VYBZ Humanity Attestation**

The system certifies that VYBZ possesses evidence associating the creator, identified creation sessions, and a submitted asset.

It does not claim omniscient knowledge of everything that happened outside the observable system.

This distinction is essential.

---

# 18. PROVENANCE EMBEDDING

Where technically appropriate, VYBZ may embed provenance information directly inside supported files.

Never corrupt the original file.

Preferred approach:

1. hash original;
2. preserve original;
3. generate provenance record;
4. sign provenance record;
5. associate record with Work and creator;
6. optionally embed standardized metadata into a copy;
7. verify resulting file;
8. expose independently verifiable provenance metadata.

Research and prefer legitimate metadata/provenance standards when available instead of inventing proprietary formats unnecessarily.

The provenance system itself should remain media-agnostic wherever possible.

---

# 19. SOCIAL NETWORKING

VYBZ should become a network **between creators**, not another attention-maximization machine.

Initial social primitives should remain simple:

- Creator Profiles
- Follow
- VYB
- Live
- Public chat
- Private communication
- Shares
- Collections
- Activity

Do not introduce:

- engagement farming;
- arbitrary ranking metrics;
- fake trends;
- manipulative notifications;
- algorithmic addiction loops;
- meaningless gamification.

Discovery should initially favor explicit creator metadata, relationships, categories, and real activity.

---

# 20. MONETIZATION

Monetization must not block the first Creator OS release.

Capabilities that may be introduced later include:

- tipping;
- creator subscriptions;
- paid Works;
- digital asset sales;
- marketplace functionality;
- premium creator tools;
- storage upgrades;
- hosted availability;
- provenance services;
- professional portfolio features.

Reuse any existing commerce infrastructure that can safely support those capabilities.

Do not rebuild payment infrastructure merely to conform to this pivot.

---

# 21. COST LAW

Every implementation decision must account for VYBZ's severe budget limitation.

### DEFAULT FINANCIAL RULE:

> **$0 incremental recurring cost is preferred.**

When choosing between architectures, rank them using:

1. existing infrastructure;
2. existing project dependencies;
3. open-source/self-hosted solution;
4. free-tier service;
5. extremely inexpensive managed service;
6. paid infrastructure only where genuinely necessary.

For every proposed new external service, provide:

- purpose;
- necessity;
- existing alternative;
- self-hosted alternative;
- free-tier limits;
- expected cost at low usage;
- expected cost if usage grows;
- migration risk.

Do not introduce vendors merely because implementation documentation is convenient.

Centralized hosting of every user's original creative catalog is specifically **not** the preferred architecture.

---

# 22. DEVELOPMENT AUTHORIZATION

You are explicitly authorized to make reasonable engineering changes necessary to implement this direction, including:

- repository inspection;
- branch creation;
- documentation;
- refactoring;
- component creation;
- route changes;
- schema additions;
- migrations;
- API changes;
- type changes;
- new tests;
- removal of obsolete imports;
- feature flags;
- module isolation;
- dependency additions;
- architectural adapters;
- native bridges;
- synchronization systems;
- local agents;
- build configuration changes;
- interface improvements.

Do not repeatedly stop development to request approval for ordinary reversible engineering decisions.

Use professional judgment.

Document major decisions.

Proceed.

However, executive authorization to build this project is **not blanket authorization to create uncontrolled financial liabilities or irreversible destruction.**

Pause before:

- purchasing services;
- provisioning substantial paid infrastructure;
- deleting production data;
- exposing secrets;
- rotating credentials without necessity;
- performing an irreversible production migration;
- changing domain ownership;
- entering external legal agreements.

For these cases, present the blocker and cheapest safe resolution.

---

# 23. NO REWRITE LAW

A total rewrite is prohibited unless repository analysis produces overwhelming technical evidence that continuation is impossible.

"Cleaner architecture" is not sufficient justification.

"Would be easier" is not sufficient justification.

"This technology is newer" is not sufficient justification.

Every rewrite proposal must answer:

> Why can the existing implementation not be adapted?

If adaptation is practical, adapt it.

---

# 24. PHASED EXECUTION MODEL

Development must proceed through controlled phases.

Every phase must contain:

### OBJECTIVE
What this phase accomplishes.

### EXISTING SYSTEMS REUSED
What existing VYBZ functionality is being preserved.

### CHANGES
Specific implementation work.

### FILES / SYSTEMS AFFECTED
Concrete code areas.

### ACCEPTANCE CRITERIA
Observable definition of complete.

### TESTS
How completion is verified.

### COST IMPACT
Expected new recurring cost.

### RISKS
Known failure modes.

### ROLLBACK
How the phase can be reversed.

Do not create enormous unreviewable changesets.

Prefer small, coherent commits.

---

# 25. PHASE 0: FORENSIC CODEBASE AUDIT

## NO PRODUCT REWRITE DURING THIS PHASE.

First determine reality.

Inspect:

- repository status;
- branches;
- packages;
- application boundaries;
- web;
- desktop;
- mobile;
- backend;
- APIs;
- auth;
- database;
- storage;
- realtime;
- streaming;
- upload pipeline;
- local filesystem capabilities;
- media pipeline;
- Library;
- creator profiles;
- social functionality;
- messaging;
- live functionality;
- payments;
- marketplace;
- tool surfaces;
- design system;
- routing;
- state management;
- tests;
- build system;
- deployment;
- documentation;
- migrations;
- feature flags;
- abandoned implementations;
- hidden functionality.

Produce:

## A. CURRENT REALITY MAP

What actually exists.

Not what outdated documentation says exists.

## B. REUSE MATRIX

| Existing Capability | Status | Creator OS Role | Action |
|---|---|---|---|
| Feature | Working/Partial/Broken | Future purpose | Keep/Adapt/Integrate/Hide/Archive |

## C. ARCHITECTURE MAP

Show how the existing major systems connect.

## D. DATA MODEL MAP

Identify existing concepts that can represent:

- creator;
- project;
- work;
- asset;
- collection;
- session;
- provenance;
- publication.

## E. DESIGN SYSTEM MAP

Identify the existing interface primitives that become Creator OS foundations.

## F. TECHNICAL DEBT BLOCKERS

Only list debt that materially prevents the pivot.

Do not produce a generalized complaint document about imperfect code.

## G. COST MAP

Identify services currently capable of generating recurring cost.

## H. MINIMUM PIVOT PATH

Determine the smallest number of changes capable of making the application unmistakably become the beginnings of the Creator OS.

---

# 26. PHASE 1: PRODUCT AUTHORITY AND INFORMATION ARCHITECTURE

Once Phase 0 establishes reality:

Create or update the authoritative product documentation.

There must be **one clear current product definition**.

Outdated product decisions must be explicitly superseded rather than silently contradicted.

Define the new primary application hierarchy.

Conceptually:

```text
VYBZ
├── Workspace
│   ├── Projects
│   ├── Library
│   ├── Collections
│   ├── Activity
│   └── Tools
│
├── Creator Profile
│   ├── Works
│   ├── Collections
│   ├── Live
│   ├── About
│   └── Provenance
│
├── Network
│   ├── Following
│   ├── Discover
│   ├── Live
│   └── Messages
│
└── Devices
    ├── Desktop Node
    ├── Mobile Node
    └── Availability
```

Adapt this to the actual codebase.

Do not create navigation for functionality that does not exist merely to make screenshots appear complete.

---

# 27. PHASE 2: CREATOR OS SHELL

Transform the existing application shell into the new Creator OS orientation.

This should be the first visible product pivot.

Primary objectives:

- Creator OS terminology;
- creator-centric navigation;
- workspace;
- generalized Library;
- Creator Profile;
- device awareness;
- existing design system retained;
- existing useful tools exposed contextually.

At the completion of this phase, a person opening VYBZ should understand:

> "This is where my creative work lives."

Not:

> "This is another music social app."

And not:

> "This is a generic cloud storage service."

---

# 28. PHASE 3: UNIVERSAL LIBRARY + LOCAL ASSET NODE MVP

This is one of the most important technical phases.

Create the smallest real implementation proving that:

1. a creator can register files/folders from their computer;
2. VYBZ can index them safely;
3. VYBZ can represent them as creative assets;
4. VYBZ Cloud understands their metadata;
5. original content remains local;
6. the creator can browse that catalog through the VYBZ environment;
7. availability is accurately represented;
8. selected assets can be explicitly shared.

Start with desktop if that produces the strongest result using the existing codebase.

Do not attempt global decentralized storage before proving the basic architecture.

---

# 29. PHASE 4: CREATOR PROFILE 2.0

Convert Creator Profile into the living portfolio.

Implement the minimum modular model necessary to support multiple creative disciplines.

At minimum, prove profiles can represent more than audio.

Example media:

- audio;
- image;
- video;
- arbitrary downloadable file;
- project card;
- external/demo link where appropriate.

Do not attempt every imaginable asset renderer.

Build an extensible renderer architecture.

---

# 30. PHASE 5: LIVE CREATION

Adapt existing streaming/live functionality wherever possible.

The first useful Live MVP should support the strongest path that existing architecture can deliver cheaply.

Priority:

1. screen/window broadcast;
2. audio;
3. creator identity;
4. viewer access;
5. public chat;
6. profile integration;
7. session logging.

Audio-only mode should activate the Creator Profile reactive visual presentation when practical.

---

# 31. PHASE 6: CREATION PROVENANCE MVP

Once Live Session infrastructure exists:

Create session records.

Capture trustworthy events.

Associate sessions with Projects and Works.

Hash relevant assets.

Create signed provenance records.

Expose provenance history.

Then implement the first iteration of:

> **Validate Humanity**

Use defensible language.

The MVP can say:

> "This file is associated with verified VYBZ creation sessions."

It must not say:

> "VYBZ mathematically proves no AI was involved."

Those are not equivalent statements.

---

# 32. PHASE 7: SOCIAL CREATOR NETWORK

Integrate:

- VYB;
- Follow;
- Live discovery;
- messaging;
- creator activity.

Reuse existing systems.

Do not rebuild social infrastructure already present.

Keep the network centered around creators and creative work.

---

# 33. PHASE 8: MOBILE ASSET PARTICIPATION

Extend the Asset Node concept to compatible mobile capabilities.

The mobile implementation should distinguish between:

- files available now;
- files available only while application is active;
- files stored on another linked device;
- cloud metadata;
- public media;
- unavailable local content.

The application must communicate this state clearly.

---

# 34. PHASE 9: HARDENING

Only after the fundamental loop works, invest heavily in optimization.

Audit:

- permissions;
- local agent security;
- remote access;
- authentication;
- session integrity;
- database policies;
- transport encryption;
- device revocation;
- malicious files;
- path traversal;
- metadata exposure;
- XSS;
- CSRF;
- content security;
- media parsing;
- WebRTC abuse;
- rate limiting;
- chat abuse;
- stream abuse;
- provenance tampering.

---

# 35. THE FIRST REAL CREATOR OS LOOP

Every engineering decision should move toward this experience:

```text
CREATE ACCOUNT

        ↓

OPEN VYBZ

        ↓

CONNECT CREATOR DEVICE

        ↓

REGISTER CREATIVE FOLDER

        ↓

VYBZ INDEXES AUTHORIZED CONTENT

        ↓

ORGANIZE INTO PROJECTS / WORKS

        ↓

VIEW THROUGH CREATOR WORKSPACE

        ↓

SELECT WHAT BECOMES PUBLIC

        ↓

SHOWCASE ON CREATOR PROFILE

        ↓

GO LIVE WHILE CREATING

        ↓

CREATION SESSION IS RECORDED

        ↓

FINALIZE WORK

        ↓

VALIDATE HUMANITY / CREATE PROVENANCE

        ↓

SHARE WITH THE CREATOR NETWORK
```

That is the product loop.

Protect it from feature bloat.

---

# 36. PERFORMANCE RULES

Creator software must feel immediate.

Prioritize:

- lazy loading;
- virtualization;
- incremental indexing;
- background workers;
- native file APIs where appropriate;
- streaming rather than unnecessary full-file loads;
- cached metadata;
- thumbnails rather than original images where possible;
- waveform caching;
- cancellation;
- resumability;
- batching;
- bounded memory consumption.

Do not allow a creator with 50,000 assets to destroy the application merely because testing happened with twelve MP3s.

Design for large catalogs even if the initial MVP tests smaller ones.

---

# 37. DEPENDENCY RULE

Before adding a dependency, determine:

1. whether the repository already solves the problem;
2. whether native platform capability solves it;
3. whether a small implementation is safer;
4. whether the dependency is maintained;
5. its license;
6. its bundle impact;
7. its security history;
8. whether it introduces a paid service.

Avoid dependency accumulation.

---

# 38. TESTING LAW

Every pivot phase must preserve existing functioning behavior unless explicitly superseded.

Minimum validation includes where applicable:

```text
lint
typecheck
unit tests
integration tests
build
desktop build
mobile build
critical E2E paths
```

Add focused tests for new architectural boundaries.

Especially test:

- permissions;
- asset visibility;
- local/remote state;
- creator isolation;
- sharing;
- device disconnection;
- deleted local files;
- renamed files;
- offline operation;
- revoked access;
- large directories.

---

# 39. GIT DISCIPLINE

Before modifying code:

```text
git status
git branch --show-current
git log --oneline -n 10
```

Never assume repository state.

Use coherent commits.

Avoid mixing unrelated cleanup into product commits.

Each phase should leave the repository in a working state.

Record migration requirements.

Never hide failures by weakening tests.

Never force green builds using meaningless mocks.

---

# 40. IMPLEMENTATION DECISION HIERARCHY

When faced with competing solutions, choose using this order:

### 1. Does existing VYBZ functionality already solve most of this?

Reuse it.

### 2. Can existing functionality be generalized?

Adapt it.

### 3. Can a small adapter connect existing systems?

Integrate them.

### 4. Can the feature be deferred without breaking the Creator OS loop?

Defer it.

### 5. Is genuinely new functionality required?

Build the smallest extensible implementation.

This hierarchy should prevent another expensive cycle of replacing systems we already paid to build.

---

# 41. DO NOT OVERENGINEER THE FIRST RELEASE

The Creator OS does not require all long-term features before becoming valuable.

The first convincing release does **not** require:

- global decentralized storage;
- perfect peer-to-peer connectivity;
- cryptocurrency;
- blockchain;
- tipping;
- creator subscriptions;
- a complete marketplace;
- AI recommendations;
- complex ranking;
- advanced collaboration;
- universal file preview;
- every creator discipline;
- perfect provenance;
- massive infrastructure.

It requires a believable foundational loop.

Focus relentlessly on that.

---

# 42. INITIAL SHIPPABLE TARGET

The fastest meaningful Creator OS milestone should approximately prove:

### A creator can:

1. sign into VYBZ;
2. enter their Workspace;
3. connect/register creative files from a desktop device;
4. see those files inside the VYBZ Library;
5. organize files into at least a basic Project or Work;
6. maintain original files locally;
7. selectively expose a Work;
8. see it appear on their Creator Profile;
9. view another Creator Profile;
10. VYB or Follow that creator.

If existing Live functionality can safely be integrated into this first milestone, include it.

If doing so materially delays the foundational asset architecture, Live becomes the immediately following milestone.

---

# 43. CURSOR OPERATING BEHAVIOR

From this point forward:

## DO

- inspect before editing;
- verify assumptions;
- favor existing code;
- make decisions;
- proceed autonomously on reversible work;
- keep changes small;
- document important architecture;
- maintain current theme;
- generalize music-specific concepts carefully;
- preserve useful functionality;
- aggressively control cost;
- surface actual blockers;
- implement working vertical slices;
- use measurable acceptance criteria.

## DO NOT

- start another redesign;
- rewrite the application;
- delete large sections impulsively;
- create speculative infrastructure;
- invent functionality and claim it exists;
- obscure broken functionality;
- add vendors casually;
- centralize original user files without justification;
- build "P2P" theater;
- make unverifiable claims about human authorship;
- stop repeatedly for trivial approval;
- spend days polishing documentation while the core experience remains unusable;
- generate giant architectural systems before validating their smallest useful form.

---

# 44. REQUIRED FIRST RESPONSE

Your first response to this executive directive must **not begin coding immediately.**

Perform Phase 0.

Then return an implementation brief using exactly this structure:

# VYBZ CREATOR OS PIVOT ANALYSIS

## 1. Repository Reality
What currently exists.

## 2. Existing Architecture
Web, desktop, mobile, backend, data, realtime, storage, streaming.

## 3. Reusable Systems
What can directly support Creator OS.

## 4. Systems Requiring Adaptation
What needs reframing or generalization.

## 5. Systems to Hide or Archive
Nothing deleted.

## 6. Current Design System
What becomes the permanent visual foundation.

## 7. Universal Creator Data Model
How the existing schema can support Creators, Projects, Works, Assets, Versions, Sessions, and Provenance.

## 8. Local-First Architecture
The cheapest technically credible implementation using the systems we already possess.

## 9. Live Architecture
How existing streaming functionality can become Live Creation.

## 10. Humanity Validation Architecture
The smallest defensible provenance implementation.

## 11. Security Analysis
Especially local asset hosting and remote sharing.

## 12. Cost Analysis
Current services plus any proposed additions.

## 13. Minimum Creator OS Vertical Slice
The smallest amount of engineering necessary to make this pivot real.

## 14. Phased Execution Plan
Ordered phases with acceptance criteria.

## 15. Exact First Changes
Specific files/modules/routes/components.

## 16. Risk Register
Only material risks.

## 17. Recommended First Commit
One safe, reversible, high-leverage starting point.

---

# 45. AFTER THE AUDIT

After Phase 0, do not return with vague conceptual recommendations.

Translate findings into concrete implementation instructions.

For each implementation phase specify:

```text
PHASE
OBJECTIVE
WHY NOW
EXISTING CODE REUSED
FILES TO MODIFY
FILES TO CREATE
SCHEMA IMPACT
API IMPACT
DESKTOP IMPACT
WEB IMPACT
MOBILE IMPACT
SECURITY IMPACT
COST IMPACT
TEST PLAN
ACCEPTANCE CRITERIA
ROLLBACK
```

Then execute the highest-confidence reversible work in sequence.

Do not attempt five phases simultaneously.

Finish vertical slices.

Verify them.

Continue.

---

# 46. SUCCESS CONDITION

The pivot succeeds when VYBZ stops feeling like a collection of experiments and begins feeling like a single coherent product:

> A private creative workspace connected to a public creator identity and a network of other creators.

The creator should retain control of their original work.

Their desktop and mobile devices should gradually become extensions of their VYBZ environment.

Their Creator Profile should become a living representation of what they make.

Their Live sessions should demonstrate the process behind the work.

Their provenance records should connect process to outcome.

Their social network should connect them to people who create rather than merely consume.

The resulting system should feel like something that should have existed years ago.

---

# 47. FINAL DIRECTIVE

The era of uncontrolled pivots ends here.

Do not interpret this instruction as permission to throw away the past.

Interpret it as an instruction to finally give the existing technology a larger, coherent purpose.

The substantial foundation already inside this repository is an advantage.

Find it.

Map it.

Preserve it.

Generalize it.

Connect it.

Then build upward from it.

**VYBZ is no longer being developed as a collection of music features.**

**VYBZ is being developed as the operating environment for digital creators.**

The immediate mission is not to construct the entire future.

The immediate mission is to identify and implement the **shortest technically credible path from the VYBZ that exists today to the first unmistakably real version of the VYBZ Creator OS.**

Proceed accordingly.