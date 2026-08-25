/**
 * VYBZ invariants — the rules, in code.
 *
 * Doctrine used to live in prose, and sixteen gate tests grepped that prose to
 * enforce it. That made documents load-bearing: rewording a sentence could turn
 * the build red, and two documents could contradict each other with nothing to
 * catch it.
 *
 * This file is the single machine-readable source. `PRODUCT.md` explains the
 * intent for humans; this file is what tests enforce. If a rule is not here, no
 * test can protect it — so it is not a rule.
 */

/* ------------------------------------------------------------------------- */
/* Delivery vocabulary                                                        */
/* ------------------------------------------------------------------------- */

/**
 * Permitted words for describing how far along something is.
 * "Complete" is deliberately absent: merged is not delivered, and a green test
 * run only proves the code compiles.
 */
export const DELIVERY_STATES = [
  "DOCUMENTED ONLY",
  "STUB OR SCAFFOLD",
  "INFRASTRUCTURE ONLY",
  "NATIVE-PLATFORM ONLY",
  "PARTIALLY IMPLEMENTED",
  "IMPLEMENTED BUT NOT DELIVERED",
  "DEPLOYED BUT UNVERIFIED",
  "DELIVERED AND PRODUCTION-VERIFIED",
] as const;

export type DeliveryState = (typeof DELIVERY_STATES)[number];

/** Phrase used wherever a value is unknown. Never substitute a plausible default. */
export const NOT_MEASURED = "Not measured" as const;

/* ------------------------------------------------------------------------- */
/* Principles                                                                 */
/* ------------------------------------------------------------------------- */

export const PRINCIPLES = {
  /** No number may be shown that was not measured. Unknown reads "Not measured". */
  neverFabricateAMeasurement: true,
  /** Merged, reachable and deployed are different things. See DELIVERY_STATES. */
  repositoryCompletionIsNotDelivery: true,
  /** Playback never applies undisclosed processing. Simulations are labelled. */
  playbackIsDryAndDisclosed: true,
  /** Removed code is hidden and recoverable, never deleted. */
  hideNeverDelete: true,
  /** Attention is earned by giving attention. It can never be purchased. */
  attentionCannotBeBought: true,
  /** Money follows a session (tips, products, tools). It never becomes hosting time. */
  moneyFollowsTheSessionNotTheClock: true,
  /** Hosting is viewpoint-neutral. Illegal content is still refused. */
  viewpointNeutralHosting: true,
  /** Original creative files stay on the creator's device unless they explicitly publish. */
  originalsStayLocalByDefault: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Prohibitions                                                               */
/* ------------------------------------------------------------------------- */

export const PROHIBITIONS = {
  /** Dating, romance, meetup and swipe matching. Permanently out of scope. */
  datingOrRomance: true,
  /** VYBZ prepares releases. It does not deliver to DSPs and must not claim to. */
  dspDeliveryClaims: true,
  /** Domain code must reach native platforms through the Platform Bridge. */
  directNativeSdkImportsInDomainCode: true,
  /** Public vanity counts (followers, plays) as social proof. See PRODUCT.md. */
  publicVanityMetrics: true,
  /** Buying ATC, paying to listen by default, or paying for rank / homepage. */
  payingForClockOrRank: true,
  /** Ticketed events are out of this lock until a later decision. */
  ticketedEventsInThisLock: false,
} as const;

/* ------------------------------------------------------------------------- */
/* Frozen contracts                                                           */
/* ------------------------------------------------------------------------- */

/**
 * Shipped behaviour that is extended through versioned interfaces rather than
 * redesigned. Frozen does not mean deleted — the code stays in the tree.
 */
export const FROZEN_CONTRACTS = {
  /** AudioBus stays a dry HTMLAudioElement. No Web Audio graph on the play path. */
  vdockDryPlayback: true,
  /** Ambient and simulation playback must carry a human-readable disclosure. */
  vdockSignalDisclosure: true,
  /** A/B compare is loudness-matched for listening only; downloads stay unmatched. */
  vdockComparePreview: true,
  /** Multi-human collaboration stays in the tree, imported by nothing. */
  multiHumanCollaboration: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Living Profile (PRODUCT.md v9 / decision 0011)                             */
/* ------------------------------------------------------------------------- */

/**
 * Product identity. The human is the root object. Their VYBZ is the interface.
 * Creator OS, live, library, tools, and commerce emerge from that profile.
 */
export const LIVING_PROFILE = {
  /** One VYBZ identity. Discipline labels are optional, never prisons. */
  oneIdentity: true,
  /** No separate Creator Account. Creation is optional. */
  noForcedCreatorOnboarding: true,
  /** Joining does not require publishing Creative Work. */
  creationIsOptional: true,
  /** Owner control and visitor experience are one object, two permissions. */
  oneProfileTwoPerspectives: true,
  /** Upload once. Appear in many places without duplicating the asset. */
  oneLibrary: true,
  /** The profile is the product. Nothing else is the real app. */
  profileIsTheProduct: true,
  /** Social primitives are first-class with zero published work. */
  communityFirst: true,
  /** The unit of creation is Creative Work, not a song. */
  creativeWorkIsUniversal: true,
  /** Tools open from Work. They are not kingdoms. */
  toolsServeWork: true,
  /** Reuse, extend, hide. Do not bulldoze when the definition gets clearer. */
  refineBeforeReplace: true,
  /** Structured customization. No JS/CSS injection. */
  customizationWithoutScriptInjection: true,
  /** A file entering VYBZ is not automatically content. */
  privateByDefaultPublicByIntent: true,
  /** Notifications report events. They do not manufacture urgency. */
  socialSignalsInformNotManipulate: true,
  /** More capability must not mean more permanent navigation. */
  quieterInterfaceAsPowerGrows: true,
  /** Do not ship a grid of stat cards as the product. */
  noGenericDashboard: true,
  /** Signed-in `/` is the owner's VYBZ. Workspace stays at `/workspace`. */
  loggedInHomeIsMyVybz: true,
  /** Top bar stays quiet: VYBZ · Search · + · Chat · Alerts · Me. No kingdom labels there. */
  defaultChromeIsQuiet: true,
  /** Desktop mounts one adapted PrimaryRail — not a parallel navigation system. */
  desktopPrimaryRail: true,
  /** Narrow viewports collapse the rail into an accessible drawer. */
  mobileNavDrawer: true,
  /** One Stage File. Owner controls vs visitor experience. View as Visitor is the check. */
  ownerVisitorDualMode: true,
  /** Stage File works go through a kind → renderer registry. Unknown kinds do not crash. */
  profileModuleRegistry: true,
  /** Library places existing work on the Stage File. No second catalog. No duplicate upload. */
  libraryToProfilePipeline: true,
  /** Owner rearranges existing Stage File modules. No theme engine. No CSS/JS injection. */
  profileModularArrangement: true,
  /** Owner hides existing sections from the public VYBZ. Arrange still shows them. No rename, invent, or theme. */
  profileSectionHide: true,
  /** Core workflows must not depend on a single sense or input method. Echo builds on this later. */
  everyExperienceHasAnEquivalent: true,
  /** Owner home surfaces attention through ambient indicators, not dashboard panels. */
  profileOwnerAmbientAttention: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Generate (local Stable Audio 3 worker — a tool, not a surface)             */
/* ------------------------------------------------------------------------- */

/**
 * + → Generate makes a private Library file. It is not a kingdom, not a
 * session recap, and not placed on My VYBZ until the owner Places it.
 */
export const GENERATE_AUDIO = {
  /** Generate is a tool on +, not a permanent navigation destination. */
  toolNotKingdom: true,
  /** Generated bytes enter the existing upload queue. */
  intakeIsUploadQueue: true,
  /** A generated file stays private until Place. */
  privateUntilPlace: true,
  /** The file is labeled generated. It is not a live recap. */
  labeledGenerated: true,
  /** Stability Community License attribution on the sheet. */
  poweredByStabilityAi: true,
  /** First slice is the local small-music worker, not the Stability API. */
  localWorkerOnly: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Creator Operating System (decision 0010 — now a capability of the profile) */
/* ------------------------------------------------------------------------- */

/**
 * What the living profile becomes when the person creates.
 * Music-specific surfaces are specializations of Creative Work, not the unit.
 */
export const CREATOR_OS = {
  /** Superseded by LIVING_PROFILE.profileIsTheProduct (decision 0011). */
  creatorOsIsTheProduct: false,
  /** Creator OS is the living profile under creation, not a separate product. */
  livingProfileBecomesCreatorOs: true,
  /** The fundamental unit is Creative Work, not a song. */
  workIsTheUnit: true,
  /** Music, film, games, software, and other disciplines share the same model. */
  musicIsASpecialization: true,
  /** Indexing a local file does not publish it. */
  indexingIsNotPublishing: true,
  /** Do not promise persistent mobile hosting when the OS will not allow it. */
  mobileDoesNotClaimPersistentHosting: true,
  /** Do not claim absolute proof of human authorship. */
  refusesAbsoluteHumanAuthorshipClaim: true,
  /** Changing gravity is not a rewrite. Adapt what exists. */
  noRewriteToPivot: true,
  /** Prefer $0 incremental recurring cost. */
  zeroIncrementalRecurringCostPreferred: true,
} as const;

/**
 * Phase 9 first slice — confine new Creator OS surfaces.
 * Not a claim that the directive audit list is finished.
 */
export const CREATOR_OS_HARDENING = {
  assetPathsStayInsideAuthorizedFolder: true,
  cloudMetadataHasNoFileBytes: true,
  transportReusesExistingCsp: true,
  followHasNoPublicCount: true,
  provenanceIsAssociationNotAuthorship: true,
  hardeningIsNotACompletedAudit: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Live mix audio streaming — a Creator OS capability                         */
/* ------------------------------------------------------------------------- */

/**
 * Live rooms, LiveKit, DAW ingest, and session provenance remain first-class
 * (decisions 0004–0009). They are not the product identity.
 */
export const LIVE_MIX_STREAMING = {
  /** Live is not the product identity. Profile is. */
  liveMixIsPrimary: false,
  /** Real-time live rooms remain a first-class Creator OS surface. */
  liveMixIsFirstClassSurface: true,
  /** Audio streaming uses LiveKit SFU stereo music mode (no telephony filtering). */
  losslessMusicAudioConstraints: true,
  /** Master bus audio capture via DAW broadcast plug-in (VST3 / CLAP / AU). */
  directDawBroadcastSupported: true,
  /** Android companion mode and mobile live streaming enabled via Platform Bridge. */
  androidMultiDeviceSync: true,
  /** Post-session products (packs, replay, stems) are allowed. They are not ATC. */
  postSessionPackMonetization: true,
  /** Going live burns Airtime Credits. Listening stays free. */
  hostingRequiresAtc: true,
  /** Sealed live sessions can emit a session-provenance package. */
  sessionProvenanceAvailable: true,
  /** Public /u/:id is the host Stage File. */
  publicStageFile: true,
} as const;

export const LIVE_AUDIO = {
  /** Live audio is a first-class Creator OS capability, not the product identity. */
  liveAudioIsACapability: true,
  /** Producers, artists, podcasters, talkers, open-mic, vent — same rooms. */
  hostsAreNotMusicOnly: true,
  /** Talk, podcast, and music are first-class on the host profile. */
  talkPodcastAndMusicAreFirstClass: true,
  /** ATC is the only hosting clock. */
  airtimeIsOnlyHostingClock: true,
  /** Go Live leads with screen/window capture, then audio. */
  screenWindowIsFirstHostPath: true,
  /** Audio-only reuses LiveKit; it does not fork a second stack. */
  audioOnlyReusesLivekit: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Session provenance (not an AI-negative proof)                              */
/* ------------------------------------------------------------------------- */

/**
 * Human / session provenance (decision 0006).
 * Proves a measured live session happened for an authenticated host.
 * Does not prove the audio was composed by a human or was not AI-generated.
 */
export const HUMAN_PROVENANCE = {
  /** Package is about a live_sessions row, not Living Mix and not 1:1 DM calls. */
  bindsToPublicLiveSession: true,
  /** Full strength only when airtime_ledger has host_consume for that session. */
  fullStrengthRequiresAtcBurn: true,
  /** Signing material stays on the server. Clients do not hold session private keys. */
  serverHoldsSigningMaterial: true,
  /** Client-sent mix hashes and pointer/MIDI flags are declared, not measured. */
  clientSignalsAreDeclared: true,
  /** We never assert the mix was not AI-generated. That is not measurable here. */
  refusesNotAiClaim: true,
  /** Existing forensic watermark + C2PA worker stay; this does not replace them. */
  doesNotReplaceForensicWatermark: true,
  /** A SHA computed in the host browser is declared, never measured. */
  clientAudioShaIsDeclared: true,
  /** A measured audio SHA requires stored bytes. Missing is Not measured. */
  measuredAudioShaRequiresStoredBytes: true,
  /** assets.sha256 may be bound after seal. The file-is-the-mix link stays declared. */
  assetToSessionLinkIsDeclared: true,
  /** C2PA on the file is not inferred from a missing ledger row. */
  c2paOnFileIsNotInferred: true,
  /** Validate Humanity is an association with sealed sessions, not authorship proof. */
  validateHumanityIsAssociationNotAuthorship: true,
  /** Hosts can read their sealed session history. */
  exposesProvenanceHistory: true,
  /** A Work or Project may be declared as associated with a sealed live. */
  associatesSessionWithWork: true,
} as const;

/** Exact MVP sentence. Never upgraded to a not-AI or Human-certified claim. */
export const WORK_SESSION_CLAIM =
  "This file is associated with verified VYBZ creation sessions." as const;

export const PROVENANCE_STRENGTHS = ["thin", "full"] as const;
export type ProvenanceStrength = (typeof PROVENANCE_STRENGTHS)[number];

export const PROVENANCE_EVENT_TYPES = ["open", "atc_burn", "signal", "seal"] as const;
export type ProvenanceEventType = (typeof PROVENANCE_EVENT_TYPES)[number];

/* ------------------------------------------------------------------------- */
/* Artist / producer Stage File                                               */
/* ------------------------------------------------------------------------- */

/**
 * Public profile (decision 0007). A stage, not a social graph.
 */
export const ARTIST_STAGE_PROFILE = {
  /** Live nights are the lead surface on /u/:id. */
  liveNightsLead: true,
  /** Connect is a request. The other person must accept. */
  connectIsARequest: true,
  /** Book-a-session opens a DM and must say it is not a calendar. */
  bookIsAMessageNotACalendar: true,
  /** Profile cells are measured or omitted. Unknown is not invented. */
  measuredStatsOnly: true,
  /** No public follower or play-count vanity. */
  noVanityFollowerCounts: true,
  /** Seal copy is Session provenance, never “Human certified.” */
  sessionSealNotHumanCertified: true,
  /** /u/:id stays resolvable. The old storefront is not deleted. */
  routeStaysResolvable: true,
  /** Talk, podcast, and music share this profile. It is not artist-only. */
  notArtistOnly: true,
  /** Stage File works are not audio-only. */
  moreThanAudio: true,
  /** New media kinds register a renderer; they do not fork the profile. */
  extensibleWorkRenderer: true,
} as const;

/**
 * Social layer around creation (directive Phase 7). Reuse existing primitives.
 * Follow is not Connect. VYB is not a ranking score.
 */
export const CREATOR_NETWORK = {
  vybIsWorkAcknowledgment: true,
  followIsUnidirectional: true,
  followIsNotConnect: true,
  noPublicFollowerCounts: true,
  liveDiscoveryReusesWhosLive: true,
  messagingReusesDirectMessages: true,
  activityReusesNotifications: true,
  networkCentersOnCreativeWork: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Airtime Credits (ATC) — live hosting commons                               */
/* ------------------------------------------------------------------------- */

/**
 * ATC is the hosting gate for live mix (decision 0005 / PRODUCT.md v4).
 * It is not Station Airtime. Station Airtime stays parked in CURRENCY / STATION.
 *
 * Policy numbers below are declared product law, not measurements of production.
 */
export const AIRTIME_CREDITS = {
  listeningIsAlwaysFree: true,
  hostingRequiresAtc: true,
  atcIsPurchasable: false,
  atcConvertsToMoney: false,
  moneyConvertsToAtc: false,
  atcIsTransferable: false,
  atcIsGiftable: false,
  serverAuthoritativeLedgerOnly: true,
  dailyFreeDoesNotStack: true,
  consumeDailyFreeFirst: true,
  clientsNeverTrustOwnBalance: true,
  /** Reception bonus and referral cannot mint until amounts are declared. */
  refuseUnmeasuredMint: true,
} as const;

/** Creation types whose mint amount is Not measured. Not a zero grant. */
export const ATC_UNMEASURED_MINTS = ["reception_bonus", "referral"] as const;

export const ATC_CREATION_TYPES = [
  "daily_grant",
  "listen_earn",
  "reception_bonus",
  "referral",
  "bootstrap",
  "admin_adjust",
] as const;

export const ATC_DESTRUCTION_TYPES = ["host_consume", "admin_adjust"] as const;

export type AtcLedgerType = (typeof ATC_CREATION_TYPES)[number];

/** Declared policy. Not a measurement of observed listen/host supply. */
export const ATC_POLICY = {
  secondsPerAtc: 1,
  dailyFreeGrantAtc: 7200,
  baseAtcPerVerifiedMinute: 50,
  hostStartMinimumAtc: 300,
  hostWarningRemainingAtc: 60,
  maxQualityMultiplier: 1.8,
  sparkMultiplier: 1.2,
  stayMultiplier: 1.15,
  discoveryMultiplier: 1.25,
  firstListenMultiplier: 1.1,
  newUserBootstrapDays: 7,
  newUserStarterAtc: 3600,
  heartbeatChunkSeconds: 30,
  hostBurnChunkSeconds: 30,
  maxConcurrentEarnSessions: 4,
  stayContinuousSeconds: 1200,
  discoveryViewerCeiling: 5,
} as const;

/* ------------------------------------------------------------------------- */
/* The Station economy (parked)                                               */
/* ------------------------------------------------------------------------- */

/**
 * Parked with decision 0004 / PRODUCT.md v3. Default product is Creator OS.
 * These values still bind the Station subsystem if it is switched on again.
 * Do not delete them. Do not use Airtime in the live mix marketplace.
 *
 * Two balances, one wallet, no bridge between them.
 *
 * Airtime is verified time and is machine-measured. V¢ is judged value and is
 * decided by a person. If either converts into the other, the platform's core
 * claim — that the attention here is real — becomes false.
 */
export const CURRENCY = {
  /** Airtime is earned only by answering prompts during verified listening. */
  airtimeIsPurchasable: false,
  /** Airtime must never become spendable money. */
  airtimeConvertsToVc: false,
  /** Money must never become the right to be heard. This is the one that matters. */
  vcConvertsToAirtime: false,
  /** Airtime is not transferable between accounts. */
  airtimeIsTransferable: false,
  /** V¢ remains the purchasable utility credit it already is. */
  vcIsPurchasable: true,
} as const;

export const STATION = {
  /** Exactly one synchronized station. Split only on measured demand. */
  stationCount: 1,
  /** Only reward-bearing surface on the platform. */
  rewardBearing: true,
  /** Reward-bearing playback cannot seek — live or replay. */
  lockedTransportWhenEarning: true,
  /** Publishing is always free. Only the guarantee is earned. */
  publishingRequiresAirtime: false,
  /** Prompt options must span positive, neutral and critical. */
  promptOptionsMustSpanRange: true,
  /**
   * Auto-placed prompts sit at measured structural moments (largest energy
   * change, opening, ending, longest quiet passage) — never at random, and
   * never described as a musical section we cannot detect.
   */
  autoPromptPlacementIsMeasured: true,
  /** Auto-placed prompts cost the same as authored ones. */
  autoPromptsAreFree: false,
  /** The artist is charged per answer received, not per prompt placed. */
  chargePerAnswerReceived: true,
  /** A listener who does not answer is recorded as "no response", never inferred. */
  nonResponseIsRecordedNotInferred: true,
} as const;

/**
 * Economy constants are deliberately absent.
 *
 * How much Airtime an answer earns, what an answer costs, and how many answers
 * the guarantee promises cannot be derived from anything measured yet. Inventing
 * them here would violate the first principle. They get set from observed
 * listening supply and release demand once the station is running.
 */
export const ECONOMY_CONSTANTS_STATUS = NOT_MEASURED;

/* ------------------------------------------------------------------------- */
/* Preservation                                                               */
/* ------------------------------------------------------------------------- */

/**
 * Nothing built is deleted. Surfaces leaving the default experience are hidden
 * from navigation and remain reachable in the tree and in git history.
 */
export const PRESERVATION = {
  deleteExistingFeatureCode: false,
  hideFromDefaultNavigation: true,
  keepRoutesResolvable: true,
} as const;

/* ------------------------------------------------------------------------- */
/* Gate registry                                                              */
/* ------------------------------------------------------------------------- */

/**
 * Every executable gate registers here. Gate tests assert their own membership,
 * so a gate cannot exist unregistered and an entry cannot outlive its gate.
 *
 * This replaces the previous convention of grepping AGENTS.md for a filename.
 */
export const GATE_REGISTRY = [
  "routeTruth",
  "m4Measurement",
  "m5Analysis",
  "m6Correction",
  "m7Translation",
  "m8Assembly",
  "m9Vdock",
  "m10SuiteRedesign",
  "m10StoreCommerce",
  "or032WorkingSet",
  "or034CorrectDesk",
  "or035WhatNext",
  "or036MidiMaker",
  "or037ConverterFormats",
  "or038PackMakerLibrary",
  "or039MarketDiscovery",
  "or040LandingDrop",
  "or041DawFolderLink",
  "or042AnalyzerReliability",
  "or043VibesRadio",
  "suiteUxCostRemoval",
  "socialFirstShell",
  "libraryCompleteness",
  "livingMix",
  "sparks",
  "reception",
  "stationLine",
  "accountMenu",
  "uploader",
  "packPipeline",
  "trackTools",
  "playbackAuthority",
  "dockVisuals",
  "featuredMiniPlayer",
  "chatIdentity",
  "alphaWelcome",
  "alphaKey",
  "perceptionEngine",
  "aiReviewPortal",
  "liveManifest",
  "airtimeCredits",
  "humanProvenance",
  "artistStageProfile",
  "liveAudio",
  "creatorOs",
  "livingProfile",
  "livingProfilePhase2",
  "generateAudio",
  "assetNode",
  "creatorNetwork",
  "creatorOsHarden",
] as const;

export type GateId = (typeof GATE_REGISTRY)[number];

export function isRegisteredGate(id: string): id is GateId {
  return (GATE_REGISTRY as readonly string[]).includes(id);
}
