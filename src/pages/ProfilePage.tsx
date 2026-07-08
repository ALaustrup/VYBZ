import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Camera,
  Check,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Gift,
  Glasses,
  Globe,
  Heart,
  Inbox,
  Lock,
  LogOut,
  Megaphone,
  MessageCircle,
  Music,
  Radio,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Clock,
  HardDrive,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { PROFILE } from "@/data/profile";
import { EmptyState } from "@/components/EmptyState";
import { BG_VARIANTS } from "@/lib/backgrounds";
import { PAGE_TRANSITIONS } from "@/lib/transitions";
import { DOCK_COLORS, DOCK_FX } from "@/lib/dock";
import { processImage } from "@/lib/media";
import {
  fetchMyStreamStats,
  uploadPublicMedia,
  usernameAvailable,
  type StreamStats,
} from "@/lib/backend";
import { isValidUsername, normalizeUsername } from "@/lib/username";
import { VeiledArt } from "@/components/VeiledArt";
import { Handle } from "@/components/Handle";
import { IdentityMeta } from "@/components/IdentityMeta";
import { Copyright } from "@/components/Copyright";
import { SecureAccount } from "@/components/SecureAccount";
import { EchoSettings } from "@/components/EchoSettings";
import { PasskeySetup } from "@/components/PasskeySetup";
import { VerifyGate } from "@/components/VerifyGate";
import { LifelineOptIn } from "@/components/LifelineOptIn";
import { LegalLinks } from "@/components/LegalLinks";
import { useApp } from "@/store/AppStore";
import {
  playSound,
  setSoundEnabled,
  setSoundVolume,
  useSoundSettings,
} from "@/lib/sound";
import {
  OFFLINE_PRESETS_MB,
  cacheUsageBytes,
  clearOfflineCache,
  setOfflineLimitMB,
  useOfflineSettings,
} from "@/lib/offline";
import { avatarGradient, cx, formatCount, timeAgo } from "@/lib/utils";
import {
  CHOICE_FIELDS,
  DAWS,
  GENRES,
  INTERESTS,
  MAX_BIO,
  MAX_GENRES,
  MAX_INFLUENCES,
  MAX_INTERESTS,
  MAX_PLUGINS,
  MAX_PROMPTS,
  MUSICAL_KEYS,
  PLUGINS,
  PROMPTS,
  ROLES,
  ROLE_FAMILIES,
  TRAITS,
  completeness,
  isHidden,
  toggleHidden,
} from "@/lib/profileFields";
import type {
  Confession,
  Gender,
  Identity,
  OwnConfession,
  ProfileDetails,
} from "@/types";

/** Quiet reputation tiers — kindness builds reach, transparently. */
function karmaTier(k: number): { label: string; color: string } {
  if (k >= 500) return { label: "Luminous", color: "#ffd166" };
  if (k >= 250) return { label: "Trusted", color: "#34f5a0" };
  if (k >= 100) return { label: "Warm", color: "#c77dff" };
  return { label: "New soul", color: "#9aa0aa" };
}

export function ProfilePage() {
  const {
    isPremium,
    godmodePrice,
    openPremium,
    identity,
    identityPublic,
    updateIdentity,
    friends,
    acceptFriend,
    declineFriend,
    backendFriends,
    acceptFriendById,
    removeFriendById,
    openFriendChat,
    openConnection,
    nsfwOptIn,
    setNsfwOptIn,
    nsfwEligible,
    karma,
    streak,
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
    isUnlocked,
    unlock,
    showToast,
    userConfessions,
    backendConfessions,
    openCompose,
    notifyActivity,
    setNotifyActivity,
    giftPowerUp,
    account,
    signOut,
    openInbox,
    openAccountGate,
    openLifeline,
    openFeedback,
    backendEnabled,
    isAdmin,
    hasWallet,
    profileId,
    musicUrl,
    setMusicUrl,
  } = useApp();
  const alias = account?.alias ?? PROFILE.alias;
  const [tab, setTab] = useState<"posts" | "friends" | "about">("posts");
  const [editImage, setEditImage] = useState<null | "avatar" | "banner">(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File | undefined, kind: "avatar" | "banner") {
    if (!file) return;
    try {
      // Avatars/banners don't need 8K — keep them lean for the public bucket.
      const out = await processImage(file, kind === "banner" ? 1920 : 1024, 0.9);
      let url = out.dataUrl;
      // Persist to Storage on the backend so it follows the account (and keeps
      // prefs small); fall back to the inline data URL in local mode.
      if (backendEnabled && profileId) {
        url = (await uploadPublicMedia(out.dataUrl, profileId)) ?? out.dataUrl;
      }
      (kind === "avatar" ? setAvatar : setBanner)(url);
      setEditImage(null);
    } catch {
      showToast("Couldn't read that image. Try another.");
    }
  }

  // Settings live in their own "About" tab now, so show them expanded by default.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nsfwGateOpen, setNsfwGateOpen] = useState(false);
  // Whether to display the public "Veils" count on your own profile.
  const [showVeils, setShowVeils] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("veiled.showVeils") ?? "true");
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("veiled.showVeils", JSON.stringify(showVeils));
    } catch {
      /* ignore */
    }
  }, [showVeils]);

  /**
   * Select a customization item, buying it first if it's a paid lock the user
   * doesn't own yet. Exclusive items are Godmode-only. `apply` switches to it.
   */
  async function pickCustomization(
    itemId: string,
    base: number,
    exclusive: boolean,
    apply: () => void
  ) {
    if (exclusive) {
      if (!isPremium) {
        showToast("That's a Godmode exclusive.");
        return;
      }
      apply();
      return;
    }
    if (base <= 0 || isUnlocked(itemId)) {
      apply();
      return;
    }
    const ok = await unlock(itemId, base);
    if (ok) {
      apply();
      showToast("Unlocked! ✨");
    }
  }

  function toggleNsfw() {
    if (nsfwOptIn) {
      setNsfwOptIn(false);
      return;
    }
    if (nsfwEligible) setNsfwOptIn(true);
    else setNsfwGateOpen(true);
  }

  const friendList = Object.values(friends);
  const incoming = friendList.filter((f) => f.status === "incoming");
  const accepted = friendList.filter((f) => f.status === "friends");
  const pending = friendList.filter((f) => f.status === "requested");

  const connections = Object.values(backendFriends);
  const connIncoming = connections.filter((f) => f.status === "incoming");
  const connAccepted = connections.filter((f) => f.status === "friends");
  const connPending = connections.filter((f) => f.status === "requested");

  const headerGrad = avatarGradient(alias);
  const tier = karmaTier(karma);

  // Real own posts (local + your backend posts) — never demo data, so a brand
  // new account shows an honest, empty profile.
  const ownPosts = useMemo<OwnConfession[]>(() => {
    const map = new Map<string, Confession>();
    for (const c of userConfessions) map.set(c.id, c);
    for (const c of backendConfessions) {
      if (c.authorId && c.authorId === profileId) map.set(c.id, c);
    }
    return [...map.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((c) => ({ ...c, views: 0, reveals: 0, trend: [] }));
  }, [userConfessions, backendConfessions, profileId]);

  // Stats derived from real posts (0 for new users).
  const stats = useMemo(() => {
    const confessions = ownPosts.length;
    const feels = ownPosts.reduce((s, c) => s + (c.feels || 0), 0);
    const wilds = ownPosts.reduce((s, c) => s + (c.wilds || 0), 0);
    const total = feels + wilds;
    const resonance = total ? Math.round((feels / total) * 100) : 0;
    return { confessions, feels, wilds, resonance };
  }, [ownPosts]);

  // Reach scales gently with reputation; a fresh account starts low, not fake.
  const reach = Math.min(100, (stats.confessions > 0 ? 20 : 5) + Math.floor(karma / 12));
  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-6">
      {/* Identity header with a personalized banner + avatar. */}
      <div className="relative mb-4 overflow-hidden rounded-3xl border border-white/10 p-6">
        <div className="absolute inset-0 -z-10">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <VeiledArt seed={PROFILE.seed} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-ink-950/20" />
        </div>

        {/* Banner edit. */}
        <button
          onClick={() => setEditImage("banner")}
          aria-label="Change banner"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full glass text-white/80 active:scale-90"
        >
          <Camera className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
              style={
                avatarUrl
                  ? { boxShadow: `0 0 24px -6px ${headerGrad[0]}` }
                  : {
                      background: `linear-gradient(150deg, ${headerGrad[0]}, ${headerGrad[1]})`,
                      boxShadow: `0 0 24px -4px ${headerGrad[0]}`,
                    }
              }
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-8 w-8 text-white/95" strokeWidth={2.25} />
              )}
            </div>
            {/* Avatar edit. */}
            <button
              onClick={() => setEditImage("avatar")}
              aria-label="Change avatar"
              className="absolute -bottom-1.5 -left-1.5 flex h-7 w-7 items-center justify-center rounded-full glass text-white/85 active:scale-90"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            {streak > 0 && (
              <span className="absolute -bottom-1.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-ink-950 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-300/40">
                <Flame className="h-3 w-3" />
                {streak}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold text-white">
              <Handle username={account?.username} emoji={alias} size={24} />
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  account?.anonymous
                    ? "bg-white/10 text-white/60"
                    : "bg-feel/20 text-feel"
                )}
              >
                {account?.anonymous ? "Guest" : "Member"}
              </span>
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{ color: tier.color, backgroundColor: `${tier.color}22` }}
              >
                <ShieldCheck className="h-3 w-3" /> {tier.label}
              </span>
              {isPremium && (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  <Crown className="h-3 w-3" /> Godmode
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-white/40">
          Joined{" "}
          {new Date(account?.createdAt ?? Date.now()).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </p>

        {/* Stats portfolio — always visible at the top. */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-ink-950/40 py-3 text-center backdrop-blur-sm">
          <div>
            <p className="font-display text-lg font-bold text-white">
              {formatCount(stats.confessions)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/45">
              Posts
            </p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-feel">
              {formatCount(stats.feels)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/45">
              Vybs
            </p>
          </div>
          <div>
            <p className="font-display text-lg font-bold text-glow">
              {stats.resonance}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/45">
              Resonance
            </p>
          </div>
        </div>
      </div>

      {/* Slim conversion banner — only for guests. One tap to create an account. */}
      {account?.anonymous && (
        <button
          onClick={openAccountGate}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-veil-400/30 bg-veil-500/10 px-4 py-3 text-left transition active:scale-[0.99]"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-veil-200" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">
              Create your free account
            </span>
            <span className="text-[11px] text-white/55">
              Verify an email to keep your name forever &amp; unlock member perks.
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-veil-500 px-3 py-1.5 text-xs font-semibold text-white shadow-glow">
            Create
          </span>
        </button>
      )}

      {/* Dashboard tiles — messages, friends, and settings, all one tap away.
          (Games live in the taskbar's Play; XR is in Settings.) */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <button
          onClick={openInbox}
          className="flex flex-col items-center gap-1 rounded-2xl bg-veil-500/15 py-3 text-veil-100 ring-1 ring-veil-400/30 transition active:scale-[0.97]"
        >
          <Inbox className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Messages</span>
        </button>
        <button
          onClick={() => setTab("friends")}
          className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.04] py-3 text-white/80 transition active:scale-[0.97]"
        >
          <Users className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Friends</span>
        </button>
        <button
          onClick={() => {
            setTab("about");
            setSettingsOpen(true);
          }}
          className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.04] py-3 text-white/80 transition active:scale-[0.97]"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[11px] font-semibold">Settings</span>
        </button>
      </div>

      {/* Discover — your personalized For You feed + matchmaking, driven by what
          you Vyb. This is where community-driven, taste-based discovery lives. */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Link
          to="/foryou"
          className="flex items-center gap-2.5 rounded-2xl border border-veil-400/30 bg-veil-500/10 p-3.5 transition active:scale-[0.98]"
        >
          <Sparkles className="h-5 w-5 text-veil-200" />
          <span>
            <span className="block font-display text-sm font-semibold text-white">For You</span>
            <span className="text-[11px] text-white/50">Shaped by your Vybs</span>
          </span>
        </Link>
        <Link
          to="/connect"
          className="flex items-center gap-2.5 rounded-2xl border border-aqua-400/30 bg-aqua-400/10 p-3.5 transition active:scale-[0.98]"
        >
          <Users className="h-5 w-5 text-aqua-300" />
          <span>
            <span className="block font-display text-sm font-semibold text-white">Connect</span>
            <span className="text-[11px] text-white/50">People you'll vibe with</span>
          </span>
        </Link>
      </div>

      {/* Tabbed, social-network-style navigation. */}
      <div className="sticky top-0 z-10 -mx-4 mb-3 px-4 pb-2 pt-1">
        <div className="glass flex items-center gap-1 rounded-2xl p-1">
          {(
            [
              ["posts", "Posts"],
              ["friends", "Friends"],
              ["about", "About"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cx(
                "relative flex-1 rounded-xl py-2 text-sm font-semibold transition",
                tab === id ? "text-white" : "text-white/45"
              )}
            >
              {tab === id && (
                <motion.span
                  layoutId="profile-tab"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-veil-500/20 ring-1 ring-veil-400/40"
                />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== ABOUT tab ===== */}
      {tab === "about" && (
      <>
      {/* Settings overlay — a single tap on "Settings" opens the full panel. */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 z-[58] bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[58] mx-auto flex max-h-[92%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
            >
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />
              <div className="flex items-center justify-between px-5 pb-1 pt-3">
                <h2 className="font-display text-xl font-bold text-gradient">Settings</h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-2">
                <div className="space-y-3">
                {/* VYBZ XR + operator console live here. (Wallet / Messages /
                    Friends / Settings are the dashboard tiles above.) */}
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/xr"
                    className={cx(
                      "flex items-center justify-center gap-2 rounded-2xl bg-white/[0.04] py-3 text-sm font-semibold text-white/80 transition active:scale-[0.98]",
                      !isAdmin && "col-span-2"
                    )}
                  >
                    <Glasses className="h-4 w-4" /> VYBZ XR
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.04] py-3 text-sm font-semibold text-veil-200 ring-1 ring-veil-400/20 transition active:scale-[0.98]"
                    >
                      <ShieldCheck className="h-4 w-4" /> Operator console
                    </Link>
                  )}
                </div>

                {/* Lifelines — always one tap from Settings, never buried. */}
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    openLifeline();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-feel/30 bg-feel/10 p-4 text-left transition active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-feel/20 text-feel">
                      <Heart className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-display text-sm font-semibold text-white">
                        Talk to someone
                      </span>
                      <span className="text-[11px] text-white/55">
                        Peer support. Anonymous. Anytime.
                      </span>
                    </span>
                  </span>
                  <span className="rounded-full bg-feel px-3 py-1 text-xs font-bold text-black">
                    Open
                  </span>
                </button>

                {/* Bug report / feature suggestion / contact admin. */}
                <button
                  onClick={() => {
                    setSettingsOpen(false);
                    openFeedback();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-veil-400/25 bg-veil-500/[0.07] p-4 text-left transition active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-veil-500/20 text-veil-200">
                      <Megaphone className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-display text-sm font-semibold text-white">
                        Send us a message
                      </span>
                      <span className="text-[11px] text-white/55">
                        Report a bug, suggest a feature, or contact an admin.
                      </span>
                    </span>
                  </span>
                  <span className="rounded-full bg-veil-500 px-3 py-1 text-xs font-bold text-white">
                    Open
                  </span>
                </button>

                <UsernameSettings />
                <AboutYou
                  identity={identity}
                  isPublic={identityPublic}
                  onSave={updateIdentity}
                />
                <ProfileDetailsEditor />
                <EchoSettings />
                <SecureAccount />
                <PasskeySetup />
                {profileId && (
                  <Link
                    to={`/u/${profileId}`}
                    className="mb-3 flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-2.5 text-sm font-semibold text-white/70 active:scale-[0.98]"
                  >
                    <Eye className="h-4 w-4" /> View my public profile
                  </Link>
                )}
                {hasWallet && (
                  <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <Music className="h-4 w-4 text-veil-300" />
                      <h3 className="font-display text-sm font-semibold text-white">
                        Profile music
                      </h3>
                    </div>
                    <p className="mb-2 text-xs text-white/50">
                      Paste a Spotify, YouTube Music, SoundCloud, or Apple Music link.
                    </p>
                    <input
                      defaultValue={musicUrl ?? ""}
                      onBlur={(e) => setMusicUrl(e.target.value)}
                      placeholder="https://open.spotify.com/…"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                    />
                  </div>
                )}

                {/* Sensitive (NSFW) media. */}
                <button
                  onClick={toggleNsfw}
                  className="flex w-full items-center justify-between rounded-2xl bg-white/[0.02] p-4 text-left"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert
                        className={cx(
                          "h-4 w-4",
                          nsfwOptIn ? "text-wild" : "text-white/40"
                        )}
                      />
                      <h3 className="font-display text-sm font-semibold text-white">
                        NSFW mode (18+)
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">
                      One switch for everything adult. Add a verified email with
                      18+ age on file, then flip this on to unlock NSFW across the
                      feed, Live &amp; random chat at once. Off by default.
                    </p>
                  </div>
                  <span
                    className={cx(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      nsfwOptIn ? "bg-veil-500" : "bg-white/15"
                    )}
                  >
                    <span
                      className={cx(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        nsfwOptIn ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>

                {/* Activity popups. */}
                <button
                  onClick={() => setNotifyActivity(!notifyActivity)}
                  className="flex w-full items-center justify-between rounded-2xl bg-white/[0.02] p-4 text-left"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <Bell
                        className={cx(
                          "h-4 w-4",
                          notifyActivity ? "text-veil-200" : "text-white/40"
                        )}
                      />
                      <h3 className="font-display text-sm font-semibold text-white">
                        Activity alerts
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">
                      A popup when someone Vybs, Fails, comments on, or messages
                      your posts. Your Activity tab always keeps the history.
                    </p>
                  </div>
                  <span
                    className={cx(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      notifyActivity ? "bg-veil-500" : "bg-white/15"
                    )}
                  >
                    <span
                      className={cx(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        notifyActivity ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>

                {/* Show Veil counts on your profile. */}
                <button
                  onClick={() => setShowVeils((v) => !v)}
                  className="flex w-full items-center justify-between rounded-2xl bg-white/[0.02] p-4 text-left"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <EyeOff
                        className={cx("h-4 w-4", showVeils ? "text-veil-200" : "text-white/40")}
                      />
                      <h3 className="font-display text-sm font-semibold text-white">
                        Show Fail counts
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/50">
                      Display the number of Fails alongside Vybs on your profile.
                    </p>
                  </div>
                  <span
                    className={cx(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      showVeils ? "bg-veil-500" : "bg-white/15"
                    )}
                  >
                    <span
                      className={cx(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        showVeils ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </span>
                </button>

                {/* Sound. */}
                <SoundControl />

                {/* Offline storage. */}
                <OfflineControl />

                {/* Lifelines — peer-support volunteer opt-in. */}
                <LifelineOptIn />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Membership — VYBZ Plus status or upgrade CTA. */}
      {isPremium ? (
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display font-semibold text-white">
              VYBZ Plus · Godmode
            </p>
            <p className="text-xs text-amber-200/70">
              Unlimited messaging &amp; Power Ups, active for life.
            </p>
          </div>
          <span className="ml-auto font-display text-xl font-bold text-amber-300">
            ∞
          </span>
        </div>
      ) : (
        <button
          onClick={openPremium}
          className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-amber-300/25 bg-gradient-to-r from-amber-400/10 to-veil-500/10 p-4 text-left transition active:scale-[0.99]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display font-semibold text-white">
              Unlock Godmode — {godmodePrice}
            </p>
            <p className="text-xs text-white/55">
              Unlimited messaging · Power Up gifting · premium backgrounds
            </p>
          </div>
          <span className="ml-auto font-display text-sm font-bold text-amber-300">
            Upgrade
          </span>
        </button>
      )}

      </>
      )}

      {/* ===== POSTS tab ===== */}
      {tab === "posts" && (
      <>
      {/* Veil Reputation (karma) — transparent, kindness-driven reach. */}
      <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 eyebrow">
            <ShieldCheck className="h-4 w-4" style={{ color: tier.color }} />
            Veil reputation
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ color: tier.color, backgroundColor: `${tier.color}22` }}
          >
            {tier.label}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <p className="font-display text-2xl font-bold text-white">
            {formatCount(karma)}{" "}
            <span className="text-sm font-normal text-white/40">karma</span>
          </p>
          <p className="text-xs text-white/40">{reach}% reach</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${reach}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ backgroundColor: tier.color, boxShadow: `0 0 12px ${tier.color}` }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-white/40">
          Empathy — felt confessions, kind comments, friendships — quietly grows
          your reach. Cruelty shrinks it. No secret bans; just honest gravity.
        </p>
      </div>

      </>
      )}

      {/* ===== ABOUT tab (continued — personalization) ===== */}
      {tab === "about" && (
      <>
      {/* Living background — the touch-reactive backdrop. Premium variants
          are a Godmode personalization (replaces the old cosmetic auras). */}
      <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="mb-2 flex items-center gap-2 eyebrow">
          <Sparkles className="h-4 w-4 text-glow" />
          Living background
        </p>
        <div className="flex flex-wrap gap-2.5">
          {BG_VARIANTS.map((v) => {
            const selected = v.id === bgVariant;
            return (
              <button
                key={v.id}
                onClick={() =>
                  pickCustomization(`bg:${v.id}`, v.price, !!v.exclusive, () =>
                    setBgVariant(v.id)
                  )
                }
                className={cx(
                  "relative flex h-11 w-16 items-end justify-center rounded-xl pb-1 text-[9px] font-semibold text-white/90 transition active:scale-90",
                  selected && "ring-2 ring-white ring-offset-2 ring-offset-ink-900"
                )}
                style={{
                  background: `linear-gradient(150deg, ${v.colors[0]}, ${v.colors[1]}, ${v.colors[2]})`,
                }}
                aria-label={v.label}
              >
                <span className="rounded bg-black/35 px-1 leading-tight backdrop-blur-sm">
                  {v.label}
                </span>
                <PriceBadge
                  exclusive={!!v.exclusive}
                  selected={selected}
                  isPremium={isPremium}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Tap a background to apply it — touch it to stir the motion.
        </p>
      </div>

      {/* Page transitions (Godmode personalization). */}
      <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="mb-2 flex items-center gap-2 eyebrow">
          <Sparkles className="h-4 w-4 text-glow" />
          Page transition
        </p>
        <div className="flex flex-wrap gap-2">
          {PAGE_TRANSITIONS.map((t) => {
            const selected = t.id === pageTransition;
            return (
              <button
                key={t.id}
                onClick={() =>
                  pickCustomization(`transition:${t.id}`, t.price, !!t.exclusive, () =>
                    setPageTransition(t.id)
                  )
                }
                className={cx(
                  "relative rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                  selected
                    ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dock style — color theme + effect (V¢; Godmode discounted). */}
      <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <p className="mb-2 flex items-center gap-2 eyebrow">
          <Sparkles className="h-4 w-4 text-glow" />
          Dock color
        </p>
        <div className="flex flex-wrap gap-2.5">
          {DOCK_COLORS.map((c) => {
            const selected = c.id === dockColor;
            const swatch =
              c.colors.length === 1
                ? c.colors[0]
                : `linear-gradient(90deg, ${c.colors.join(", ")})`;
            return (
              <button
                key={c.id}
                onClick={() =>
                  pickCustomization(`dockcolor:${c.id}`, c.price, !!c.exclusive, () =>
                    setDockColor(c.id)
                  )
                }
                className={cx(
                  "relative flex h-9 w-16 items-end justify-center rounded-xl pb-0.5 text-[9px] font-semibold text-white transition active:scale-90",
                  selected && "ring-2 ring-white ring-offset-2 ring-offset-ink-900"
                )}
                style={{ background: swatch }}
                aria-label={c.label}
              >
                <span className="rounded bg-black/35 px-1 leading-tight backdrop-blur-sm">
                  {c.label}
                </span>
                <PriceBadge
                  exclusive={!!c.exclusive}
                  selected={selected}
                  isPremium={isPremium}
                />
              </button>
            );
          })}
        </div>

        <p className="mb-2 mt-4 flex items-center gap-2 eyebrow">
          <Sparkles className="h-4 w-4 text-glow" />
          Dock effect
        </p>
        <div className="flex flex-wrap gap-2">
          {DOCK_FX.map((f) => {
            const selected = f.id === dockFx;
            return (
              <button
                key={f.id}
                onClick={() =>
                  pickCustomization(`dockfx:${f.id}`, f.price, !!f.exclusive, () =>
                    setDockFx(f.id)
                  )
                }
                className={cx(
                  "relative rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
                  selected
                    ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {f.label}
                {f.exclusive && !isPremium && (
                  <Crown className="ml-1 inline h-3 w-3 text-amber-300" />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Make your dock yours — every style is free.
        </p>
      </div>

      </>
      )}

      {/* ===== POSTS tab (continued — analytics + confessions) ===== */}
      {tab === "posts" && (
      <>
      {/* Headline stats. */}
      <div className={cx("mb-3 grid gap-3", showVeils ? "grid-cols-3" : "grid-cols-2")}>
        <StatTile label="Posts" value={stats.confessions} />
        <StatTile label="Vybs" value={stats.feels} accent="#34f5a0" />
        {showVeils && <StatTile label="Fails" value={stats.wilds} accent="#6366f1" />}
      </div>

      {/* Analytics row. */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <AnalyticsCard
          label="Resonance"
          value={`${stats.resonance}%`}
          hint="felt, not veiled"
          progress={stats.resonance}
          color="#c77dff"
        />
        <AnalyticsCard
          label="Feel share"
          value={`${stats.resonance}%`}
          hint="Vybs vs. Fails"
          progress={stats.resonance}
          color="#34f5a0"
        />
      </div>

      {/* Streamer analytics — exclusive; renders only for users who've gone live. */}
      <StreamerAnalytics />

      </>
      )}

      {/* ===== FRIENDS tab ===== */}
      {tab === "friends" && (
      <>
      {/* Friends & requests. */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Users className="h-4 w-4 text-veil-200" />
            Friends
          </h3>
          <span className="text-xs text-white/40">{accepted.length}</span>
        </div>

        {incoming.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="px-1 text-xs uppercase tracking-wider text-veil-200/80">
              Friend requests
            </p>
            {incoming.map((f) => (
              <div
                key={f.confessionId}
                className="flex items-center gap-3 rounded-2xl border border-veil-400/30 bg-veil-500/[0.08] p-3"
              >
                <FriendAvatar friend={f} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-semibold text-white">
                    <Handle emoji={f.alias} size={14} />
                  </div>
                  <IdentityMeta
                    gender={f.gender}
                    age={f.age}
                    location={f.location}
                    size="sm"
                  />
                </div>
                <button
                  onClick={() => acceptFriend(f.confessionId)}
                  aria-label="Accept"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-feel/20 text-feel transition active:scale-90"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => declineFriend(f.confessionId)}
                  aria-label="Decline"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/50 transition active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {accepted.length === 0 && incoming.length === 0 && pending.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-6 text-center">
            <UserPlus className="h-6 w-6 text-white/30" />
            <p className="text-sm text-white/45">
              Meet someone in a room or the feed, then add them as a friend.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {accepted.map((f) => (
              <div
                key={f.confessionId}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3"
              >
                <FriendAvatar friend={f} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-semibold text-white">
                    <Handle emoji={f.alias} size={14} />
                  </div>
                  <IdentityMeta
                    gender={f.gender}
                    age={f.age}
                    location={f.location}
                    size="sm"
                  />
                </div>
                {isPremium && (
                  <button
                    onClick={() => giftPowerUp(f.confessionId, f.alias)}
                    aria-label="Gift Power Up"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 transition active:scale-90"
                  >
                    <Gift className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => openConnection(f.confessionId, "message")}
                  className="flex items-center gap-1.5 rounded-full bg-veil-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
              </div>
            ))}
            {pending.map((f) => (
              <div
                key={f.confessionId}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3 opacity-70"
              >
                <FriendAvatar friend={f} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display font-semibold text-white">
                    <Handle emoji={f.alias} size={14} />
                  </div>
                  <p className="text-xs text-white/40">Request sent</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connections — real, profile-to-profile friends (from rooms / posts). */}
      {connections.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
              <Users className="h-4 w-4 text-feel" />
              Connections
            </h3>
            <span className="text-xs text-white/40">{connAccepted.length}</span>
          </div>

          {connIncoming.length > 0 && (
            <div className="mb-3 space-y-2">
              <p className="px-1 text-xs uppercase tracking-wider text-veil-200/80">
                Requests
              </p>
              {connIncoming.map((f) => (
                <div
                  key={f.peerId}
                  className="flex items-center gap-3 rounded-2xl border border-veil-400/30 bg-veil-500/[0.08] p-3"
                >
                  <AuraDot aura={f.aura} alias={f.alias} />
                  <span className="min-w-0 flex-1 truncate font-display font-semibold text-white">{f.alias}</span>
                  <button
                    onClick={() => acceptFriendById(f.peerId)}
                    aria-label="Accept"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-feel/20 text-feel transition active:scale-90"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeFriendById(f.peerId)}
                    aria-label="Decline"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/50 transition active:scale-90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {connAccepted.map((f) => (
              <div
                key={f.peerId}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3"
              >
                <AuraDot aura={f.aura} alias={f.alias} />
                <span className="min-w-0 flex-1 truncate font-display font-semibold text-white">{f.alias}</span>
                <button
                  onClick={() => removeFriendById(f.peerId)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/45 transition active:scale-95"
                >
                  Remove
                </button>
                <button
                  onClick={() =>
                    openFriendChat({ id: f.peerId, alias: f.alias, aura: f.aura })
                  }
                  className="flex items-center gap-1.5 rounded-full bg-veil-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
              </div>
            ))}
            {connPending.map((f) => (
              <div
                key={f.peerId}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3 opacity-70"
              >
                <AuraDot aura={f.aura} alias={f.alias} />
                <div className="min-w-0 flex-1">
                  <span className="truncate font-display font-semibold text-white">{f.alias}</span>
                  <p className="text-xs text-white/40">Request sent</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </>
      )}

      {/* ===== POSTS tab (continued — your confessions) ===== */}
      {tab === "posts" && (
      <>
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="font-display text-lg font-semibold text-white">
          Your expressions
        </h3>
        <span className="text-xs text-white/40">
          {stats.confessions} {stats.confessions === 1 ? "post" : "posts"}
        </span>
      </div>

      {ownPosts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing expressed yet"
          body="Your posts will live here. Express your first thought — openly or anonymously, your call."
          action={
            <button
              onClick={openCompose}
              className="mt-1 rounded-full bg-veil-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow active:scale-95"
            >
              Express yourself
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {ownPosts.map((confession) => (
            <OwnCard key={confession.id} confession={confession} />
          ))}
        </div>
      )}
      </>
      )}

      {/* ===== ABOUT tab (continued — account footer) ===== */}
      {tab === "about" && (
      <>
      <button
        onClick={signOut}
        className="mx-auto mt-8 flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/55 transition active:scale-95"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>

      <LegalLinks className="mt-6" />
      <Copyright className="mt-4" />
      </>
      )}

      <VerifyGate
        mode="nsfw"
        open={nsfwGateOpen}
        onClose={() => setNsfwGateOpen(false)}
      />
      {/* Hidden file pickers for avatar / banner uploads. */}
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleImageFile(e.target.files?.[0], "avatar");
          e.target.value = "";
        }}
      />
      <input
        ref={bannerFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleImageFile(e.target.files?.[0], "banner");
          e.target.value = "";
        }}
      />

      {/* Avatar / banner edit sheet. */}
      <AnimatePresence>
        {editImage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditImage(null)}
              className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-md rounded-t-3xl border-t border-white/10 bg-ink-900 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
              <h3 className="mb-4 font-display text-lg font-bold text-white">
                {editImage === "avatar" ? "Your avatar" : "Your banner"}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    (editImage === "avatar" ? avatarFileRef : bannerFileRef).current?.click()
                  }
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left active:scale-[0.98]"
                >
                  <Upload className="h-5 w-5 text-veil-200" />
                  <span className="text-sm font-semibold text-white">Upload an image</span>
                </button>
                {(editImage === "avatar" ? avatarUrl : bannerUrl) && (
                  <button
                    onClick={() => {
                      (editImage === "avatar" ? setAvatar : setBanner)(null);
                      setEditImage(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-left text-white/60 active:scale-[0.98]"
                  >
                    <Trash2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">Remove</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Corner badge for a customization swatch: check / crown / V¢ price. */
function PriceBadge({
  exclusive,
  selected,
  isPremium,
}: {
  exclusive: boolean;
  selected: boolean;
  isPremium: boolean;
}) {
  if (selected)
    return (
      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-feel text-ink-950">
        <Check className="h-2.5 w-2.5" />
      </span>
    );
  if (exclusive && !isPremium)
    return (
      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-950">
        <Crown className="h-2.5 w-2.5 text-amber-300" />
      </span>
    );
  return null;
}

/** Small identity-tinted initial avatar for backend connections. */
function AuraDot({ aura, alias }: { aura: string; alias: string }) {
  const g = avatarGradient(alias || aura);
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white/90"
      style={{
        background: `linear-gradient(150deg, ${g[0]}, ${g[1]})`,
      }}
    >
      {(alias || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function AboutYou({
  identity,
  isPublic,
  onSave,
}: {
  identity: Identity;
  isPublic: boolean;
  onSave: (identity: Identity, isPublic: boolean) => void;
}) {
  const [gender, setGender] = useState<Gender | null>(identity.gender ?? null);
  const [ageOn, setAgeOn] = useState(identity.age != null);
  const [age, setAge] = useState(identity.age ?? 24);
  const [location, setLocation] = useState(identity.location ?? "");
  const [pub, setPub] = useState(isPublic);
  const { identityChangesRemaining, selfChangeIdentity, showToast } = useApp();
  const [changing, setChanging] = useState(false);
  // Sex and age are permanent once set — except a one-time self change.
  const genderLocked = identity.gender != null && !changing;
  const ageLocked = identity.age != null && !changing;
  const canRequestChange =
    (identity.gender != null || identity.age != null) &&
    identityChangesRemaining > 0 &&
    !changing;

  // Re-sync when the profile loads/changes from the backend.
  useEffect(() => {
    setGender(identity.gender ?? null);
    setAgeOn(identity.age != null);
    setAge(identity.age ?? 24);
    setLocation(identity.location ?? "");
    setPub(isPublic);
  }, [identity, isPublic]);

  async function save() {
    // Using the one-time change routes sex/age through the server (which lifts
    // permanence for this one edit); location + visibility save normally.
    if (changing) {
      const ok = await selfChangeIdentity(gender ?? undefined, ageOn ? age : undefined);
      showToast(ok ? "Identity updated (one-time change used)." : "No change credit left.");
      setChanging(false);
    }
    onSave(
      {
        gender: gender ?? undefined,
        age: ageOn ? age : undefined,
        location: location.trim() || undefined,
      },
      pub
    );
  }

  return (
    <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
          About you
        </p>
        <button
          onClick={() => setPub((v) => !v)}
          className={cx(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition active:scale-95",
            pub
              ? "border-feel/40 bg-feel/10 text-feel"
              : "border-white/15 bg-white/5 text-white/55"
          )}
        >
          {pub ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {pub ? "Public" : "Private"}
        </button>
      </div>

      {/* Gender (permanent once set). */}
      <div className="mb-1 flex gap-2">
        {(["F", "M"] as Gender[]).map((g) => {
          const selected = gender === g;
          return (
            <button
              key={g}
              disabled={genderLocked}
              onClick={() => !genderLocked && setGender(selected ? null : g)}
              className={cx(
                "flex-1 rounded-xl border py-2 text-sm font-semibold transition",
                selected
                  ? "border-veil-400/60 bg-veil-500/20 text-white"
                  : "border-white/10 text-white/50",
                genderLocked ? "opacity-90" : "active:scale-95"
              )}
            >
              {g === "F" ? "♀ Female" : "♂ Male"}
            </button>
          );
        })}
      </div>
      {(genderLocked || ageLocked) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-[11px] text-white/35">
            <Lock className="h-3 w-3" /> Sex & age are permanent.
          </p>
          {canRequestChange && (
            <button
              onClick={() => setChanging(true)}
              className="rounded-full border border-veil-400/40 px-2.5 py-1 text-[11px] font-semibold text-veil-200 active:scale-95"
            >
              Use 1-time change
            </button>
          )}
        </div>
      )}
      {changing && (
        <p className="mb-3 text-[11px] font-semibold text-veil-200">
          One-time change active — set your sex/age, then Save.
        </p>
      )}

      {/* Age (permanent once set). */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/80">Show age</span>
          <button
            disabled={ageLocked}
            onClick={() => !ageLocked && setAgeOn((v) => !v)}
            className={cx(
              "relative h-6 w-11 rounded-full transition-colors",
              ageOn ? "bg-veil-500" : "bg-white/15",
              ageLocked && "opacity-90"
            )}
          >
            <span
              className={cx(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                ageOn ? "left-[22px]" : "left-0.5"
              )}
            />
          </button>
        </div>
        {ageOn && (
          <div className="flex items-center gap-3 pt-2.5">
            <input
              type="range"
              min={13}
              max={99}
              value={age}
              disabled={ageLocked}
              onChange={(e) => setAge(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-veil-400 disabled:cursor-not-allowed"
            />
            <span className="w-8 text-center font-display text-lg font-bold text-veil-200">
              {age}
            </span>
          </div>
        )}
      </div>

      {/* Location. */}
      <input
        type="text"
        value={location}
        maxLength={28}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (e.g. Downtown)"
        className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
      />

      <button
        onClick={save}
        className="w-full rounded-xl bg-veil-500 py-2.5 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98]"
      >
        Save profile
      </button>
      <p className="mt-2 text-[11px] text-white/40">
        {pub
          ? "Shown alongside your confessions."
          : "Hidden from everyone — never attached to your posts."}
      </p>
    </div>
  );
}

/**
 * Rich profile data points — interests, intent, languages, traits, and personal
 * prompts. Public by default; each section has a per-section privacy toggle.
 * These power both profile personalization and the v3 matchmaking engine.
 */
function ProfileDetailsEditor() {
  const { profileDetails, updateProfileDetails, creatorRoles, updateCreatorRoles } =
    useApp();
  const [draft, setDraft] = useState<ProfileDetails>(profileDetails);
  // Offered/sought roles are relational — edited as local maps, saved alongside.
  const [offers, setOffers] = useState<Record<string, number>>({});
  const [seeks, setSeeks] = useState<Record<string, number>>({});
  const [pluginFilter, setPluginFilter] = useState("");

  // Re-sync when the backend profile hydrates/changes.
  useEffect(() => {
    setDraft(profileDetails);
  }, [profileDetails]);
  useEffect(() => {
    setOffers(Object.fromEntries(creatorRoles.offers.map((o) => [o.roleId, o.skill])));
    setSeeks(Object.fromEntries(creatorRoles.seeks.map((s) => [s.roleId, s.priority])));
  }, [creatorRoles]);

  const pct = completeness(draft, {
    offers: Object.keys(offers).length,
    seeks: Object.keys(seeks).length,
  });

  function toggleOffer(roleId: string) {
    setOffers((o) => {
      const next = { ...o };
      if (roleId in next) delete next[roleId];
      else next[roleId] = 3;
      return next;
    });
  }
  function toggleSeek(roleId: string) {
    setSeeks((s) => {
      const next = { ...s };
      if (roleId in next) delete next[roleId];
      else next[roleId] = 1;
      return next;
    });
  }
  function setSkill(roleId: string, skill: number) {
    setOffers((o) => ({ ...o, [roleId]: skill }));
  }
  function toggleMustHave(roleId: string) {
    setSeeks((s) => ({ ...s, [roleId]: s[roleId] === 3 ? 1 : 3 }));
  }

  function toggleFacet(
    key: "genres" | "daws" | "plugins" | "keys",
    value: string,
    max?: number
  ) {
    setDraft((d) => {
      const cur = new Set((d[key] as string[] | undefined) ?? []);
      if (cur.has(value)) cur.delete(value);
      else {
        if (max && cur.size >= max) return d;
        cur.add(value);
      }
      return { ...d, [key]: [...cur] };
    });
  }

  function save() {
    updateProfileDetails(draft);
    updateCreatorRoles(
      Object.entries(offers).map(([roleId, skill]) => ({ roleId, skill })),
      Object.entries(seeks).map(([roleId, priority]) => ({ roleId, priority }))
    );
  }

  function toggleArray(key: "interests" | "lookingFor" | "languages", value: string) {
    setDraft((d) => {
      const cur = new Set(d[key] ?? []);
      if (cur.has(value)) cur.delete(value);
      else {
        if (key === "interests" && cur.size >= MAX_INTERESTS) return d;
        cur.add(value);
      }
      return { ...d, [key]: [...cur] };
    });
  }

  function setTrait(traitKey: string, value: string) {
    setDraft((d) => {
      const traits = { ...(d.traits ?? {}) };
      if (traits[traitKey] === value) delete traits[traitKey];
      else traits[traitKey] = value;
      return { ...d, traits };
    });
  }

  function setPrompt(idx: number, q: string, a: string) {
    setDraft((d) => {
      const prompts = [...(d.prompts ?? [])];
      prompts[idx] = { q, a };
      return { ...d, prompts: prompts.filter((p) => p.q) };
    });
  }

  const Privacy = ({ section }: { section: string }) => {
    const hidden = isHidden(draft, section);
    return (
      <button
        onClick={() => setDraft((d) => toggleHidden(d, section))}
        className={cx(
          "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition active:scale-95",
          hidden
            ? "border-white/15 bg-white/5 text-white/55"
            : "border-feel/40 bg-feel/10 text-feel"
        )}
        aria-label={hidden ? "Private" : "Public"}
      >
        {hidden ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
        {hidden ? "Private" : "Public"}
      </button>
    );
  };

  return (
    <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 eyebrow">
          <Sparkles className="h-4 w-4 text-glow" /> Your profile
        </p>
        <span className="text-[11px] font-semibold text-veil-200">{pct}% complete</span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-veil-400 transition-all"
          style={{ width: `${pct}%`, boxShadow: "0 0 10px #c77dff" }}
        />
      </div>

      {/* Roles you offer — the core of complementary matching. */}
      <div className="mb-5 rounded-xl border border-feel/20 bg-feel/[0.04] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/85">I bring</span>
          <span className="text-[10px] text-white/40">
            {Object.keys(offers).length} selected
          </span>
        </div>
        <p className="mb-2.5 text-[11px] text-white/45">
          What you contribute to a collab. Tap the dots to rate your level.
        </p>
        {ROLE_FAMILIES.map((fam) => (
          <div key={fam.id} className="mb-2.5">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">
              {fam.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.filter((r) => r.family === fam.id).map((role) => {
                const on = role.id in offers;
                return (
                  <div key={role.id} className="flex flex-col items-start">
                    <button
                      onClick={() => toggleOffer(role.id)}
                      className={cx(
                        "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                        on
                          ? "bg-feel/25 text-white ring-1 ring-feel/50"
                          : "bg-white/[0.04] text-white/55"
                      )}
                    >
                      {role.label}
                    </button>
                    {on && (
                      <div className="mt-1 flex gap-0.5 pl-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            aria-label={`Skill ${n}`}
                            onClick={() => setSkill(role.id, n)}
                            className={cx(
                              "h-1.5 w-1.5 rounded-full transition",
                              n <= (offers[role.id] ?? 3)
                                ? "bg-feel"
                                : "bg-white/15"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Roles you're looking for. */}
      <div className="mb-5 rounded-xl border border-aqua-400/20 bg-aqua-400/[0.04] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/85">I'm looking for</span>
          <span className="text-[10px] text-white/40">
            {Object.keys(seeks).length} selected
          </span>
        </div>
        <p className="mb-2.5 text-[11px] text-white/45">
          The roles you want on your next track. Tap again to mark a must-have.
        </p>
        {ROLE_FAMILIES.map((fam) => (
          <div key={fam.id} className="mb-2.5">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">
              {fam.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.filter((r) => r.family === fam.id).map((role) => {
                const on = role.id in seeks;
                const must = seeks[role.id] === 3;
                return (
                  <button
                    key={role.id}
                    onClick={() => (on ? toggleMustHave(role.id) : toggleSeek(role.id))}
                    onDoubleClick={() => toggleSeek(role.id)}
                    className={cx(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                      must
                        ? "bg-aqua-400/40 text-white ring-1 ring-aqua-300"
                        : on
                        ? "bg-aqua-400/20 text-white ring-1 ring-aqua-400/50"
                        : "bg-white/[0.04] text-white/55"
                    )}
                  >
                    {must ? "★ " : ""}
                    {role.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Genres */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">
            Genres{" "}
            <span className="text-white/35">
              ({(draft.genres ?? []).length}/{MAX_GENRES})
            </span>
          </span>
          <Privacy section="genres" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((g) => {
            const on = (draft.genres ?? []).includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleFacet("genres", g, MAX_GENRES)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                  on
                    ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* DAWs */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">DAWs</span>
          <Privacy section="daws" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DAWS.map((d) => {
            const on = (draft.daws ?? []).includes(d.id);
            return (
              <button
                key={d.id}
                onClick={() => toggleFacet("daws", d.id)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                  on
                    ? "bg-glow/25 text-white ring-1 ring-glow/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plugins */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">
            Plugins{" "}
            <span className="text-white/35">
              ({(draft.plugins ?? []).length}/{MAX_PLUGINS})
            </span>
          </span>
          <Privacy section="plugins" />
        </div>
        <input
          value={pluginFilter}
          onChange={(e) => setPluginFilter(e.target.value)}
          placeholder="Search plugins…"
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
          {PLUGINS.filter(
            (p) =>
              !pluginFilter ||
              p.label.toLowerCase().includes(pluginFilter.toLowerCase()) ||
              p.vendor.toLowerCase().includes(pluginFilter.toLowerCase())
          ).map((p) => {
            const on = (draft.plugins ?? []).includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleFacet("plugins", p.id, MAX_PLUGINS)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                  on
                    ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Influences (free text → semantic resonance) */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">Influences</span>
          <Privacy section="influences" />
        </div>
        <textarea
          value={draft.influences ?? ""}
          maxLength={MAX_INFLUENCES}
          onChange={(e) => setDraft((d) => ({ ...d, influences: e.target.value }))}
          placeholder="Artists, producers, records that shape your sound…"
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />
        <p className="mt-1 text-right text-[10px] text-white/30">
          {(draft.influences ?? "").length}/{MAX_INFLUENCES}
        </p>
      </div>

      {/* Studio — tempo, keys, availability */}
      <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">Studio</span>
          <Privacy section="studio" />
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] text-white/45">Tempo</span>
          <input
            type="number"
            min={40}
            max={300}
            value={draft.tempoMin ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                tempoMin: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            placeholder="min"
            className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <span className="text-white/30">–</span>
          <input
            type="number"
            min={40}
            max={300}
            value={draft.tempoMax ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                tempoMax: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            placeholder="max"
            className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <span className="text-[11px] text-white/40">BPM</span>
        </div>
        <p className="mb-1 text-[10px] uppercase tracking-wider text-white/35">Keys</p>
        <div className="mb-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {MUSICAL_KEYS.map((k) => {
            const on = (draft.keys ?? []).includes(k);
            return (
              <button
                key={k}
                onClick={() => toggleFacet("keys", k)}
                className={cx(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium transition active:scale-95",
                  on
                    ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {k}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["openToWork", "Open to collab"],
              ["remoteOk", "Remote OK"],
            ] as const
          ).map(([key, label]) => {
            const on = !!draft[key];
            return (
              <button
                key={key}
                onClick={() => setDraft((d) => ({ ...d, [key]: !d[key] }))}
                className={cx(
                  "rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95",
                  on
                    ? "bg-feel/25 text-white ring-1 ring-feel/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bio */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">Bio</span>
          <Privacy section="bio" />
        </div>
        <textarea
          value={draft.bio ?? ""}
          maxLength={MAX_BIO}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          placeholder="Say something true. What are you about?"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />
        <p className="mt-1 text-right text-[10px] text-white/30">
          {(draft.bio ?? "").length}/{MAX_BIO}
        </p>
      </div>

      {/* Pronouns */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">Pronouns</span>
          <Privacy section="pronouns" />
        </div>
        <input
          value={draft.pronouns ?? ""}
          maxLength={24}
          onChange={(e) => setDraft((d) => ({ ...d, pronouns: e.target.value }))}
          placeholder="e.g. she/her, they/them"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
        />
      </div>

      {/* Interests */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">
            Interests{" "}
            <span className="text-white/35">
              ({(draft.interests ?? []).length}/{MAX_INTERESTS})
            </span>
          </span>
          <Privacy section="interests" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map((tag) => {
            const on = (draft.interests ?? []).includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleArray("interests", tag)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                  on
                    ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                    : "bg-white/[0.04] text-white/55"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Looking for + Languages (choice fields) */}
      {CHOICE_FIELDS.map((field) => (
        <div key={field.key} className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80">{field.label}</span>
            <Privacy section={field.key} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {field.options.map((opt) => {
              const on = ((draft[field.key] as string[] | undefined) ?? []).includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() =>
                    toggleArray(field.key as "lookingFor" | "languages", opt)
                  }
                  className={cx(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                    on
                      ? "bg-aqua-400/25 text-white ring-1 ring-aqua-400/50"
                      : "bg-white/[0.04] text-white/55"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Traits */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">About you</span>
          <Privacy section="traits" />
        </div>
        <div className="space-y-2">
          {TRAITS.map((trait) => (
            <div key={trait.key}>
              <p className="mb-1 text-[11px] uppercase tracking-wider text-white/40">
                {trait.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trait.options.map((opt) => {
                  const on = (draft.traits ?? {})[trait.key] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setTrait(trait.key, opt)}
                      className={cx(
                        "rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95",
                        on
                          ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                          : "bg-white/[0.04] text-white/55"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompts */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">Prompts</span>
          <Privacy section="prompts" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: MAX_PROMPTS }).map((_, i) => {
            const p = (draft.prompts ?? [])[i];
            return (
              <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                <select
                  value={p?.q ?? ""}
                  onChange={(e) => setPrompt(i, e.target.value, p?.a ?? "")}
                  className="mb-1.5 w-full rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-white/80 focus:outline-none"
                >
                  <option value="">Choose a prompt…</option>
                  {PROMPTS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                {p?.q && (
                  <input
                    value={p?.a ?? ""}
                    maxLength={140}
                    onChange={(e) => setPrompt(i, p.q, e.target.value)}
                    placeholder="Your answer…"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={save}
        className="w-full rounded-xl bg-veil-500 py-2.5 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98]"
      >
        Save profile
      </button>
      <p className="mt-2 text-[11px] text-white/40">
        Public sections appear on your profile and improve your matches. Private
        sections are hidden from everyone — but still quietly sharpen who you're
        matched with.
      </p>
    </div>
  );
}

function FriendAvatar({ friend }: { friend: { seed: number } }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
      <VeiledArt seed={friend.seed} revealed />
    </div>
  );
}

function StatTile({
  label,
  value,
  accent = "#ffffff",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
      <p className="font-display text-xl font-bold" style={{ color: accent }}>
        {formatCount(value)}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/45">
        {label}
      </p>
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  hint,
  progress,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  progress: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold" style={{ color }}>
        {value}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-white/40">{hint}</p>
    </div>
  );
}

/** Human-readable airtime from seconds (e.g. "3h 12m", "44m", "0m"). */
function formatAirtime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Streamer analytics — an exclusive profile section that appears ONLY for users
 * who have gone live at least once. Surfaces lifetime performance (Vybs, peak
 * viewers, airtime, Vyb rate) plus a breakdown of recent streams. Non-streamers
 * never see it: fetchMyStreamStats returns total_streams = 0 and we render null.
 */
function StreamerAnalytics() {
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void fetchMyStreamStats().then((s) => {
      if (!alive) return;
      setStats(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !stats || stats.totalStreams === 0) return null;

  const totalReacts = stats.totalVybs + stats.totalFails;
  const vybRate = totalReacts ? Math.round((stats.totalVybs / totalReacts) * 100) : 0;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-wild/25 bg-gradient-to-b from-wild/[0.09] to-transparent p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm font-bold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-wild/20 text-wild">
            <Radio className="h-4 w-4" />
          </span>
          Streamer
        </span>
        <span className="rounded-full bg-wild/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-wild">
          Live analytics
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StreamStat label="Streams" value={String(stats.totalStreams)} icon={<Radio className="h-3.5 w-3.5" />} />
        <StreamStat
          label="Total Vybs"
          value={formatCount(stats.totalVybs)}
          icon={<Radio className="h-3.5 w-3.5" />}
          accent="#34f5a0"
        />
        <StreamStat
          label="Peak viewers"
          value={formatCount(stats.peakViewers)}
          icon={<Eye className="h-3.5 w-3.5" />}
          accent="#7cc5ff"
        />
        <StreamStat
          label="Airtime"
          value={formatAirtime(stats.totalSeconds)}
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <StreamStat
          label="Best stream"
          value={formatCount(stats.bestVybs)}
          icon={<Star className="h-3.5 w-3.5" />}
          accent="#ffd166"
        />
        <StreamStat label="Vyb rate" value={`${vybRate}%`} icon={<Radio className="h-3.5 w-3.5" />} accent="#c77dff" />
      </div>

      {/* Vyb-vs-Fail health bar. */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-white/45">
          <span>Vyb rate</span>
          <span>
            {formatCount(stats.totalVybs)} Vybs · {formatCount(stats.totalFails)} Fails
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${vybRate}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-feel"
            style={{ boxShadow: "0 0 12px #34f5a0" }}
          />
        </div>
      </div>

      {/* Recent streams breakdown. */}
      {stats.recent.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">Recent streams</p>
          <div className="space-y-1.5">
            {stats.recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/85">
                    {s.title || "Untitled stream"}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {timeAgo(s.startedAt)} · {formatAirtime(s.seconds)}
                    {s.endedAt == null && (
                      <span className="ml-1.5 font-bold text-wild">● live</span>
                    )}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-feel">
                  <Radio className="h-3.5 w-3.5" />
                  {formatCount(s.vybs)}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-white/60">
                  <Eye className="h-3.5 w-3.5" />
                  {formatCount(s.peakViewers)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact stat cell used inside the streamer analytics grid. */
function StreamStat({
  label,
  value,
  icon,
  accent = "#ffffff",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center">
      <span className="mb-0.5 flex items-center justify-center" style={{ color: accent }}>
        {icon}
      </span>
      <p className="font-display text-base font-bold" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-white/45">{label}</p>
    </div>
  );
}

function OwnCard({ confession }: { confession: OwnConfession }) {
  const [revealed, setRevealed] = useState(false);
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [whisperDraft, setWhisperDraft] = useState("");
  const { whispers, setWhisper, isSpotlighted, spotlight } = useApp();
  const whisper = whispers[confession.id];
  const spotlighted = isSpotlighted(confession.id);

  function submitWhisper() {
    if (!whisperDraft.trim()) return;
    setWhisper(confession.id, whisperDraft);
    setWhisperDraft("");
    setWhisperOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
      <button
        onClick={() => setRevealed((r) => !r)}
        className="flex w-full items-stretch gap-3 p-3 text-left"
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
          <VeiledArt seed={confession.seed} revealed={revealed} />
        </div>
        <div className="min-w-0 flex-1">
          {confession.featured && (
            <span className="mb-1 inline-block text-[10px] font-semibold text-glow">
              ✦ Featured
            </span>
          )}
          <p
            className={cx(
              "text-sm leading-snug text-white/85",
              revealed ? "" : "line-clamp-2"
            )}
          >
            {confession.text}
          </p>
          {revealed && (
            <IdentityMeta
              gender={confession.gender}
              age={confession.age}
              location={confession.location}
              size="sm"
              className="mt-1"
            />
          )}
          <p className="mt-1 text-[11px] text-white/40">
            {timeAgo(confession.createdAt)}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-4 border-t border-white/8 px-3 py-2.5 text-xs">
        <span className="flex items-center gap-1 text-feel">
          <Eye className="h-3.5 w-3.5" />
          {formatCount(confession.feels)}
        </span>
        <span className="flex items-center gap-1 text-shroud">
          <EyeOff className="h-3.5 w-3.5" />
          {formatCount(confession.wilds)}
        </span>
        <span className="flex items-center gap-1 text-white/45">
          <Eye className="h-3.5 w-3.5" />
          {formatCount(confession.views)}
        </span>
        <Sparkline data={confession.trend} className="ml-auto" />
      </div>

      {/* Existing whisper-back to everyone who felt this confession. */}
      {whisper && (
        <div className="flex items-start gap-2 border-t border-white/8 bg-veil-500/[0.06] px-3 py-2.5">
          <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-veil-200" />
          <p className="text-xs italic leading-snug text-white/75">{whisper}</p>
        </div>
      )}

      {/* Whisper composer. */}
      {whisperOpen && (
        <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2.5">
          <input
            value={whisperDraft}
            onChange={(e) => setWhisperDraft(e.target.value.slice(0, 120))}
            onKeyDown={(e) => e.key === "Enter" && submitWhisper()}
            placeholder="One line to everyone who felt you…"
            className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
          />
          <button
            onClick={submitWhisper}
            aria-label="Send whisper"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-veil-500 text-white"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Owner actions: whisper + spotlight. */}
      <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2.5">
        <button
          onClick={() => setWhisperOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition active:scale-95"
        >
          <Megaphone className="h-3.5 w-3.5" />
          {whisper ? "Update whisper" : "Whisper back"}
        </button>
        <button
          onClick={() => spotlight(confession.id)}
          disabled={spotlighted}
          className={cx(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
            spotlighted
              ? "bg-amber-400/15 text-amber-300"
              : "bg-white/5 text-white/70"
          )}
        >
          <Star className="h-3.5 w-3.5" />
          {spotlighted ? "Spotlighted" : "Spotlight"}
        </button>
      </div>
    </div>
  );
}

/** Tiny inline SVG sparkline of the 7-day reaction trend. */
function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  const w = 60;
  const h = 20;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className={className} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="#c77dff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** One-time username customization (everyone starts with a random one). */
function UsernameSettings() {
  const { account, usernameLocked, changeUsername, backendEnabled, showToast } =
    useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [avail, setAvail] = useState<null | "checking" | boolean>(null);
  const [busy, setBusy] = useState(false);
  const checkRef = useRef<number | null>(null);

  const clean = normalizeUsername(name);
  const valid = isValidUsername(clean);

  useEffect(() => {
    setAvail(null);
    if (!editing || !valid || !backendEnabled) return;
    setAvail("checking");
    if (checkRef.current) clearTimeout(checkRef.current);
    checkRef.current = window.setTimeout(async () => {
      setAvail(await usernameAvailable(clean));
    }, 450);
    return () => {
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, [clean, valid, editing, backendEnabled]);

  async function save() {
    if (avail !== true || busy) return;
    setBusy(true);
    const ok = await changeUsername(clean);
    setBusy(false);
    if (ok) {
      setEditing(false);
      setName("");
    } else {
      showToast("Couldn't change username — it may be taken or already used.");
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.02] p-4">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-veil-200" />
        <h3 className="font-display text-sm font-semibold text-white">Username</h3>
      </div>
      <p className="mt-1 text-sm text-white/70">
        You are <span className="font-semibold text-white">{account?.username ?? "—"}</span>
      </p>

      {usernameLocked ? (
        <p className="mt-2 text-xs text-white/40">
          You've used your one-time username change.
        </p>
      ) : !editing ? (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 rounded-full bg-veil-500/20 px-4 py-2 text-xs font-semibold text-veil-100 ring-1 ring-veil-400/30 active:scale-95"
        >
          Customize Username
        </button>
      ) : (
        <div className="mt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Green Panda"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
          />
          <div className="mt-1.5 h-4 text-xs">
            {!name ? null : !valid ? (
              <span className="text-white/40">Use 1–3 words, letters only</span>
            ) : avail === "checking" ? (
              <span className="text-white/40">Checking…</span>
            ) : avail === true ? (
              <span className="font-semibold text-feel">✓ {clean} is available</span>
            ) : avail === false ? (
              <span className="font-semibold text-wild">Taken — try another</span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-white/35">
            One-time change — choose carefully.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={save}
              disabled={avail !== true || busy}
              className="flex-1 rounded-full bg-veil-500 py-2 text-xs font-semibold text-white shadow-glow active:scale-95 disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
            >
              {busy ? "Saving…" : "Save (one-time)"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName("");
              }}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/55 active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Master sound toggle + volume for platform and game audio. */
function SoundControl() {
  const { enabled, volume } = useSoundSettings();
  return (
    <div className="rounded-2xl bg-white/[0.02] p-4">
      <button
        onClick={() => {
          const next = !enabled;
          setSoundEnabled(next);
          if (next) playSound("tap");
        }}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="min-w-0 pr-3">
          <div className="flex items-center gap-1.5">
            {enabled ? (
              <Volume2 className="h-4 w-4 text-veil-200" />
            ) : (
              <VolumeX className="h-4 w-4 text-white/40" />
            )}
            <h3 className="font-display text-sm font-semibold text-white">Sound</h3>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            Tactile cues across the app and games. Off by default on silent.
          </p>
        </div>
        <span
          className={cx(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            enabled ? "bg-veil-500" : "bg-white/15"
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
              enabled ? "left-[22px]" : "left-0.5"
            )}
          />
        </span>
      </button>

      {enabled && (
        <div className="mt-3 flex items-center gap-3">
          <VolumeX className="h-3.5 w-3.5 shrink-0 text-white/35" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setSoundVolume(Number(e.target.value))}
            onPointerUp={() => playSound("tap")}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-veil-400"
            aria-label="Sound volume"
          />
          <Volume2 className="h-3.5 w-3.5 shrink-0 text-white/55" />
        </div>
      )}
    </div>
  );
}

function OfflineControl() {
  const { limitMB } = useOfflineSettings();
  const [usedMB, setUsedMB] = useState<number | null>(null);

  const refresh = useCallback(() => {
    void cacheUsageBytes().then((b) => setUsedMB(Math.round((b / (1024 * 1024)) * 10) / 10));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh, limitMB]);

  const label = (mb: number) =>
    mb === 0 ? "Off" : mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`;

  return (
    <div className="rounded-2xl bg-white/[0.02] p-4">
      <div className="flex items-center gap-1.5">
        <HardDrive className="h-4 w-4 text-veil-200" />
        <h3 className="font-display text-sm font-semibold text-white">
          Offline storage
        </h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        Automatically keep recent photos &amp; videos on this device for offline
        enjoyment. Choose how much space to use.
        {usedMB != null && limitMB > 0 && (
          <span className="text-white/40"> Currently using {usedMB} MB.</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {OFFLINE_PRESETS_MB.map((mb) => (
          <button
            key={mb}
            onClick={() => {
              setOfflineLimitMB(mb);
              setTimeout(refresh, 400);
            }}
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
              limitMB === mb
                ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                : "bg-white/[0.04] text-white/55"
            )}
          >
            {label(mb)}
          </button>
        ))}
      </div>
      {limitMB > 0 && (usedMB ?? 0) > 0 && (
        <button
          onClick={() => {
            void clearOfflineCache().then(refresh);
          }}
          className="mt-3 text-xs font-semibold text-white/45 underline-offset-2 hover:underline"
        >
          Clear offline media now
        </button>
      )}
    </div>
  );
}
