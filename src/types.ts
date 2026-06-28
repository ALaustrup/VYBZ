// ---------------------------------------------------------------------------
// Domain types for MYVYB.
// Everything is anonymous by design — confessions never carry a real identity,
// only an ephemeral, generated alias.
// ---------------------------------------------------------------------------

/**
 * The two community reactions.
 * - "feel"  = Feel  (right swipe): a positive signal that boosts the post.
 * - "wild"  = Veil  (left swipe): the crowd burying a post; enough Veils
 *   progressively blur it for everyone (15 / 30 / 75 / 150 / 300 thresholds).
 * (The wire names stay feel/wild to keep the DB + reactions table unchanged.)
 */
export type Reaction = "feel" | "wild";

/** Binary gender, only ever present when a user explicitly opts in. */
export type Gender = "M" | "F";

/**
 * Permanent, publicly-visible account attributes. Once a field here is set it
 * can never be changed or removed — opting in is a one-way, public commitment.
 */
export interface Identity {
  gender?: Gender;
  age?: number;
  location?: string;
}

/** A self-authored personality prompt + answer shown on the profile. */
export interface ProfilePrompt {
  q: string;
  a: string;
}

/** An external link a user chooses to surface on their profile. */
export interface ProfileLink {
  label: string;
  url: string;
}

/**
 * Rich, optional profile data points — the "many bits of info" a user can
 * share to personalize their profile and power superior matchmaking. Public by
 * default; any top-level key listed in `hidden` is stripped from the public
 * profile server-side (but still improves the owner's own matches). Stored as a
 * single jsonb blob on profiles.profile (owner-private column).
 */
export interface ProfileDetails {
  /** Long-form, expressive bio (distinct from the legacy one-liner). */
  bio?: string;
  pronouns?: string;
  /** Declared interest tags — the strongest compatibility signal. */
  interests?: string[];
  /** What the user is here for (drives who they're shown). */
  lookingFor?: string[];
  /** Languages spoken. */
  languages?: string[];
  /** Single-select lifestyle/personality traits, keyed by trait id. */
  traits?: Record<string, string>;
  /** Free-text personality prompts. */
  prompts?: ProfilePrompt[];
  /** External links (socials, portfolio, etc.). */
  links?: ProfileLink[];
  /** Top-level keys the user has marked private. */
  hidden?: string[];
}

/**
 * Never Alone — ambient presence snapshot for the current user's age layer.
 * Powers the "people around you" indicator and Smart Routing so a user never
 * lands on a dead, empty app.
 */
export interface AmbientPresence {
  /** People active in the last few minutes (same age layer). */
  online: number;
  /** Open live streams the user is allowed to see. */
  live: number;
  /** People waiting in the random-chat queue. */
  roulette: number;
  /** Lifelines (peer supporters) available right now. */
  lifelines: number;
  layer: "teen" | "adult";
}

export interface Confession {
  id: string;
  /** Ephemeral anonymous alias (e.g. "Velvet Ghost"). */
  alias: string;
  /** Canonical username identity of the author (preferred over emoji handle). */
  username?: string;
  /** The confession body — the emotional core of the card. */
  text: string;
  /** Distance hint to reinforce the geo-first, "near you" mystery. */
  distance: string;
  createdAt: number;
  /**
   * Optional self-disclosure. Everything below is opt-in — a confession is
   * 100% anonymous unless the author chooses to attach any of these.
   */
  gender?: Gender;
  age?: number;
  /** A named area / neighborhood the author chose to share. */
  location?: string;
  /** Positive "Feel" tally (boosts the post). */
  feels: number;
  /** "Veil" tally — community burying; drives the stepped blur. */
  wilds: number;
  /** Whether the editorial team has featured this confession. */
  featured?: boolean;
  /** Deterministic seed so the procedural artwork is stable per card. */
  seed: number;
  /** "What happened next?" follow-up shown once you connect. */
  aftermath?: string;
  /** Backend author's profile id (for routing 1:1 DMs to the poster). */
  authorId?: string;
  /**
   * Optional background media — an uploaded photo/video or an AI-generated
   * image (data URL or Storage URL). Clear by default. (Field name is legacy;
   * it now carries images and videos.)
   */
  photo?: string;
  /** 'image' (default, incl. AI-generated) or 'video'. */
  mediaKind?: "image" | "video";
  /** Non-destructive trim window (seconds) for video — play only this slice. */
  clipStart?: number;
  clipEnd?: number;
  /**
   * Sensitive (NSFW) flag. Never enforced: shows an "NSFW" badge + soft blur that a
   * user can personally Unveil, or auto-clear via the global opt-in.
   */
  nsfw?: boolean;
  /** Typography choice for the confession text (free). See lib/expression. */
  fontStyle?: string;
  /** Premium text effect id (shimmer/glow/…). Free for Godmode, else V¢. */
  textFx?: string;
  /** Premium 3D "gyroscopic" media view (parallax tilt). Free for Godmode, else V¢. */
  view3d?: boolean;
}

/** A lightweight, passwordless local account. */
export interface Account {
  alias: string;
  /** Canonical username identity (generated for guests, chosen by members). */
  username?: string | null;
  aura: string;
  anonymous: boolean;
  createdAt: number;
}

export interface OwnConfession extends Confession {
  /** The current user's own posts carry richer analytics. */
  views: number;
  reveals: number;
  /** Reaction trend over the last 7 days, for the profile sparkline. */
  trend: number[];
}

// ---------------------------------------------------------------------------
// Social layer — only reachable after a confession has been "unveiled".
// ---------------------------------------------------------------------------

export interface Comment {
  id: string;
  confessionId: string;
  /** Anonymous alias of the commenter, or "You" for the current user. */
  author: string;
  /** Canonical username of the commenter (preferred over emoji handle). */
  username?: string;
  text: string;
  createdAt: number;
  /** True when authored by the current user. */
  mine: boolean;
}

export interface Message {
  id: string;
  confessionId: string;
  /** "me" = current user, "them" = the confession's poster. */
  from: "me" | "them";
  text: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Public chat rooms — open to everyone, including anonymous accounts.
// ---------------------------------------------------------------------------

export type RoomKind = "public" | "local";

export interface Room {
  id: string;
  name: string;
  topic?: string;
  kind: RoomKind;
  sort: number;
}

/** Who authored a room message: a person, the disclosed mod agent, or system. */
export type SenderKind = "user" | "mod" | "system";

export interface RoomMessage {
  id: string;
  roomId: string;
  /** Sender profile id, or null for mod/system messages. */
  senderId: string | null;
  senderKind: SenderKind;
  alias: string;
  aura: string;
  body?: string;
  /** Shared image. Clear by default; NSFW-suggested images blur per-user. */
  imageUrl?: string;
  /** AI-suggested NSFW for a shared image. */
  nsfw?: boolean;
  unveils: number;
  veils: number;
  createdAt: number;
  /** True when authored by the current user. */
  mine: boolean;
}

// Social Circles — user-created chat communities.
export type CircleVisibility = "public" | "unlisted" | "private" | "secret";
export type CircleRole = "owner" | "mod" | "member";
export type CircleMemberStatus = "active" | "pending" | "banned" | "muted";

export interface Circle {
  id: string;
  slug: string | null;
  name: string;
  description?: string;
  icon?: string;
  ownerId: string;
  visibility: CircleVisibility;
  joinPolicy: "open" | "request" | "invite" | "code";
  allowAnonymous: boolean;
  nsfw: boolean;
  rules?: string;
  /** Optional daily V¢ dues members can opt into supporting. 0 = off. */
  dues: number;
  /** Premium theme descriptor, e.g. { id: "aurora" }. */
  theme: Record<string, string>;
  memberCount: number;
  nameChangesRemaining: number;
  lastActiveAt: number;
  createdAt: number;
}

export interface CircleMember {
  userId: string;
  alias: string;
  /** Canonical username identity (null until set), shown by the Handle component. */
  username?: string | null;
  role: CircleRole;
  status: CircleMemberStatus;
}

export interface CircleMessage {
  id: string;
  circleId: string;
  senderId: string | null;
  senderKind: SenderKind;
  alias: string;
  aura: string;
  body?: string;
  imageUrl?: string;
  nsfw?: boolean;
  createdAt: number;
  mine: boolean;
}

/** A soul currently present in a room (via Realtime Presence). */
export interface RoomPresence {
  id: string;
  alias: string;
  aura: string;
  /** Optional public details (only broadcast when the user is public). */
  gender?: Gender;
  age?: number;
  location?: string;
}

// ---------------------------------------------------------------------------
// Friendships — connections between the user and posters they've met.
// ---------------------------------------------------------------------------

export type FriendStatus = "none" | "requested" | "incoming" | "friends";

export interface Friend {
  /** The confession through which the connection was made. */
  confessionId: string;
  alias: string;
  seed: number;
  gender?: Gender;
  age?: number;
  location?: string;
  status: FriendStatus;
  since: number;
}

export type NotificationKind =
  | "vote"
  | "featured"
  | "milestone"
  | "reveal"
  | "comment"
  | "message"
  | "friend"
  | "name";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  /** Links back to a confession when relevant. */
  confessionId?: string;
  /** For direct-message notifications: who to open a chat with. */
  peerId?: string;
  peerAlias?: string;
  peerAura?: string;
}
