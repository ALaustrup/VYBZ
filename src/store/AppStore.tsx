import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Account,
  AmbientPresence,
  AppNotification,
  Comment,
  Confession,
  Friend,
  FriendStatus,
  Identity,
  Message,
  ProfileDetails,
  Reaction,
} from "@/types";
import { randomUsername } from "@/lib/username";
import { CANNED_REPLIES, DEMO_COMMENTS } from "@/data/social";
import { BATTLES } from "@/data/battles";
import { haptic, veilClarity } from "@/lib/utils";
import { enforceOfflineBudget, prefetchForOffline } from "@/lib/offline";
import { canAskPush, enablePush } from "@/lib/push";
import { DEFAULT_BG, bgVariant as bgVariantMeta } from "@/lib/backgrounds";
import { DEFAULT_TRANSITION, pageTransition as pageTransitionMeta } from "@/lib/transitions";
import {
  DEFAULT_DOCK_COLOR,
  DEFAULT_DOCK_FX,
  dockColorTheme,
  dockFxStyle,
} from "@/lib/dock";
import { BACKEND_ENABLED } from "@/lib/supabase";
import * as backend from "@/lib/backend";

// ---------------------------------------------------------------------------
// Tunable constants. Unveiling is free & unlimited; scarcity lives in messaging
// (free users get a per-conversation cap; Godmode lifts it).
// ---------------------------------------------------------------------------

/** One-time lifetime price for MYVYB Plus "Godmode". */
export const GODMODE_PRICE = "$3.69";
/** Free users may send this many messages per confession conversation. */
export const MESSAGE_LIMIT = 10;
/** A Godmode "Power Up" grants a conversation unlimited messaging for 15 min. */
export const POWER_UP_MS = 15 * 60 * 1000;
/** A Spotlight boost features a confession on Trending for one hour. */
export const SPOTLIGHT_MS = 60 * 60 * 1000;

interface BattleVote {
  a: number;
  b: number;
  voted?: "a" | "b";
}

interface Streak {
  count: number;
  lastDay: string;
}

type ConnectionTab = "comments" | "message";

interface SwipeResult {
  confessionId: string;
  reaction: Reaction;
}

/** Input the compose flow collects to create a confession. */
export interface NewConfessionInput {
  text: string;
  /** Background media: a data URL, blob/object URL, or AI image URL. */
  photo?: string;
  mediaKind?: "image" | "video";
  /** Virtual-trim window (seconds) for video. */
  clipStart?: number;
  clipEnd?: number;
  /** Author self-marked sensitive (moderation may also flag it after upload). */
  nsfw?: boolean;
  /** Typography choice (free). */
  fontStyle?: string;
  /** Premium text effect id (V¢ / Godmode). */
  textFx?: string;
  /** Premium 3D gyroscopic media view (V¢ / Godmode). */
  view3d?: boolean;
}

// ---------------------------------------------------------------------------
// Persistence helpers. The app has no backend, so state lives in localStorage.
// ---------------------------------------------------------------------------

const KEYS = {
  userConfessions: "veiled.userConfessions",
  unveiled: "veiled.unveiled",
  identityPublic: "veiled.identityPublic",
  profileDetails: "veiled.profileDetails",
  premium: "veiled.premium",
  comments: "veiled.comments",
  threads: "veiled.threads",
  identity: "veiled.identity",
  powerUps: "veiled.powerUps",
  friends: "veiled.friends",
  karma: "veiled.karma",
  streak: "veiled.streak",
  aura: "veiled.aura",
  spotlights: "veiled.spotlights",
  whispers: "veiled.whispers",
  battleVotes: "veiled.battleVotes",
  account: "veiled.account",
  unveilCounts: "veiled.unveilCounts",
  nsfwOptIn: "veiled.nsfwOptIn",
  nsfwConsent: "veiled.nsfwConsent",
  nsfwRevealed: "veiled.nsfwRevealed",
  bgVariant: "veiled.bgVariant",
  pageTransition: "veiled.pageTransition",
  dockColor: "veiled.dockColor",
  dockFx: "veiled.dockFx",
  unlocks: "veiled.unlocks",
  notifications: "veiled.notifications",
  notifyActivity: "veiled.notifyActivity",
  avatarUrl: "veiled.avatarUrl",
  bannerUrl: "veiled.bannerUrl",
  // Durable marker for a user who completed "Unveil Yourself" (an identified,
  // non-anonymous account). Its presence resumes them on this device — even
  // offline — so the sign-on screen isn't shown again until logout/reset.
  identityAccount: "veiled.identityAccount",
} as const;

const SEED_BATTLE_VOTES: Record<string, BattleVote> = BATTLES.reduce(
  (acc, b) => {
    acc[b.id] = { a: b.votesA, b: b.votesB };
    return acc;
  },
  {} as Record<string, BattleVote>
);

/** One incoming friend request is seeded so the accept/decline flow is visible. */
const SEED_FRIENDS: Record<string, Friend> = {
  c6: {
    confessionId: "c6",
    alias: "Soft Apocalypse",
    seed: 555,
    status: "incoming",
    since: Date.now() - 1000 * 60 * 30,
  },
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

/** Confessions the user authored are always free to view / connect on. */
function isOwn(id: string): boolean {
  return id.startsWith("own");
}

/** Snapshot a confession's poster into a Friend record. */
function friendFrom(c: Confession, status: FriendStatus): Friend {
  return {
    confessionId: c.id,
    alias: c.alias,
    seed: c.seed,
    gender: c.gender,
    age: c.age,
    location: c.location,
    status,
    since: Date.now(),
  };
}

interface CelebrationState {
  token: number;
  label: string;
}

interface ToastState {
  token: number;
  text: string;
}

interface AppState {
  // Account / session.
  account: Account | null;
  signIn: (
    alias: string,
    opts?: { identity?: Identity; isPublic?: boolean }
  ) => void;
  enterAnonymously: () => void;
  /** One-tap entry: resume a prior session, else create a guest. */
  findYours: () => Promise<void>;
  /**
   * Frictionless in-app registration: the only required inputs are Age, Sex &
   * Location (+ accepted terms). Creates the account without ever leaving the
   * app; email is optional later (it unlocks the wallet + NSFW).
   */
  registerQuick: (identity: Identity, isPublic?: boolean) => void;
  /** True until the initial session-restore completes (hide the landing). */
  authLoading: boolean;
  /** One-time username customization. False if already used or name taken. */
  changeUsername: (name: string) => Promise<boolean>;
  /** Whether the one-time username change has been used. */
  usernameLocked: boolean;
  /** Passwordless email magic-link sign-in / recovery (returning or new). */
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => void;

  // Name watchlist ("snipe") — a Godmode perk. Watch a taken name; when it frees
  // you get a live alert and the first to claim wins (atomic via the DB index).
  /** Canonical emoji keys you're watching. */
  watched: string[];
  /** Watched keys that are free RIGHT NOW — ready to claim. */
  watchedAvailable: string[];
  /** Start watching a (currently taken) name. Godmode-gated. */
  watchName: (emoji: string) => Promise<boolean>;
  /** Stop watching a name. */
  unwatchName: (key: string) => void;
  /** True when a real Supabase backend is wired (vs. local demo mode). */
  backendEnabled: boolean;
  /** Current user's backend profile id (null in local mode). */
  profileId: string | null;
  /** Confessions authored by real users, loaded from the backend. */
  backendConfessions: Confession[];
  /** Re-fetch the live confession feed from the backend. */
  refreshConfessions: () => void;
  /** Whether a confession was authored by the current user. */
  isMine: (confessionId: string) => boolean;
  // Safety.
  report: (
    targetType: "confession" | "comment" | "message" | "profile",
    targetId: string,
    reason?: string
  ) => void;
  blockAuthor: (confession: Confession) => void;
  /** True when a confession has been hidden/blocked locally on this device. */
  isHidden: (id: string) => boolean;

  notifications: AppNotification[];
  unreadCount: number;
  /** In-app popup for the latest interaction (null when none/dismissed). */
  activityPopup: AppNotification | null;
  dismissActivityPopup: () => void;
  /** Whether interaction popups are shown (user setting). */
  notifyActivity: boolean;
  setNotifyActivity: (on: boolean) => void;
  swiped: SwipeResult[];
  celebration: CelebrationState | null;
  toast: ToastState | null;
  userConfessions: Confession[];
  composeOpen: boolean;
  /**
   * Global media-upload progress for the active post, 0..1, or null when idle.
   * Lives in the store (not the compose sheet) so the upload — and its indicator
   * — keep running even after the sheet closes and the user changes pages.
   */
  uploadProgress: number | null;

  // Public/private profile identity (editable; shown on unveiled posts).
  identity: Identity;
  identityPublic: boolean;
  updateIdentity: (identity: Identity, isPublic: boolean) => void;

  // Rich profile data points (interests, prompts, traits, …) powering profile
  // personalization + superior matchmaking. Public by default, per-section
  // privacy via ProfileDetails.hidden.
  profileDetails: ProfileDetails;
  updateProfileDetails: (details: ProfileDetails) => void;

  isPremium: boolean;
  isUnveiled: (confessionId: string) => boolean;
  unveilCounts: Record<string, number>;
  /** Display clarity 0..1 (community Veils + per-user NSFW) for a confession. */
  displayLevel: (confession: Confession) => number;
  /** Whether an AI-suggested NSFW post is still blurred for this user. */
  isNsfwHidden: (confession: Confession) => boolean;
  /** Personally reveal an NSFW post (this device only). */
  unveilNsfw: (confessionId: string) => void;
  /** Global "show sensitive content" opt-in (off by default). */
  nsfwOptIn: boolean;
  /** Returns false (without enabling) when the NSFW gate isn't satisfied. */
  setNsfwOptIn: (on: boolean) => boolean;
  /** Recorded 18+ consent (half of the NSFW unlock gate). */
  nsfwConsent: boolean;
  /** Whether the account has a verified contact (email/SMS magic link). */
  contactVerified: boolean;
  /** True when NSFW can be enabled (verified contact + 18+ consent). */
  nsfwEligible: boolean;
  recordNsfwConsent: () => void;
  refreshContactVerified: () => Promise<boolean>;
  /** Verified + 18+ → record consent and enable NSFW atomically. */
  unlockNsfw: () => boolean;
  // V¢ (V-Credits) wallet. Anonymous accounts have no wallet.
  credits: number;
  hasWallet: boolean;
  tip: (toUserId: string, amount: number, ref?: string) => Promise<boolean>;
  buyCosmetic: (itemId: string, price: number) => Promise<boolean>;
  /** Spend V¢ on a one-off (e.g. a post's premium effects). Returns true if paid. */
  spendCredits: (amount: number, reason?: string) => Promise<boolean>;
  refreshCredits: () => void;
  /** Equipped cosmetics for the current user. */
  cosmeticLoadout: Record<string, string>;
  equipCosmetic: (kind: string, itemId: string | null) => void;
  /** Profile music link. */
  musicUrl: string | null;
  setMusicUrl: (url: string) => void;
  /** Living-background variant (Godmode-customizable). */
  bgVariant: string;
  setBgVariant: (id: string) => void;
  /** Page transition preset. */
  pageTransition: string;
  setPageTransition: (id: string) => void;
  /** Dock color theme + effect style. */
  dockColor: string;
  setDockColor: (id: string) => void;
  dockFx: string;
  setDockFx: (id: string) => void;
  /** Personalized profile imagery (upload or AI). */
  avatarUrl: string | null;
  setAvatar: (url: string | null) => void;
  bannerUrl: string | null;
  setBanner: (url: string | null) => void;
  /** One-time V¢ unlocks (bg/transition/dock). */
  ownedUnlocks: string[];
  isUnlocked: (itemId: string) => boolean;
  unlock: (itemId: string, basePrice: number) => Promise<boolean>;
  /** Operator/admin role for the current account. */
  isAdmin: boolean;
  /** Bootstrap admin with a one-time code. */
  claimAdmin: (code: string) => Promise<boolean>;
  /** Remaining one-time self age/sex changes. */
  identityChangesRemaining: number;
  /** Use the one-time self age/sex change. */
  selfChangeIdentity: (
    gender: "M" | "F" | undefined,
    age: number | undefined
  ) => Promise<boolean>;

  // Social layer (open on every post).
  comments: Record<string, Comment[]>;
  threads: Record<string, Message[]>;
  powerUps: Record<string, number>;
  activeConnectionId: string | null;
  activeConnectionTab: ConnectionTab;
  /** The peer (1:1 DM partner) for the open conversation, if any. */
  activeConnectionPeer: string | null;
  openConnection: (
    confessionId: string,
    tab?: ConnectionTab,
    peerId?: string
  ) => void;
  closeConnection: () => void;
  setConnectionTab: (tab: ConnectionTab) => void;
  // Author inbox.
  inboxOpen: boolean;
  openInbox: () => void;
  closeInbox: () => void;
  // 1:1 direct chat with a friend (no confession).
  friendChatPeer: { id: string; alias: string; aura: string } | null;
  openFriendChat: (peer: { id: string; alias: string; aura: string }) => void;
  closeFriendChat: () => void;
  addComment: (confessionId: string, text: string) => boolean;
  hasCommented: (confessionId: string) => boolean;
  sendMessage: (confessionId: string, text: string) => boolean;
  myMessageCount: (confessionId: string) => number;
  isConversationUnlimited: (confessionId: string) => boolean;
  powerUp: (confessionId: string) => void;
  messageLimit: number;

  // Friendships.
  friends: Record<string, Friend>;
  friendStatus: (confessionId: string) => FriendStatus;
  requestFriend: (confession: Confession) => void;
  acceptFriend: (confessionId: string) => void;
  declineFriend: (confessionId: string) => void;
  // Real, profile-to-profile friendships (used by rooms / backend posts).
  backendFriends: Record<string, backend.BackendFriend>;
  friendStatusById: (peerId: string) => FriendStatus;
  addFriendById: (
    peerId: string,
    meta?: { alias?: string; aura?: string }
  ) => void;
  acceptFriendById: (peerId: string) => void;
  removeFriendById: (peerId: string) => void;

  // Reputation & retention.
  karma: number;
  streak: number;

  // Cosmetics, spotlights, whispers, battles.
  spotlights: Record<string, number>;
  isSpotlighted: (confessionId: string) => boolean;
  spotlight: (confessionId: string) => void;
  whispers: Record<string, string>;
  setWhisper: (confessionId: string, text: string) => void;
  battleVotes: Record<string, BattleVote>;
  voteBattle: (battleId: string, side: "a" | "b") => void;
  giftPowerUp: (confessionId: string, alias: string) => void;

  // Premium / paywall.
  premiumOpen: boolean;
  openPremium: () => void;
  closePremium: () => void;
  // Anonymous → membership gate (choose emojis or upgrade to Godmode).
  accountGateOpen: boolean;
  openAccountGate: () => void;
  closeAccountGate: () => void;
  /** Guard a member-only action; opens the gate + returns false for anon. */
  requireIdentity: () => boolean;
  /** Network connectivity (drives offline UI + purchase gating). */
  isOnline: boolean;
  goPremium: () => void;
  godmodePrice: string;
  /** Expiry (ms) of an active rewarded-ad Godmode pass, or 0/past if none. */
  godmodePassUntil: number;
  /** Watch-an-ad reward: grants a 24h Godmode pass (capped once/day). */
  activateGodmodePass: () => boolean;

  recordSwipe: (confession: Confession, reaction: Reaction) => void;
  // Soft push-permission prompt (offered once after a positive micro-moment).
  pushPromptOpen: boolean;
  closePushPrompt: () => void;
  /** Lifelines sheet — opens from crisis-detection or "Talk to someone" links. */
  lifelineOpen: boolean;
  openLifeline: () => void;
  closeLifeline: () => void;
  /** Feedback / bug / contact-admin sheet — reachable from Settings. */
  feedbackOpen: boolean;
  openFeedback: () => void;
  closeFeedback: () => void;
  /** Never Alone — live presence snapshot for the user's age layer (or null). */
  ambientPresence: AmbientPresence | null;
  /** Smart Routing sheet — "find someone to connect with right now". */
  connectNowOpen: boolean;
  openConnectNow: () => void;
  closeConnectNow: () => void;
  /** AI Companions sheet — the always-available "never alone" floor. Pass a
   *  companion id to open straight into a chat, or nothing to open the picker. */
  companionOpen: boolean;
  companionId: string | null;
  openCompanions: (companionId?: string) => void;
  closeCompanions: () => void;
  enablePushNotifications: () => Promise<boolean>;
  // Single-post viewer (opened from a "fully unveiled" notification).
  activePostId: string | null;
  openPost: (confessionId: string) => void;
  closePost: () => void;
  // Fitted, resizable media viewer (full photo/video on tap).
  mediaViewerId: string | null;
  openMedia: (confessionId: string) => void;
  closeMedia: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  celebrate: (label: string) => void;
  clearCelebration: () => void;
  showToast: (text: string) => void;
  addConfession: (input: NewConfessionInput) => Promise<Confession>;
  openCompose: () => void;
  closeCompose: () => void;
}

const AppContext = createContext<AppState | null>(null);

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

export function AppProvider({ children }: { children: ReactNode }) {
  // Notifications start empty for a clean, honest first run — no fabricated
  // activity. Real ones (interactions on your posts, friend requests, etc.)
  // accumulate here and persist across sessions.
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    load<AppNotification[]>(KEYS.notifications, [])
  );
  // In-app activity popup (the latest interaction notification), and the user's
  // preference for whether to receive these at all (default on).
  const [popup, setPopup] = useState<AppNotification | null>(null);
  const [notifyActivity, setNotifyActivityState] = useState<boolean>(() =>
    load<boolean>(KEYS.notifyActivity, true)
  );
  const notifyActivityRef = useRef(notifyActivity);
  notifyActivityRef.current = notifyActivity;
  const [swiped, setSwiped] = useState<SwipeResult[]>([]);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [userConfessions, setUserConfessions] = useState<Confession[]>(() =>
    load<Confession[]>(KEYS.userConfessions, [])
  );
  const [composeOpen, setComposeOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [identity, setIdentity] = useState<Identity>(() =>
    load<Identity>(KEYS.identity, {})
  );
  const [identityPublic, setIdentityPublic] = useState<boolean>(() =>
    load<boolean>(KEYS.identityPublic, true)
  );
  const [profileDetails, setProfileDetails] = useState<ProfileDetails>(() =>
    load<ProfileDetails>(KEYS.profileDetails, {})
  );
  const [isPremium, setIsPremium] = useState<boolean>(() =>
    load<boolean>(KEYS.premium, false)
  );
  // Time-limited Godmode pass earned by watching a rewarded ad (expiry ms).
  const [godmodePass, setGodmodePass] = useState<number>(() =>
    load<number>("veiled.godmodePass", 0)
  );
  const [, setNowBump] = useState(0);
  const [unveiled, setUnveiled] = useState<string[]>(() =>
    load<string[]>(KEYS.unveiled, [])
  );
  const [comments, setComments] = useState<Record<string, Comment[]>>(() =>
    load<Record<string, Comment[]>>(KEYS.comments, DEMO_COMMENTS)
  );
  const [threads, setThreads] = useState<Record<string, Message[]>>(() =>
    load<Record<string, Message[]>>(KEYS.threads, {})
  );
  const [powerUps, setPowerUps] = useState<Record<string, number>>(() =>
    load<Record<string, number>>(KEYS.powerUps, {})
  );
  const [friends, setFriends] = useState<Record<string, Friend>>(() =>
    load<Record<string, Friend>>(KEYS.friends, SEED_FRIENDS)
  );
  // Real, profile-to-profile friendships (backend), keyed by peer profile id.
  const [backendFriends, setBackendFriends] = useState<
    Record<string, backend.BackendFriend>
  >({});
  // NSFW: global opt-in (off by default) + per-device personal reveals.
  const [nsfwOptIn, setNsfwOptInState] = useState<boolean>(() =>
    load<boolean>(KEYS.nsfwOptIn, false)
  );
  // NSFW unlock gate: recorded 18+ consent + a verified contact (email/SMS).
  const [nsfwConsent, setNsfwConsentState] = useState<boolean>(() =>
    load<boolean>(KEYS.nsfwConsent, false)
  );
  const [contactVerified, setContactVerified] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [identityChangesRemaining, setIdentityChangesRemaining] = useState<number>(0);
  const [credits, setCredits] = useState<number>(0);
  const [cosmeticLoadout, setCosmeticLoadout] = useState<Record<string, string>>({});
  const [musicUrl, setMusicUrlState] = useState<string | null>(null);
  const [nsfwRevealed, setNsfwRevealed] = useState<string[]>(() =>
    load<string[]>(KEYS.nsfwRevealed, [])
  );
  const [karma, setKarma] = useState<number>(() => load<number>(KEYS.karma, 140));
  const [streak, setStreak] = useState<Streak>(() =>
    load<Streak>(KEYS.streak, { count: 0, lastDay: "" })
  );
  const [aura, setAuraState] = useState<string>(() =>
    load<string>(KEYS.aura, "veil")
  );
  const [bgVariant, setBgVariantState] = useState<string>(() =>
    load<string>(KEYS.bgVariant, DEFAULT_BG)
  );
  const [pageTransition, setPageTransitionState] = useState<string>(() =>
    load<string>(KEYS.pageTransition, DEFAULT_TRANSITION)
  );
  const [dockColor, setDockColorState] = useState<string>(() =>
    load<string>(KEYS.dockColor, DEFAULT_DOCK_COLOR)
  );
  const [dockFx, setDockFxState] = useState<string>(() =>
    load<string>(KEYS.dockFx, DEFAULT_DOCK_FX)
  );
  // Personalized profile imagery (upload or AI). Synced via prefs (cross-device).
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(() =>
    load<string | null>(KEYS.avatarUrl, null)
  );
  const [bannerUrl, setBannerUrlState] = useState<string | null>(() =>
    load<string | null>(KEYS.bannerUrl, null)
  );
  // One-time V¢ unlocks (background variants, transitions, dock themes/effects).
  // Item ids look like "bg:ember", "transition:zoom", "dockcolor:ocean".
  const [ownedUnlocks, setOwnedUnlocks] = useState<string[]>(() =>
    load<string[]>(KEYS.unlocks, [])
  );
  const ownedUnlocksRef = useRef(ownedUnlocks);
  ownedUnlocksRef.current = ownedUnlocks;
  const [spotlights, setSpotlights] = useState<Record<string, number>>(() =>
    load<Record<string, number>>(KEYS.spotlights, {})
  );
  const [whispers, setWhispers] = useState<Record<string, string>>(() =>
    load<Record<string, string>>(KEYS.whispers, {})
  );
  const [battleVotes, setBattleVotes] = useState<Record<string, BattleVote>>(
    () => load<Record<string, BattleVote>>(KEYS.battleVotes, SEED_BATTLE_VOTES)
  );
  const [account, setAccount] = useState<Account | null>(() => {
    // A returning *identified* user is resumed immediately from the durable
    // identity marker (works offline; the backend session refines it when
    // online). Anonymous sessions are NOT resumed this way — they stay a
    // separate, transient tier and re-enter through onboarding.
    if (BACKEND_ENABLED) return load<Account | null>(KEYS.identityAccount, null);
    return load<Account | null>(KEYS.account, null);
  });
  // True while the initial session restore runs (prevents an onboarding flash
  // for returning users). Only meaningful in backend mode.
  const [authLoading, setAuthLoading] = useState<boolean>(BACKEND_ENABLED);
  // True once the one-time username customization has been used.
  const [usernameLocked, setUsernameLocked] = useState<boolean>(false);
  const [unveilCounts] = useState<Record<string, number>>(() =>
    load<Record<string, number>>(KEYS.unveilCounts, {})
  );
  // The user's own weighted votes per confession (Unveil raises u, Veil raises v).
  const [voteAdjust, setVoteAdjust] = useState<
    Record<string, { u: number; v: number }>
  >(() => load<Record<string, { u: number; v: number }>>("veiled.voteAdjust", {}));
  // Confessions that have reached full reveal (so we notify the voter once).
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [mediaViewerId, setMediaViewerId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [backendConfessions, setBackendConfessions] = useState<Confession[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  // Locally hidden confession ids — lets blocking/hiding work offline and for
  // posts without a backing account (seeded/demo). Persisted on the device.
  const [hiddenIds, setHiddenIds] = useState<string[]>(() =>
    load<string[]>("veiled.hiddenIds", [])
  );
  const [myBackendIds, setMyBackendIds] = useState<string[]>(() =>
    load<string[]>("veiled.myBackendIds", [])
  );
  const [watched, setWatched] = useState<string[]>([]);
  const [watchedAvailable, setWatchedAvailable] = useState<string[]>([]);
  const profileIdRef = useRef<string | null>(null);
  const myBackendIdsRef = useRef(myBackendIds);
  myBackendIdsRef.current = myBackendIds;
  const watchedRef = useRef(watched);
  watchedRef.current = watched;
  const accountRef = useRef(account);
  accountRef.current = account;
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
    null
  );
  const [activeConnectionTab, setActiveConnectionTab] =
    useState<ConnectionTab>("comments");
  const [activeConnectionPeer, setActiveConnectionPeer] = useState<string | null>(
    null
  );
  const [inboxOpen, setInboxOpen] = useState(false);
  const [friendChatPeer, setFriendChatPeer] = useState<{
    id: string;
    alias: string;
    aura: string;
  } | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [accountGateOpen, setAccountGateOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const celebrationToken = useRef(0);
  const toastToken = useRef(0);

  // Refs mirror state so imperative actions read fresh values without being
  // recreated on every change.
  // Effective Godmode = purchased entitlement OR an active rewarded-ad pass.
  const passActive = godmodePass > Date.now();
  const effectivePremium = isPremium || passActive;
  const premiumRef = useRef(effectivePremium);
  premiumRef.current = effectivePremium;
  const nsfwConsentRef = useRef(nsfwConsent);
  nsfwConsentRef.current = nsfwConsent;
  const contactVerifiedRef = useRef(contactVerified);
  contactVerifiedRef.current = contactVerified;
  const unveiledRef = useRef(unveiled);
  unveiledRef.current = unveiled;
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const powerUpsRef = useRef(powerUps);
  powerUpsRef.current = powerUps;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const identityPublicRef = useRef(identityPublic);
  identityPublicRef.current = identityPublic;
  const friendsRef = useRef(friends);
  friendsRef.current = friends;
  const backendFriendsRef = useRef(backendFriends);
  backendFriendsRef.current = backendFriends;
  const friendChatPeerRef = useRef(friendChatPeer);
  friendChatPeerRef.current = friendChatPeer;
  const unveilCountsRef = useRef(unveilCounts);
  unveilCountsRef.current = unveilCounts;
  const voteAdjustRef = useRef(voteAdjust);
  voteAdjustRef.current = voteAdjust;
  const backendConfessionsRef = useRef(backendConfessions);
  backendConfessionsRef.current = backendConfessions;
  const userConfessionsRef = useRef(userConfessions);
  userConfessionsRef.current = userConfessions;

  // Persist everything that should survive a refresh.
  useEffect(() => save(KEYS.userConfessions, userConfessions), [userConfessions]);
  useEffect(() => save(KEYS.unveiled, unveiled), [unveiled]);
  useEffect(() => save(KEYS.premium, isPremium), [isPremium]);
  useEffect(() => save(KEYS.comments, comments), [comments]);
  useEffect(() => save(KEYS.threads, threads), [threads]);
  useEffect(() => save(KEYS.identity, identity), [identity]);
  useEffect(() => save(KEYS.identityPublic, identityPublic), [identityPublic]);
  useEffect(() => save(KEYS.profileDetails, profileDetails), [profileDetails]);
  useEffect(() => save(KEYS.powerUps, powerUps), [powerUps]);
  useEffect(() => save(KEYS.friends, friends), [friends]);
  useEffect(() => save(KEYS.karma, karma), [karma]);
  useEffect(() => save(KEYS.streak, streak), [streak]);
  useEffect(() => save(KEYS.aura, aura), [aura]);
  useEffect(() => save(KEYS.bgVariant, bgVariant), [bgVariant]);
  useEffect(() => save(KEYS.pageTransition, pageTransition), [pageTransition]);
  useEffect(() => save(KEYS.dockColor, dockColor), [dockColor]);
  useEffect(() => save(KEYS.dockFx, dockFx), [dockFx]);
  useEffect(() => save(KEYS.unlocks, ownedUnlocks), [ownedUnlocks]);
  useEffect(() => save(KEYS.notifications, notifications), [notifications]);
  useEffect(() => save(KEYS.notifyActivity, notifyActivity), [notifyActivity]);
  useEffect(() => save(KEYS.avatarUrl, avatarUrl), [avatarUrl]);
  useEffect(() => save(KEYS.bannerUrl, bannerUrl), [bannerUrl]);
  // Sync personalization to the account so it follows the user across devices.
  // Best-effort; localStorage (above) remains the offline source of truth.
  useEffect(() => {
    if (!BACKEND_ENABLED || !profileIdRef.current) return;
    void backend.savePrefs(profileIdRef.current, {
      dockColor,
      dockFx,
      bgVariant,
      pageTransition,
      unlocks: ownedUnlocks,
      avatarUrl,
      bannerUrl,
    });
  }, [dockColor, dockFx, bgVariant, pageTransition, ownedUnlocks, avatarUrl, bannerUrl]);
  useEffect(() => save(KEYS.spotlights, spotlights), [spotlights]);
  useEffect(() => save(KEYS.whispers, whispers), [whispers]);
  useEffect(() => save(KEYS.battleVotes, battleVotes), [battleVotes]);
  useEffect(() => save(KEYS.account, account), [account]);
  // Persist the durable identity marker only for identified accounts — never for
  // anonymous sessions, so the two tiers stay separate.
  useEffect(() => {
    if (account && !account.anonymous) save(KEYS.identityAccount, account);
  }, [account]);
  useEffect(() => save("veiled.hiddenIds", hiddenIds), [hiddenIds]);
  useEffect(() => save("veiled.godmodePass", godmodePass), [godmodePass]);
  // Re-render the instant a rewarded-ad pass expires so perks turn off cleanly.
  useEffect(() => {
    if (godmodePass <= Date.now()) return;
    const t = setTimeout(() => setNowBump((n) => n + 1), godmodePass - Date.now() + 500);
    return () => clearTimeout(t);
  }, [godmodePass]);
  useEffect(() => save(KEYS.unveilCounts, unveilCounts), [unveilCounts]);
  useEffect(() => save("veiled.voteAdjust", voteAdjust), [voteAdjust]);
  useEffect(() => save(KEYS.nsfwOptIn, nsfwOptIn), [nsfwOptIn]);
  useEffect(() => save(KEYS.nsfwConsent, nsfwConsent), [nsfwConsent]);
  useEffect(() => save(KEYS.nsfwRevealed, nsfwRevealed), [nsfwRevealed]);
  useEffect(() => save("veiled.myBackendIds", myBackendIds), [myBackendIds]);

  // Load a signed-in account's profile + content. Idempotent, so it's safe to
  // call from the initial restore AND the live auth listener (magic-link return).
  const hydrateProfile = useCallback(async (userId: string) => {
    profileIdRef.current = userId;
    setProfileId(userId);
    try {
      const prof = await backend.getProfile(userId);
      if (prof) {
        // Username is the canonical identity. Generate + assign one for guests
        // and any legacy account that doesn't have one yet (migration).
        let username = prof.username ?? null;
        if (!username) {
          username = await backend.assignGeneratedUsername(
            userId,
            randomUsername(),
            randomUsername
          );
        }
        setAccount({
          alias: prof.alias,
          username,
          aura: prof.aura,
          anonymous: !!prof.anonymous,
          createdAt: Date.now(),
        });
        setCredits(prof.credits ?? 0);
        setCosmeticLoadout(prof.cosmetic_loadout ?? {});
        setMusicUrlState(prof.music_url ?? null);
        // Account-synced personalization (cross-device). Unlocks merge (union)
        // so a device's local unlocks are never lost.
        const prefs = (prof.prefs ?? {}) as {
          dockColor?: string;
          dockFx?: string;
          bgVariant?: string;
          pageTransition?: string;
          unlocks?: string[];
          avatarUrl?: string | null;
          bannerUrl?: string | null;
        };
        if (prefs.dockColor) setDockColorState(prefs.dockColor);
        if (prefs.dockFx) setDockFxState(prefs.dockFx);
        if (prefs.bgVariant) setBgVariantState(prefs.bgVariant);
        if (prefs.pageTransition) setPageTransitionState(prefs.pageTransition);
        if (prefs.avatarUrl !== undefined) setAvatarUrlState(prefs.avatarUrl);
        if (prefs.bannerUrl !== undefined) setBannerUrlState(prefs.bannerUrl);
        if (Array.isArray(prefs.unlocks) && prefs.unlocks.length) {
          setOwnedUnlocks((prev) =>
            Array.from(new Set([...prev, ...(prefs.unlocks ?? [])]))
          );
        }
        setAuraState(prof.aura);
        setIdentity({
          gender: prof.gender ?? undefined,
          age: prof.age ?? undefined,
          location: prof.location ?? undefined,
        });
        setIdentityPublic(prof.identity_public ?? true);
        if (prof.profile && typeof prof.profile === "object")
          setProfileDetails(prof.profile);
        setUsernameLocked(!!prof.username_changed);
        // NSFW is gated by a verified contact + 18+ consent, so the server
        // profile is the source of truth for the opt-in and consent flags.
        setNsfwOptInState(!!prof.nsfw_opt_in);
        setNsfwConsentState(!!prof.nsfw_consent);
        setIsAdmin(!!prof.is_admin);
        setIdentityChangesRemaining(prof.identity_changes_remaining ?? 0);
        void backend.hasVerifiedContact().then(setContactVerified);
        // Server-verified entitlement always wins over the local flag.
        if (prof.godmode) setIsPremium(true);
        // Un-Veil a returning account — only for recoverable (email-linked)
        // Godmode members.
        if (prof.godmode) {
          const email = await backend.getLinkedEmail();
          if (email)
            await backend.reactivateAccount(userId, prof.username ?? prof.alias);
        }
      }
      setBackendConfessions(await backend.fetchRecentConfessions());
      setBlocks(await backend.fetchBlocks(userId));
      const fr = await backend.fetchFriendships(userId);
      setBackendFriends(Object.fromEntries(fr.map((f) => [f.peerId, f])));
      setWatched(await backend.fetchWatched(userId));
    } catch {
      // Stay in local mode on any backend hiccup.
    }
  }, []);

  // Restore an existing Supabase session on load (silent login, same device).
  // `authLoading` keeps the landing hidden until we know whether a session
  // exists, so returning users never flash the onboarding screen.
  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        const sess = await backend.getSession();
        if (sess && !cancelled) await hydrateProfile(sess.userId);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateProfile]);

  // Live auth sync: a magic-link return, token refresh, or cross-tab change
  // re-hydrates (or clears) the app instantly — no manual reload needed.
  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    return backend.onAuthChange((event, userId) => {
      if (event === "INITIAL_SESSION") return; // handled by the restore effect
      if (event === "SIGNED_OUT" || !userId) {
        profileIdRef.current = null;
        setProfileId(null);
        setAccount(null);
        setBackendConfessions([]);
        setBlocks([]);
        setBackendFriends({});
        setWatched([]);
        return;
      }
      if (userId !== profileIdRef.current) {
        void hydrateProfile(userId);
      } else if (event === "USER_UPDATED") {
        // Email just confirmed → promote a guest into a full member.
        void backend.hasVerifiedContact().then((ok) => {
          setContactVerified(ok);
          if (ok && accountRef.current?.anonymous) {
            if (profileIdRef.current)
              void backend.markIdentified(profileIdRef.current).catch(() => {});
            setAccount((a) => (a ? { ...a, anonymous: false } : a));
            refreshCredits();
            celebrate("Account verified — welcome to MYVYB ✨");
          }
        });
      }
    });
  }, [hydrateProfile]);

  // Veil Streak: advance once per calendar day the app is opened.
  useEffect(() => {
    const today = new Date().toDateString();
    setStreak((prev) => {
      if (prev.lastDay === today) return prev;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const count = prev.lastDay === yesterday ? prev.count + 1 : 1;
      return { count, lastDay: today };
    });
  }, []);

  const pushNotification = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      const full: AppNotification = {
        ...n,
        id: nextId("n"),
        createdAt: Date.now(),
        read: false,
      };
      // Keep a bounded history; newest first.
      setNotifications((prev) => [full, ...prev].slice(0, 100));
      // Surface an in-app popup for interaction activity, if the user wants it.
      const POPUP_KINDS = ["vote", "comment", "message", "milestone", "reveal", "friend"];
      if (notifyActivityRef.current && POPUP_KINDS.includes(n.kind)) {
        setPopup(full);
      }
    },
    []
  );

  const dismissPopup = useCallback(() => setPopup(null), []);

  /** Toggle in-app activity popups (interactions on your posts). */
  const setNotifyActivity = useCallback((on: boolean) => {
    setNotifyActivityState(on);
  }, []);

  const celebrate = useCallback((label: string) => {
    celebrationToken.current += 1;
    setCelebration({ token: celebrationToken.current, label });
    haptic([10, 40, 12]);
  }, []);

  const clearCelebration = useCallback(() => setCelebration(null), []);

  const showToast = useCallback((text: string) => {
    toastToken.current += 1;
    setToast({ token: toastToken.current, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Editable profile identity + public/private toggle. Persists to the backend
  // and propagates a snapshot onto the user's posts (private => blanked).
  const updateIdentity = useCallback(
    (next: Identity, isPublic: boolean) => {
      const clean: Identity = {
        gender: next.gender,
        age: next.age,
        location: next.location?.trim() || undefined,
      };
      identityRef.current = clean;
      setIdentity(clean);
      setIdentityPublic(isPublic);
      if (BACKEND_ENABLED && profileIdRef.current) {
        void backend
          .updateProfileIdentity(profileIdRef.current, clean, isPublic)
          .then(async () => {
            // Refresh the feed so the new snapshot is reflected.
            const list = await backend.fetchRecentConfessions();
            setBackendConfessions(list);
          });
      }
      showToast("Profile updated.");
    },
    [showToast]
  );

  // Save the rich profile data points (interests, prompts, traits, …). Persisted
  // to the owner-private profiles.profile column; served sanitized to others.
  const updateProfileDetails = useCallback(
    (next: ProfileDetails) => {
      setProfileDetails(next);
      if (BACKEND_ENABLED && profileIdRef.current) {
        void backend.saveProfileDetails(profileIdRef.current, next).then(() => {
          // Phase 3 — refresh the semantic profile vector so matches improve.
          void backend.refreshProfileEmbedding();
        });
      }
      showToast("Profile updated.");
    },
    [showToast]
  );

  const isUnveiled = useCallback(
    (confessionId: string): boolean =>
      isOwn(confessionId) ||
      myBackendIds.includes(confessionId) ||
      unveiled.includes(confessionId),
    [unveiled, myBackendIds]
  );

  // Record engagement so a confession's DM thread unlocks server-side (the
  // messages RLS requires the sender to have an unveil row or be the author).
  const ensureEngaged = useCallback((confessionId: string) => {
    setUnveiled((prev) =>
      prev.includes(confessionId) ? prev : [...prev, confessionId]
    );
    if (BACKEND_ENABLED && profileIdRef.current) {
      void backend.recordUnveil(confessionId, profileIdRef.current);
    }
  }, []);

  const openConnection = useCallback(
    (confessionId: string, tab: ConnectionTab = "comments", peerId?: string) => {
      // Social is open on every post. Opening a poster thread records an
      // engagement so the 1:1 DM is permitted by RLS.
      if (!peerId && !isOwn(confessionId)) ensureEngaged(confessionId);
      setActiveConnectionPeer(peerId ?? null);
      setActiveConnectionTab(tab);
      setActiveConnectionId(confessionId);
    },
    [ensureEngaged]
  );

  const closeConnection = useCallback(() => {
    setActiveConnectionId(null);
    setActiveConnectionPeer(null);
  }, []);
  const setConnectionTab = useCallback(
    (tab: ConnectionTab) => setActiveConnectionTab(tab),
    []
  );

  const openInbox = useCallback(() => setInboxOpen(true), []);
  const closeInbox = useCallback(() => setInboxOpen(false), []);
  const openFriendChat = useCallback(
    (peer: { id: string; alias: string; aura: string }) => {
      setInboxOpen(false);
      setFriendChatPeer(peer);
    },
    []
  );
  const closeFriendChat = useCallback(() => setFriendChatPeer(null), []);

  const hasCommented = useCallback(
    (confessionId: string): boolean =>
      (comments[confessionId] ?? []).some((c) => c.mine),
    [comments]
  );

  // One comment per user per confession — enforced for everyone, Godmode too.
  const addComment = useCallback(
    (confessionId: string, text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      const existing = commentsRef.current[confessionId] ?? [];
      if (existing.some((c) => c.mine)) {
        showToast("You can only leave one comment per confession.");
        return false;
      }
      const comment: Comment = {
        id: nextId("cm"),
        confessionId,
        // Your emoji identity authors your comment (falls back for anon).
        author: accountRef.current?.alias ?? "You",
        text: trimmed,
        createdAt: Date.now(),
        mine: true,
      };
      setComments((prev) => ({
        ...prev,
        [confessionId]: [...(prev[confessionId] ?? []), comment],
      }));
      setKarma((k) => k + 3);
      return true;
    },
    [showToast]
  );

  const myMessageCount = useCallback(
    (confessionId: string): number =>
      (threads[confessionId] ?? []).filter((m) => m.from === "me").length,
    [threads]
  );

  const isConversationUnlimited = useCallback(
    (confessionId: string): boolean =>
      isPremium || (powerUps[confessionId] ?? 0) > Date.now(),
    [isPremium, powerUps]
  );

  // Send a message. Chat is unlimited — there are no message caps anymore.
  const sendMessage = useCallback(
    (confessionId: string, text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;

      const message: Message = {
        id: nextId("msg"),
        confessionId,
        from: "me",
        text: trimmed,
        createdAt: Date.now(),
      };
      setThreads((prev) => ({
        ...prev,
        [confessionId]: [...(prev[confessionId] ?? []), message],
      }));

      const reply =
        CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)];
      window.setTimeout(() => {
        setThreads((prev) => ({
          ...prev,
          [confessionId]: [
            ...(prev[confessionId] ?? []),
            {
              id: nextId("msg"),
              confessionId,
              from: "them",
              text: reply,
              createdAt: Date.now(),
            },
          ],
        }));
        pushNotification({
          kind: "message",
          title: "You got a reply",
          body: reply,
          confessionId,
        });
      }, 3200 + Math.random() * 2500);

      setKarma((k) => k + 1);
      return true;
    },
    [pushNotification, showToast]
  );

  // Godmode-only: grant a conversation 15 minutes of unlimited messaging.
  const powerUp = useCallback(
    (confessionId: string) => {
      if (!premiumRef.current) {
        setPremiumOpen(true);
        return;
      }
      setPowerUps((prev) => ({
        ...prev,
        [confessionId]: Date.now() + POWER_UP_MS,
      }));
      showToast("Powered up — 15 minutes of unlimited chat unlocked.");
      pushNotification({
        kind: "message",
        title: "You powered up this chat",
        body: "Unlimited replies for the next 15 minutes.",
        confessionId,
      });
    },
    [pushNotification, showToast]
  );

  // Resolve a confession to its (backend) author profile id, if known.
  const authorOf = useCallback((confessionId: string): string | null => {
    const c = backendConfessionsRef.current.find((x) => x.id === confessionId);
    return c?.authorId ?? null;
  }, []);

  const refreshFriends = useCallback(() => {
    const me = profileIdRef.current;
    if (!BACKEND_ENABLED || !me) return;
    void backend.fetchFriendships(me).then((list) =>
      setBackendFriends(Object.fromEntries(list.map((f) => [f.peerId, f])))
    );
  }, []);

  // ----- Real (profile-to-profile) friend actions, used by rooms ----------
  const friendStatusById = useCallback(
    (peerId: string): FriendStatus =>
      backendFriends[peerId]?.status ?? "none",
    [backendFriends]
  );

  const addFriendById = useCallback(
    (peerId: string, meta?: { alias?: string; aura?: string }) => {
      const me = profileIdRef.current;
      if (!BACKEND_ENABLED || !me || me === peerId) return;
      // Genuine connections only: anonymous accounts can't add friends.
      if (accountRef.current?.anonymous) {
        setAccountGateOpen(true);
        return;
      }
      const existing = backendFriendsRef.current[peerId]?.status;
      if (existing === "friends" || existing === "requested") return;
      if (existing === "incoming") {
        void backend.acceptFriendship(me, peerId).then(refreshFriends);
        setKarma((k) => k + 5);
        return;
      }
      // Optimistic; realtime + refetch reconcile.
      setBackendFriends((prev) => ({
        ...prev,
        [peerId]: {
          peerId,
          alias: meta?.alias ?? "Anonymous",
          aura: meta?.aura ?? "veil",
          status: "requested",
          since: Date.now(),
        },
      }));
      void backend.requestFriendship(me, peerId).then(refreshFriends);
      showToast(`Friend request sent to ${meta?.alias ?? "them"}.`);
    },
    [refreshFriends, showToast]
  );

  const acceptFriendById = useCallback(
    (peerId: string) => {
      const me = profileIdRef.current;
      if (!BACKEND_ENABLED || !me) return;
      void backend.acceptFriendship(me, peerId).then(refreshFriends);
      setKarma((k) => k + 5);
    },
    [refreshFriends]
  );

  const removeFriendById = useCallback(
    (peerId: string) => {
      const me = profileIdRef.current;
      if (!BACKEND_ENABLED || !me) return;
      setBackendFriends((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      void backend.removeFriendship(me, peerId).then(refreshFriends);
    },
    [refreshFriends]
  );

  // ----- Confession-anchored friend actions (used by ConnectionSheet) ------
  // For backend confessions these now drive the REAL friendship layer (keyed by
  // the author's profile id); for demo posts they keep the local simulation.
  const friendStatus = useCallback(
    (confessionId: string): FriendStatus => {
      const authorId = authorOf(confessionId);
      if (authorId) return backendFriends[authorId]?.status ?? "none";
      return friends[confessionId]?.status ?? "none";
    },
    [friends, backendFriends, authorOf]
  );

  const requestFriend = useCallback(
    (confession: Confession) => {
      const authorId = authorOf(confession.id);
      if (authorId && profileIdRef.current) {
        addFriendById(authorId, {
          alias: confession.alias,
          aura: "veil",
        });
        return;
      }
      const existing = friends[confession.id]?.status;
      if (existing === "friends" || existing === "requested") return;
      if (existing === "incoming") {
        setFriends((prev) => ({
          ...prev,
          [confession.id]: { ...prev[confession.id], status: "friends" },
        }));
        return;
      }
      setFriends((prev) => ({
        ...prev,
        [confession.id]: friendFrom(confession, "requested"),
      }));
      showToast(`Friend request sent to ${confession.alias}.`);
      // Demo only: simulate the other person accepting shortly after.
      window.setTimeout(() => {
        setFriends((prev) =>
          prev[confession.id]?.status === "requested"
            ? {
                ...prev,
                [confession.id]: { ...prev[confession.id], status: "friends" },
              }
            : prev
        );
        pushNotification({
          kind: "friend",
          title: "New friend",
          body: `${confession.alias} accepted your friend request.`,
          confessionId: confession.id,
        });
      }, 4500 + Math.random() * 2500);
    },
    [friends, authorOf, addFriendById, pushNotification, showToast]
  );

  const acceptFriend = useCallback(
    (confessionId: string) => {
      const authorId = authorOf(confessionId);
      if (authorId) {
        acceptFriendById(authorId);
        return;
      }
      setFriends((prev) =>
        prev[confessionId]
          ? { ...prev, [confessionId]: { ...prev[confessionId], status: "friends" } }
          : prev
      );
      setKarma((k) => k + 5);
    },
    [authorOf, acceptFriendById]
  );

  const declineFriend = useCallback(
    (confessionId: string) => {
      const authorId = authorOf(confessionId);
      if (authorId) {
        removeFriendById(authorId);
        return;
      }
      setFriends((prev) => {
        const next = { ...prev };
        delete next[confessionId];
        return next;
      });
    },
    [authorOf, removeFriendById]
  );

  // ----- Account / session -----
  // Establish a real backend account (anonymous auth + profile). Returns true
  // on success; callers fall back to a local account otherwise.
  const bootstrapBackend = useCallback(
    async (
      alias: string,
      auraId: string,
      newIdentity?: Identity,
      newIsPublic?: boolean,
      anonymous?: boolean
    ): Promise<boolean> => {
      if (!BACKEND_ENABLED) return false;
      try {
        let sess = await backend.getSession();
        if (!sess) sess = await backend.signInAnon();
        if (!sess) return false;
        await backend.upsertProfile({
          id: sess.userId,
          alias,
          aura: auraId,
          anonymous,
        });
        profileIdRef.current = sess.userId;
        setProfileId(sess.userId);
        void backend.touchActivity(sess.userId);
        // Persist any details chosen at onboarding.
        if (newIdentity) {
          void backend.updateProfileIdentity(
            sess.userId,
            newIdentity,
            !!newIsPublic
          );
        }
        // Load any existing identity for this account.
        const prof = await backend.getProfile(sess.userId);
        if (prof) {
          // A previously-claimed emoji identity is the durable source of truth.
          if (prof.alias)
            setAccount((a) => (a ? { ...a, alias: prof.alias } : a));
          // Onboarding choices win over the (empty) freshly-created profile.
          if (newIdentity) {
            setIdentity(newIdentity);
            setIdentityPublic(!!newIsPublic);
          } else {
            setIdentity({
              gender: prof.gender ?? undefined,
              age: prof.age ?? undefined,
              location: prof.location ?? undefined,
            });
            setIdentityPublic(prof.identity_public ?? true);
          }
          setNsfwOptInState(!!prof.nsfw_opt_in);
          setNsfwConsentState(!!prof.nsfw_consent);
          void backend.hasVerifiedContact().then(setContactVerified);
          if (prof.godmode) setIsPremium(true);
          if (prof.godmode && !newIdentity) {
            const email = await backend.getLinkedEmail();
            if (email)
              await backend.reactivateAccount(
                sess.userId,
                prof.username ?? prof.alias
              );
          }
        }
        const list = await backend.fetchRecentConfessions();
        setBackendConfessions(list);
        setBlocks(await backend.fetchBlocks(sess.userId));
        const fric = await backend.fetchFriendships(sess.userId);
        setBackendFriends(Object.fromEntries(fric.map((f) => [f.peerId, f])));
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const signIn = useCallback(
    (alias: string, opts?: { identity?: Identity; isPublic?: boolean }) => {
      // `alias` is the chosen username; fall back to a generated one.
      const clean = alias && alias.trim() ? alias.trim() : randomUsername();
      setAccount({
        alias: clean,
        username: clean,
        aura: "veil",
        anonymous: false,
        createdAt: Date.now(),
      });
      // identity users get a V¢ wallet; mark the profile non-anonymous.
      setAuraState("veil");
      if (opts?.identity) {
        setIdentity(opts.identity);
        setIdentityPublic(!!opts.isPublic);
      }
      void bootstrapBackend(clean, "veil", opts?.identity, opts?.isPublic, false);
    },
    [bootstrapBackend]
  );

  const enterAnonymously = useCallback(() => {
    // Guests get a generated username for display; a canonical one is assigned
    // on hydration. Guests have no V¢ wallet until they register.
    const alias = randomUsername();
    setAccount({ alias, username: alias, aura: "veil", anonymous: true, createdAt: Date.now() });
    void bootstrapBackend(alias, "veil", undefined, undefined, true);
  }, [bootstrapBackend]);

  // Frictionless registration: the user only supplies Age / Sex / Location and
  // accepts the terms — no email round-trip, no leaving the app. We create a
  // guest-tier account with that identity persisted (age + sex lock on first
  // save). Email verification (wallet + NSFW) stays an optional later step.
  const registerQuick = useCallback(
    (newIdentity: Identity, isPublic = true) => {
      const alias = randomUsername();
      setAccount({
        alias,
        username: alias,
        aura: "veil",
        anonymous: true,
        createdAt: Date.now(),
      });
      setAuraState("veil");
      setIdentity(newIdentity);
      setIdentityPublic(isPublic);
      try {
        localStorage.setItem("veiled.justJoined", "1");
      } catch {
        /* ignore */
      }
      void bootstrapBackend(alias, "veil", newIdentity, isPublic, true);
    },
    [bootstrapBackend]
  );

  // One-tap entry: resume a previous session if one exists, otherwise create a
  // fresh guest account instantly. Powers the "Find Yours" landing button.
  const findYours = useCallback(async () => {
    if (BACKEND_ENABLED) {
      const sess = await backend.getSession();
      if (sess) {
        await hydrateProfile(sess.userId);
        return;
      }
    }
    enterAnonymously();
  }, [enterAnonymously, hydrateProfile]);

  // One-time username customization (guests + members). Returns false if the
  // change was already used or the name is taken.
  const changeUsername = useCallback(
    async (name: string): Promise<boolean> => {
      const clean = name.trim().replace(/\s+/g, " ");
      if (clean.length < 2) return false;
      if (BACKEND_ENABLED && profileIdRef.current) {
        const ok = await backend.changeUsername(clean);
        if (!ok) return false;
      }
      setAccount((a) => (a ? { ...a, username: clean, alias: clean } : a));
      setUsernameLocked(true);
      showToast("Username updated.");
      return true;
    },
    [showToast]
  );

  // One email field for both returning and new users: send a magic link. The
  // auth listener picks up the session the moment they tap it.
  const signInWithEmail = useCallback(
    (email: string): Promise<{ error?: string }> =>
      backend.signInWithEmail(email.trim()),
    []
  );

  const watchName = useCallback(
    async (name: string): Promise<boolean> => {
      if (!premiumRef.current) {
        showToast("Watching names is a MYVYB Plus perk.");
        setPremiumOpen(true);
        return false;
      }
      const key = name.trim().toLowerCase();
      if (!key) return false;
      if (watchedRef.current.includes(key)) return true;
      if (BACKEND_ENABLED && profileIdRef.current) {
        const ok = await backend.watchName(profileIdRef.current, key);
        if (!ok) {
          showToast("Couldn't watch that name. Try again.");
          return false;
        }
      }
      setWatched((prev) => [...prev, key]);
      showToast("Watching. We'll alert you the moment it frees.");
      return true;
    },
    [showToast]
  );

  const unwatchName = useCallback((key: string) => {
    setWatched((prev) => prev.filter((k) => k !== key));
    setWatchedAvailable((prev) => prev.filter((k) => k !== key));
    if (BACKEND_ENABLED && profileIdRef.current)
      void backend.unwatchName(profileIdRef.current, key);
  }, []);

  const signOut = useCallback(() => {
    void backend.signOut().catch(() => {});
    // Drop the durable identity marker so the sign-on screen returns.
    save(KEYS.identityAccount, null);
    save(KEYS.account, null);
    setAccount(null);
    setProfileId(null);
    profileIdRef.current = null;
    setBackendConfessions([]);
    setBlocks([]);
    setBackendFriends({});
  }, []);

  const isMine = useCallback(
    (confessionId: string): boolean =>
      isOwn(confessionId) || myBackendIds.includes(confessionId),
    [myBackendIds]
  );

  const refreshConfessions = useCallback(() => {
    if (!BACKEND_ENABLED) return;
    void backend.fetchRecentConfessions().then(setBackendConfessions);
  }, []);

  const report = useCallback(
    (
      targetType: "confession" | "comment" | "message" | "profile",
      targetId: string,
      reason?: string
    ) => {
      if (BACKEND_ENABLED && profileIdRef.current) {
        void backend.reportContent(
          profileIdRef.current,
          targetType,
          targetId,
          reason
        );
      }
      showToast("Reported — thank you. Our team will review it.");
    },
    [showToast]
  );

  const blockAuthor = useCallback(
    (confession: Confession) => {
      // Always hide this post on this device — works offline and even for
      // seeded/demo posts that have no backing account.
      setHiddenIds((prev) =>
        prev.includes(confession.id) ? prev : [...prev, confession.id]
      );
      const authorId = confession.authorId;
      if (!authorId) {
        showToast("Hidden. You won't see this again.");
        return;
      }
      // Block the account locally now; persist to the backend when we can.
      setBlocks((prev) => (prev.includes(authorId) ? prev : [...prev, authorId]));
      if (BACKEND_ENABLED && profileIdRef.current) {
        void backend.blockUser(profileIdRef.current, authorId);
      }
      showToast("Blocked. You won't see their confessions again.");
    },
    [showToast]
  );

  const isHidden = useCallback((id: string) => hiddenIds.includes(id), [hiddenIds]);

  // Live feed: refresh when anyone posts a new confession.
  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    let timer: number | undefined;
    const unsub = backend.subscribeConfessions(() => {
      // Debounce bursts of inserts into a single refetch.
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(refreshConfessions, 1200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [refreshConfessions]);

  // Watchlist drop detection. While the app is open, poll the names you're
  // watching; the instant one frees, fire a live in-app alert so you can win the
  // claim race. (The 1-hour email heads-up is handled server-side.)
  useEffect(() => {
    if (!BACKEND_ENABLED || watched.length === 0) return;
    let cancelled = false;

    async function check() {
      const me = profileIdRef.current ?? undefined;
      const results = await Promise.all(
        watchedRef.current.map(async (key) => ({
          key,
          free: await backend.isEmojiAvailable(key, me),
        }))
      );
      if (cancelled) return;
      const freeNow = results.filter((r) => r.free).map((r) => r.key);
      setWatchedAvailable((prev) => {
        const fresh = freeNow.filter((k) => !prev.includes(k));
        for (const key of fresh) {
          pushNotification({
            kind: "name",
            title: "A name you're watching is free",
            body: `${key} just opened up — claim it now before someone else does.`,
          });
          showToast(`${key} is free — claim it now!`);
          haptic([12, 40, 12]);
        }
        return freeNow;
      });
    }

    void check();
    const timer = window.setInterval(check, 45_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [watched, pushNotification, showToast]);

  // Never Alone — poll ambient presence so the UI can always show "people are
  // around" and route a lonely user to the liveliest place right now. The poll
  // is self-reinforcing: it also stamps the caller's presence server-side.
  // Pauses while the tab is hidden or the device is offline to save quota.
  useEffect(() => {
    if (!BACKEND_ENABLED || !profileId) {
      setAmbientPresence(null);
      return;
    }
    let cancelled = false;

    async function tick() {
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const snap = await backend.fetchAmbientPresence();
      if (!cancelled && snap) setAmbientPresence(snap);
    }

    void tick();
    const timer = window.setInterval(tick, 30_000);
    const onVisible = () => {
      if (typeof document === "undefined" || !document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [profileId]);

  // Live friendships: refetch when a request/accept involving you lands.
  useEffect(() => {
    if (!BACKEND_ENABLED || !profileId) return;
    const unsub = backend.subscribeFriendships(profileId, refreshFriends);
    return () => unsub();
  }, [profileId, refreshFriends]);

  // Author-targeted notifications (reactions/comments on your posts): load the
  // stored ones, then stream new ones into the in-app list + activity popup.
  useEffect(() => {
    if (!BACKEND_ENABLED || !profileId) return;
    let cancelled = false;
    void backend.fetchNotifications(profileId).then((list) => {
      if (cancelled || list.length === 0) return;
      setNotifications((prev) => {
        const have = new Set(prev.map((n) => n.id));
        const merged = [...prev, ...list.filter((n) => !have.has(n.id))];
        merged.sort((a, b) => b.createdAt - a.createdAt);
        return merged.slice(0, 100);
      });
    });
    const unsub = backend.subscribeNotifications(profileId, (n) => {
      setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 100)));
      if (notifyActivityRef.current) setPopup(n);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [profileId]);

  // DM notifications: a friend messaged you while that chat wasn't open.
  useEffect(() => {
    if (!BACKEND_ENABLED || !profileId) return;
    const unsub = backend.subscribeIncomingDMs(profileId, (m) => {
      if (friendChatPeerRef.current?.id === m.peerId) return; // already viewing
      const snippet = m.text.length > 64 ? `${m.text.slice(0, 64)}…` : m.text;
      const handle = m.peerAlias || "Someone";
      pushNotification({
        kind: "message",
        title: `New message from ${handle}`,
        body: snippet,
        peerId: m.peerId,
        peerAlias: m.peerAlias,
        peerAura: m.peerAura,
      });
      showToast(`${handle}: ${snippet}`);
    });
    return () => unsub();
  }, [profileId, pushNotification, showToast]);

  const isSpotlighted = useCallback(
    (confessionId: string): boolean =>
      (spotlights[confessionId] ?? 0) > Date.now(),
    [spotlights]
  );

  // Spotlight boost — a Godmode perk that features a post on Trending for 1h.
  const spotlight = useCallback(
    (confessionId: string) => {
      if (!premiumRef.current) {
        setPremiumOpen(true);
        return;
      }
      setSpotlights((prev) => ({
        ...prev,
        [confessionId]: Date.now() + SPOTLIGHT_MS,
      }));
      celebrate("Spotlighted on Trending for 1 hour");
      pushNotification({
        kind: "featured",
        title: "Your confession is spotlighted",
        body: "It's featured on Trending for the next hour.",
        confessionId,
      });
    },
    [celebrate, pushNotification]
  );

  // Whisper back: the poster broadcasts a one-line update to everyone who felt them.
  const setWhisper = useCallback(
    (confessionId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setWhispers((prev) => ({ ...prev, [confessionId]: trimmed }));
      showToast("Whisper sent to everyone who felt you.");
    },
    [showToast]
  );

  const voteBattle = useCallback(
    (battleId: string, side: "a" | "b") => {
      setBattleVotes((prev) => {
        const cur = prev[battleId];
        if (!cur || cur.voted) return prev;
        return {
          ...prev,
          [battleId]: {
            a: cur.a + (side === "a" ? 1 : 0),
            b: cur.b + (side === "b" ? 1 : 0),
            voted: side,
          },
        };
      });
      setKarma((k) => k + 1);
    },
    []
  );

  // Gift a 15-minute unlimited window to a friend's conversation (Godmode).
  const giftPowerUp = useCallback(
    (confessionId: string, alias: string) => {
      if (!premiumRef.current) {
        setPremiumOpen(true);
        return;
      }
      setPowerUps((prev) => ({
        ...prev,
        [confessionId]: Date.now() + POWER_UP_MS,
      }));
      showToast(`Gifted ${alias} 15 minutes of unlimited chat.`);
    },
    [showToast]
  );

  /**
   * Grant a 24-hour Godmode pass as the reward for watching an ad. Capped to
   * once per day; the real (lifetime) entitlement still comes from purchase.
   */
  const activateGodmodePass = useCallback((): boolean => {
    const DAY = 24 * 60 * 60 * 1000;
    const last = load<number>("veiled.godmodePassLast", 0);
    if (Date.now() - last < DAY) {
      showToast("You've used today's free pass — come back tomorrow, or upgrade.");
      return false;
    }
    save("veiled.godmodePassLast", Date.now());
    setGodmodePass(Date.now() + DAY);
    setPremiumOpen(false);
    celebrate("Godmode unlocked for 24 hours");
    return true;
  }, [showToast, celebrate]);

  const grantPremium = useCallback(() => {
    setIsPremium(true);
    setPremiumOpen(false);
    celebrate("Godmode unlocked");
    pushNotification({
      kind: "featured",
      title: "Welcome to MYVYB Plus",
      body: "Godmode is active for life. Message without limits, 5× votes, and more.",
    });
  }, [celebrate, pushNotification]);

  const goPremium = useCallback(() => {
    if (premiumRef.current) {
      setPremiumOpen(false);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showToast("Find internet to make purchases.");
      return;
    }
    // Checkout via a pre-created Stripe Payment Link. We attach the account id
    // as client_reference_id so the `stripe-webhook` Edge Function can grant
    // Godmode server-side (profiles.godmode) — the authoritative entitlement.
    const link = import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined;
    if (link) {
      const uid = profileIdRef.current;
      const sep = link.includes("?") ? "&" : "?";
      window.location.href = uid
        ? `${link}${sep}client_reference_id=${encodeURIComponent(uid)}`
        : link;
      return;
    }
    showToast("Demo checkout — no Stripe link configured.");
    grantPremium();
  }, [grantPremium, showToast]);

  const openPremium = useCallback(() => setPremiumOpen(true), []);
  const closePremium = useCallback(() => setPremiumOpen(false), []);

  const openAccountGate = useCallback(() => setAccountGateOpen(true), []);
  const closeAccountGate = useCallback(() => setAccountGateOpen(false), []);
  /**
   * Guard a standard/Godmode-only action. Returns true when the user is an
   * identified member; otherwise it opens the "become a member / upgrade" gate
   * and returns false so the caller can bail out.
   */
  const requireIdentity = useCallback((): boolean => {
    if (accountRef.current && !accountRef.current.anonymous) return true;
    setAccountGateOpen(true);
    return false;
  }, []);

  // Grant Godmode when returning from a successful Stripe checkout redirect.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("godmode") === "success") {
      grantPremium();
      params.delete("godmode");
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (query ? `?${query}` : "")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display clarity: community Veils blur a post for everyone (stepped at
  // 15/30/75/150/300 net Veils), and AI-suggested NSFW images are softly blurred
  // for this user until they personally Unveil (or globally opt in).
  const displayLevel = useCallback(
    (c: Confession): number => {
      const adj = backend.isBackendId(c.id)
        ? { u: 0, v: 0 }
        : voteAdjust[c.id] ?? { u: 0, v: 0 };
      const community = veilClarity((c.feels ?? 0) + adj.u, (c.wilds ?? 0) + adj.v);
      const nsfwHidden =
        !!c.photo && !!c.nsfw && !nsfwOptIn && !nsfwRevealed.includes(c.id);
      return nsfwHidden ? Math.min(community, 0.06) : community;
    },
    [voteAdjust, nsfwOptIn, nsfwRevealed]
  );

  const isNsfwHidden = useCallback(
    (c: Confession): boolean =>
      !!c.photo && !!c.nsfw && !nsfwOptIn && !nsfwRevealed.includes(c.id),
    [nsfwOptIn, nsfwRevealed]
  );

  const unveilNsfw = useCallback((id: string) => {
    setNsfwRevealed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const setNsfwOptIn = useCallback(
    (on: boolean): boolean => {
      // Turning OFF is always allowed. Turning ON is a single universal switch:
      // it requires a verified email AND a permanent 18+ age/sex on file. That's
      // it — flipping it on records consent and unlocks every NSFW surface.
      const adultVerified =
        contactVerifiedRef.current &&
        (identityRef.current.age ?? 0) >= 18 &&
        identityRef.current.gender != null;
      if (on && BACKEND_ENABLED && !adultVerified) {
        return false; // Caller should open the NSFW gate.
      }
      setNsfwOptInState(on);
      if (on && !nsfwConsentRef.current) {
        // The single toggle implies consent — record it so it persists.
        setNsfwConsentState(true);
        if (BACKEND_ENABLED && profileIdRef.current)
          void backend.setNsfwConsent(profileIdRef.current, true);
      }
      if (BACKEND_ENABLED && profileIdRef.current) {
        void backend.setNsfwOptIn(profileIdRef.current, on);
      }
      return true;
    },
    []
  );

  /** Record 18+ consent (the second half of the NSFW gate). */
  const recordNsfwConsent = useCallback(() => {
    setNsfwConsentState(true);
    if (BACKEND_ENABLED && profileIdRef.current)
      void backend.setNsfwConsent(profileIdRef.current, true);
  }, []);

  /** The user's one-time self age/sex change (from their dashboard). */
  const selfChangeIdentity = useCallback(
    async (gender: "M" | "F" | undefined, age: number | undefined): Promise<boolean> => {
      const ok = await backend.selfChangeIdentity(gender ?? null, age ?? null);
      if (ok) {
        setIdentity((p) => ({ ...p, gender, age }));
        setIdentityChangesRemaining((n) => Math.max(0, n - 1));
      }
      return ok;
    },
    []
  );

  /** Tip another user V¢ (from their post or profile). */
  const tip = useCallback(
    async (toUserId: string, amount: number, ref?: string): Promise<boolean> => {
      if (!toUserId || amount <= 0) return false;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        showToast("Find internet to make purchases.");
        return false;
      }
      const ok = await backend.tipCredits(toUserId, amount, ref);
      if (ok) {
        setCredits((c) => Math.max(0, c - amount));
        showToast(`Tipped ${amount} V¢ ✨`);
      } else {
        showToast("Not enough V¢ to tip.");
      }
      return ok;
    },
    [showToast]
  );

  /** Buy a cosmetic with V¢. */
  const buyCosmetic = useCallback(
    async (itemId: string, price: number): Promise<boolean> => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        showToast("Find internet to make purchases.");
        return false;
      }
      const ok = await backend.buyCosmetic(itemId);
      if (ok) {
        setCredits((c) => Math.max(0, c - price));
        showToast("Unlocked! ✨");
      } else {
        showToast("Not enough V¢.");
      }
      return ok;
    },
    [showToast]
  );

  /**
   * Spend V¢ on a one-off purchase such as a post's premium text effects or the
   * 3D media view. Uses the local balance as the source of truth for UX
   * (optimistic), mirroring tip/buyCosmetic, and records it server-side when a
   * backend is configured. Godmode callers should pass amount 0.
   */
  const spendCredits = useCallback(
    async (_amount: number, _reason?: string): Promise<boolean> => {
      // The V¢ economy has been retired — everything is free now.
      return true;
    },
    []
  );

  /** Refresh the V¢ balance from the server. */
  const refreshCredits = useCallback(() => {
    if (profileIdRef.current) void backend.fetchCredits(profileIdRef.current).then(setCredits);
  }, []);

  // Track connectivity for the offline indicator + purchase gating.
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  /** Equip (or unequip with null) an owned cosmetic for a given kind. */
  const equipCosmetic = useCallback((kind: string, itemId: string | null) => {
    setCosmeticLoadout((prev) => {
      const next = { ...prev };
      if (itemId) next[kind] = itemId;
      else delete next[kind];
      if (profileIdRef.current) void backend.updateLoadout(profileIdRef.current, next);
      return next;
    });
  }, []);

  /** Set the profile's music link (or clear with empty string). */
  const setMusicUrl = useCallback((url: string) => {
    const clean = url.trim() || null;
    setMusicUrlState(clean);
    if (profileIdRef.current) void backend.setMusicUrl(profileIdRef.current, clean);
  }, []);

  /** Whether a one-time unlockable (bg/transition/dock theme/fx) is owned. */
  const isUnlocked = useCallback((itemId: string) => {
    return ownedUnlocksRef.current.includes(itemId);
  }, []);

  /**
   * Buy a one-time unlock with V¢ (Godmode discounted, never free). Returns true
   * if already owned or the purchase succeeds. `basePrice` is the standard price;
   * the Godmode discount is applied here.
   */
  const unlock = useCallback(
    async (itemId: string, _basePrice: number): Promise<boolean> => {
      // Everything is free now — selecting an item simply marks it owned.
      setOwnedUnlocks((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      return true;
    },
    []
  );

  /**
   * Choose the living-background variant. Free variants apply directly; premium
   * variants must be unlocked first (purchasable by anyone with V¢).
   */
  const setBgVariant = useCallback(
    (id: string) => {
      const v = bgVariantMeta(id);
      if (v.premium && !ownedUnlocksRef.current.includes(`bg:${id}`)) {
        showToast("Unlock this background first.");
        return;
      }
      setBgVariantState(v.id);
    },
    [showToast]
  );

  /** Choose the page transition (premium presets require an unlock). */
  const setPageTransition = useCallback(
    (id: string) => {
      const t = pageTransitionMeta(id);
      if (t.premium && !ownedUnlocksRef.current.includes(`transition:${id}`)) {
        showToast("Unlock this transition first.");
        return;
      }
      setPageTransitionState(t.id);
    },
    [showToast]
  );

  /** Choose the dock color theme (exclusive = Godmode-only; priced = unlock). */
  const setDockColor = useCallback(
    (id: string) => {
      const t = dockColorTheme(id);
      if (t.exclusive && !premiumRef.current) {
        showToast("That dock theme is a Godmode exclusive.");
        return;
      }
      if (t.price > 0 && !t.exclusive && !ownedUnlocksRef.current.includes(`dockcolor:${id}`)) {
        showToast("Unlock this dock theme first.");
        return;
      }
      setDockColorState(t.id);
    },
    [showToast]
  );

  /** Set (or clear) the profile avatar/banner image URL. */
  const setAvatar = useCallback((url: string | null) => setAvatarUrlState(url), []);
  const setBanner = useCallback((url: string | null) => setBannerUrlState(url), []);

  /** Choose the dock effect style. */
  const setDockFx = useCallback(
    (id: string) => {
      const f = dockFxStyle(id);
      if (f.exclusive && !premiumRef.current) {
        showToast("That dock effect is a Godmode exclusive.");
        return;
      }
      if (f.price > 0 && !f.exclusive && !ownedUnlocksRef.current.includes(`dockfx:${id}`)) {
        showToast("Unlock this dock effect first.");
        return;
      }
      setDockFxState(f.id);
    },
    [showToast]
  );

  /** Bootstrap the admin role with a one-time code. */
  const claimAdmin = useCallback(async (code: string): Promise<boolean> => {
    const ok = await backend.claimAdmin(code);
    if (ok) setIsAdmin(true);
    return ok;
  }, []);

  /**
   * Re-check whether a verified contact now exists (after confirming a link).
   * A verified email IS the account: it promotes a guest into a full member
   * (gaining a V¢ wallet) the moment it's confirmed.
   */
  const refreshContactVerified = useCallback(async (): Promise<boolean> => {
    const ok = await backend.hasVerifiedContact();
    setContactVerified(ok);
    if (ok && accountRef.current?.anonymous) {
      if (BACKEND_ENABLED && profileIdRef.current) {
        await backend.markIdentified(profileIdRef.current).catch(() => {});
      }
      setAccount((a) => (a ? { ...a, anonymous: false } : a));
      refreshCredits();
      celebrate("Account verified — welcome to MYVYB ✨");
    }
    return ok;
  }, [refreshCredits, celebrate]);

  /**
   * Complete the NSFW gate in one step: requires an already-verified contact,
   * records 18+ consent, and enables the opt-in. Returns false if not verified.
   */
  const unlockNsfw = useCallback((): boolean => {
    // Verified email + adult age on file is the whole requirement now.
    if (BACKEND_ENABLED && !contactVerifiedRef.current) return false;
    if ((identityRef.current.age ?? 0) < 18) return false;
    setNsfwConsentState(true);
    setNsfwOptInState(true);
    if (BACKEND_ENABLED && profileIdRef.current) {
      void backend.setNsfwConsent(profileIdRef.current, true);
      void backend.setNsfwOptIn(profileIdRef.current, true);
    }
    return true;
  }, []);

  // Soft push permission prompt — offered once, after a positive micro-moment.
  const [pushPromptOpen, setPushPromptOpen] = useState(false);
  const closePushPrompt = useCallback(() => setPushPromptOpen(false), []);
  const [lifelineOpen, setLifelineOpen] = useState(false);
  const openLifeline = useCallback(() => setLifelineOpen(true), []);
  const closeLifeline = useCallback(() => setLifelineOpen(false), []);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const openFeedback = useCallback(() => setFeedbackOpen(true), []);
  const closeFeedback = useCallback(() => setFeedbackOpen(false), []);
  const [ambientPresence, setAmbientPresence] = useState<AmbientPresence | null>(null);
  const [connectNowOpen, setConnectNowOpen] = useState(false);
  const openConnectNow = useCallback(() => setConnectNowOpen(true), []);
  const closeConnectNow = useCallback(() => setConnectNowOpen(false), []);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const openCompanions = useCallback((id?: string) => {
    setCompanionId(id ?? null);
    setCompanionOpen(true);
  }, []);
  const closeCompanions = useCallback(() => setCompanionOpen(false), []);
  const maybeAskPush = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem("veiled.pushAsked")) return;
    } catch {
      return;
    }
    if (!canAskPush()) return;
    try {
      localStorage.setItem("veiled.pushAsked", "1");
    } catch {
      /* ignore */
    }
    // Let the celebratory beat land first; then ask gently.
    window.setTimeout(() => setPushPromptOpen(true), 1500);
  }, []);
  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    const uid = profileIdRef.current;
    if (!uid) return false;
    return enablePush(uid);
  }, []);

  const recordSwipe = useCallback(
    (confession: Confession, reaction: Reaction) => {
      const id = confession.id;
      // Subtle tactile feedback: a quick tick for Feel, a softer double for Veil.
      haptic(reaction === "feel" ? 12 : [6, 18]);
      setSwiped((prev) =>
        prev.some((s) => s.confessionId === id)
          ? prev
          : [...prev, { confessionId: id, reaction }]
      );
      // Backend posts are tallied server-side (DB trigger + realtime); only
      // demo/local posts get an optimistic client-side vote adjustment.
      if (!backend.isBackendId(id)) {
        // Godmode votes count 5×; everyone else is 1.
        const weight = premiumRef.current ? 5 : 1;
        const cur = voteAdjustRef.current[id] ?? { u: 0, v: 0 };
        const next =
          reaction === "feel"
            ? { u: cur.u + weight, v: cur.v }
            : { u: cur.u, v: cur.v + weight };
        setVoteAdjust((prev) => ({ ...prev, [id]: next }));
      }

      if (reaction === "feel") {
        // Feel = positive: reward + record engagement (unlocks the DM thread).
        setKarma((k) => k + 2);
        setUnveiled((prev) => (prev.includes(id) ? prev : [...prev, id]));
        // A positive micro-moment: the gentlest time to (once) offer push.
        maybeAskPush();
        if (BACKEND_ENABLED && profileIdRef.current) {
          void backend.recordUnveil(id, profileIdRef.current);
        }
      }
      if (BACKEND_ENABLED && profileIdRef.current) {
        void backend.recordReaction(id, profileIdRef.current, reaction);
      }
    },
    []
  );

  const openPost = useCallback((confessionId: string) => {
    setActivePostId(confessionId);
  }, []);
  const closePost = useCallback(() => setActivePostId(null), []);

  const openMedia = useCallback((confessionId: string) => {
    setMediaViewerId(confessionId);
  }, []);
  const closeMedia = useCallback(() => setMediaViewerId(null), []);

  // Trim the offline media cache to the user's budget on startup.
  useEffect(() => {
    void enforceOfflineBudget();
  }, []);

  // Auto-store the media currently in the feed for offline enjoyment (within the
  // user's chosen size; no-op when offline media is turned off).
  useEffect(() => {
    const urls = backendConfessions
      .slice(0, 24)
      .map((c) => c.photo)
      .filter((u): u is string => !!u);
    if (urls.length) void prefetchForOffline(urls);
  }, [backendConfessions]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const me = profileIdRef.current;
    if (BACKEND_ENABLED && me) void backend.markNotificationsRead(me);
  }, []);

  const openCompose = useCallback(() => {
    haptic(8);
    setComposeOpen(true);
  }, []);
  const closeCompose = useCallback(() => setComposeOpen(false), []);

  const addConfession = useCallback(
    async (input: NewConfessionInput): Promise<Confession> => {
      // Attach the author's identity snapshot only when their profile is public.
      const id = identityPublicRef.current ? identityRef.current : {};
      const seed = Math.floor(Math.random() * 1_000_000);
      // The author's emoji identity is the handle shown on the card (Whisper-style
      // persistent handle). Fall back to a stable emoji handle when there's no
      // valid identity yet — never a text "username".
      const ephemeralAlias =
        accountRef.current?.username ||
        accountRef.current?.alias ||
        randomUsername();
      const base: Confession = {
        id: nextId("own"),
        alias: ephemeralAlias,
        text: input.text.trim(),
        distance: "Nearby",
        createdAt: Date.now(),
        feels: 0,
        wilds: 0,
        seed,
        gender: id.gender,
        age: id.age,
        location: id.location,
        photo: input.photo,
        mediaKind: input.mediaKind ?? "image",
        clipStart: input.clipStart,
        clipEnd: input.clipEnd,
        nsfw: input.nsfw,
        fontStyle: input.fontStyle,
        textFx: input.textFx,
        view3d: input.view3d,
      };

      // Backend mode: persist so real users can see and message it.
      if (BACKEND_ENABLED && profileIdRef.current) {
        try {
          // Upload the media to the PRIVATE post bucket; we store the storage
          // PATH (never a public URL) and display via short-lived signed URLs. A
          // failed upload must NOT persist a dead `blob:`/video reference.
          let mediaPath: string | undefined = undefined;
          let displayUrl: string | undefined = input.photo;
          if (input.photo) {
            if (uploadHideTimer.current) {
              clearTimeout(uploadHideTimer.current);
              uploadHideTimer.current = null;
            }
            setUploadProgress(0);
            const { path: uploaded, error: uploadErr } =
              await backend.uploadConfessionMedia(
                input.photo,
                profileIdRef.current,
                (frac) => setUploadProgress(frac)
              );
            // Snap to complete, then fade the global indicator out.
            setUploadProgress(1);
            uploadHideTimer.current = setTimeout(
              () => setUploadProgress(null),
              700
            );
            if (uploaded) {
              mediaPath = uploaded;
              displayUrl =
                (await backend.signedMediaUrl(uploaded)) ?? input.photo;
            } else if (input.mediaKind === "video" || input.photo.startsWith("blob:")) {
              // A video can't fall back to an inline data URL, so drop it and
              // tell the user exactly why (size limit, type, auth, etc.).
              mediaPath = undefined;
              displayUrl = undefined;
              showToast(
                uploadErr
                  ? `Couldn't upload that video — ${uploadErr}`
                  : "Couldn't upload that video — posted without it."
              );
            } else {
              // Images keep their data: URL for this device, but warn that it
              // wasn't saved for everyone so the failure is never silent.
              showToast(
                uploadErr
                  ? `Image not saved to your post — ${uploadErr}`
                  : "Image couldn't be saved to your post."
              );
            }
          }
          const effectiveKind: "image" | "video" = mediaPath
            ? input.mediaKind ?? "image"
            : "image";
          // Moderation suggests (never enforces) NSFW for uploaded images only —
          // it reads the signed URL; video frames aren't scanned here.
          let nsfw = input.nsfw ?? false;
          if (mediaPath && displayUrl && !nsfw && input.mediaKind !== "video")
            nsfw = await backend.moderateImage(displayUrl);

          const newId = await backend.createConfession(profileIdRef.current, {
            text: base.text,
            photo: mediaPath,
            mediaKind: effectiveKind,
            clipStart: mediaPath ? input.clipStart : undefined,
            clipEnd: mediaPath ? input.clipEnd : undefined,
            nsfw,
            seed,
            alias: ephemeralAlias,
            identity: id,
            fontStyle: input.fontStyle,
            textFx: input.textFx,
            view3d: input.view3d,
          });
          if (newId) {
            const backendConf: Confession = {
              ...base,
              id: newId,
              distance: "Nearby",
              photo: displayUrl,
              mediaKind: effectiveKind,
              clipStart: mediaPath ? input.clipStart : undefined,
              clipEnd: mediaPath ? input.clipEnd : undefined,
              nsfw,
              authorId: profileIdRef.current ?? undefined,
            };
            setBackendConfessions((prev) => [backendConf, ...prev]);
            setMyBackendIds((prev) => [...prev, newId]);
            celebrate("Your secret is out there");
            return backendConf;
          }
        } catch {
          // Fall through to local.
        }
      }

      setUserConfessions((prev) => [base, ...prev]);
      return base;
    },
    [celebrate, showToast]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // NSFW can be enabled only with a verified contact AND recorded 18+ consent.
  // Single universal NSFW eligibility: a verified email + a permanent adult
  // (18+) age & sex on file. Once true, the one toggle in Settings unlocks every
  // NSFW surface (feed, Live, random chat) at once.
  const nsfwEligible =
    contactVerified &&
    identity.age != null &&
    identity.age >= 18 &&
    identity.gender != null;
  // Anonymous ("Enter anonymously") accounts have no V¢ wallet.
  const hasWallet = !!account && !account.anonymous;

  const value = useMemo<AppState>(
    () => ({
      account,
      signIn,
      enterAnonymously,
      findYours,
      registerQuick,
      authLoading,
      changeUsername,
      usernameLocked,
      signInWithEmail,
      signOut,
      watched,
      watchedAvailable,
      watchName,
      unwatchName,
      backendEnabled: BACKEND_ENABLED,
      profileId,
      backendConfessions: backendConfessions.filter(
        (c) => !hiddenIds.includes(c.id) && !(c.authorId && blocks.includes(c.authorId))
      ),
      refreshConfessions,
      isMine,
      report,
      blockAuthor,
      isHidden,
      notifications,
      unreadCount,
      activityPopup: popup,
      dismissActivityPopup: dismissPopup,
      notifyActivity,
      setNotifyActivity,
      swiped,
      celebration,
      toast,
      userConfessions,
      composeOpen,
      uploadProgress,
      identity,
      identityPublic,
      updateIdentity,
      profileDetails,
      updateProfileDetails,
      isPremium: effectivePremium,
      isUnveiled,
      unveilCounts,
      displayLevel,
      isNsfwHidden,
      unveilNsfw,
      nsfwOptIn,
      setNsfwOptIn,
      nsfwConsent,
      contactVerified,
      nsfwEligible,
      recordNsfwConsent,
      refreshContactVerified,
      unlockNsfw,
      credits,
      hasWallet,
      tip,
      buyCosmetic,
      spendCredits,
      refreshCredits,
      cosmeticLoadout,
      equipCosmetic,
      musicUrl,
      setMusicUrl,
      bgVariant,
      setBgVariant,
      pageTransition,
      setPageTransition,
      dockColor,
      setDockColor,
      dockFx,
      setDockFx,
      avatarUrl,
      setAvatar,
      bannerUrl,
      setBanner,
      ownedUnlocks,
      isUnlocked,
      unlock,
      isAdmin,
      claimAdmin,
      identityChangesRemaining,
      selfChangeIdentity,
      comments,
      threads,
      powerUps,
      activeConnectionId,
      activeConnectionTab,
      activeConnectionPeer,
      openConnection,
      closeConnection,
      setConnectionTab,
      inboxOpen,
      openInbox,
      closeInbox,
      friendChatPeer,
      openFriendChat,
      closeFriendChat,
      addComment,
      hasCommented,
      sendMessage,
      myMessageCount,
      isConversationUnlimited,
      powerUp,
      messageLimit: MESSAGE_LIMIT,
      friends,
      friendStatus,
      requestFriend,
      acceptFriend,
      declineFriend,
      backendFriends,
      friendStatusById,
      addFriendById,
      acceptFriendById,
      removeFriendById,
      karma,
      streak: streak.count,
      spotlights,
      isSpotlighted,
      spotlight,
      whispers,
      setWhisper,
      battleVotes,
      voteBattle,
      giftPowerUp,
      premiumOpen,
      openPremium,
      closePremium,
      accountGateOpen,
      openAccountGate,
      closeAccountGate,
      requireIdentity,
      isOnline,
      goPremium,
      godmodePrice: GODMODE_PRICE,
      godmodePassUntil: godmodePass,
      activateGodmodePass,
      recordSwipe,
      pushPromptOpen,
      closePushPrompt,
      lifelineOpen,
      openLifeline,
      closeLifeline,
      feedbackOpen,
      openFeedback,
      closeFeedback,
      ambientPresence,
      connectNowOpen,
      openConnectNow,
      closeConnectNow,
      companionOpen,
      companionId,
      openCompanions,
      closeCompanions,
      enablePushNotifications,
      activePostId,
      openPost,
      closePost,
      mediaViewerId,
      openMedia,
      closeMedia,
      pushNotification,
      markAllRead,
      celebrate,
      clearCelebration,
      showToast,
      addConfession,
      openCompose,
      closeCompose,
    }),
    [
      account,
      signIn,
      enterAnonymously,
      findYours,
      registerQuick,
      authLoading,
      changeUsername,
      usernameLocked,
      signInWithEmail,
      signOut,
      watched,
      watchedAvailable,
      watchName,
      unwatchName,
      profileId,
      backendConfessions,
      blocks,
      refreshConfessions,
      isMine,
      report,
      blockAuthor,
      isHidden,
      hiddenIds,
      notifications,
      unreadCount,
      popup,
      dismissPopup,
      notifyActivity,
      setNotifyActivity,
      swiped,
      celebration,
      toast,
      userConfessions,
      composeOpen,
      uploadProgress,
      identity,
      identityPublic,
      updateIdentity,
      profileDetails,
      updateProfileDetails,
      effectivePremium,
      isUnveiled,
      unveilCounts,
      displayLevel,
      isNsfwHidden,
      unveilNsfw,
      nsfwOptIn,
      setNsfwOptIn,
      nsfwConsent,
      contactVerified,
      nsfwEligible,
      recordNsfwConsent,
      refreshContactVerified,
      unlockNsfw,
      credits,
      hasWallet,
      tip,
      buyCosmetic,
      spendCredits,
      refreshCredits,
      cosmeticLoadout,
      equipCosmetic,
      musicUrl,
      setMusicUrl,
      bgVariant,
      setBgVariant,
      pageTransition,
      setPageTransition,
      dockColor,
      setDockColor,
      dockFx,
      setDockFx,
      avatarUrl,
      setAvatar,
      bannerUrl,
      setBanner,
      ownedUnlocks,
      isUnlocked,
      unlock,
      isAdmin,
      claimAdmin,
      identityChangesRemaining,
      selfChangeIdentity,
      comments,
      threads,
      powerUps,
      activeConnectionId,
      activeConnectionTab,
      activeConnectionPeer,
      openConnection,
      closeConnection,
      setConnectionTab,
      inboxOpen,
      openInbox,
      closeInbox,
      friendChatPeer,
      openFriendChat,
      closeFriendChat,
      addComment,
      hasCommented,
      sendMessage,
      myMessageCount,
      isConversationUnlimited,
      powerUp,
      friends,
      friendStatus,
      requestFriend,
      acceptFriend,
      declineFriend,
      backendFriends,
      friendStatusById,
      addFriendById,
      acceptFriendById,
      removeFriendById,
      karma,
      streak,
      spotlights,
      isSpotlighted,
      spotlight,
      whispers,
      setWhisper,
      battleVotes,
      voteBattle,
      giftPowerUp,
      premiumOpen,
      openPremium,
      closePremium,
      accountGateOpen,
      openAccountGate,
      closeAccountGate,
      requireIdentity,
      isOnline,
      goPremium,
      godmodePass,
      activateGodmodePass,
      recordSwipe,
      pushPromptOpen,
      closePushPrompt,
      lifelineOpen,
      openLifeline,
      closeLifeline,
      feedbackOpen,
      openFeedback,
      closeFeedback,
      ambientPresence,
      connectNowOpen,
      openConnectNow,
      closeConnectNow,
      companionOpen,
      companionId,
      openCompanions,
      closeCompanions,
      enablePushNotifications,
      activePostId,
      openPost,
      closePost,
      mediaViewerId,
      openMedia,
      closeMedia,
      pushNotification,
      markAllRead,
      celebrate,
      clearCelebration,
      showToast,
      addConfession,
      openCompose,
      closeCompose,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
