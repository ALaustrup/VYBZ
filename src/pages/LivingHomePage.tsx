import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AudioLines, Inbox, Loader2, Pencil, Sparkles, Users, ChevronRight, Radio,
} from "lucide-react";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { ProfileLiveFeed } from "@/components/profile/ProfileLiveFeed";
import { useResolvedCosmetics, Flair, CosmeticAvatarShell } from "@/lib/cosmetics";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import {
  FOCUS_OPTIONS,
  resolveIntentMix,
  applyDockSeed,
  showCreateFacets,
  sealIntentMixPrivacy,
  type FocusMode,
  type IntentMix,
} from "@/lib/intentMix";
import { setVDockLayout } from "@/lib/vdock/layout";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";

/**
 * Phase 6 Concept F — Living Home Wall.
 * `/` is your place: hero + Focus + Wall alerts + Intent Mix pulse modules.
 */
export function LivingHomePage() {
  const { profile, unread, refreshProfile } = useSession();
  const navigate = useNavigate();
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  const [mix, setMix] = useState<IntentMix>(() => resolveIntentMix(profile?.profile));
  const [busyFocus, setBusyFocus] = useState(false);

  useEffect(() => {
    const next = resolveIntentMix(profile?.profile);
    setMix(next);
    applyDockSeed(next, setVDockLayout);
  }, [profile?.profile]);

  useRegisterAppBar({
    title: "Home",
    subtitle: "Your living canvas",
    actions: (
      <button
        type="button"
        onClick={() => navigate("/profile/edit")}
        aria-label="Customize profile"
        className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
      >
        <Pencil className="h-4 w-4" />
      </button>
    ),
  }, []);

  async function setFocus(focus: FocusMode) {
    if (!profile || busyFocus || mix.focus === focus) return;
    setBusyFocus(true);
    const next = { ...mix, focus };
    setMix(next);
    try {
      await api.updateMyProfile({
        profile: sealIntentMixPrivacy({ ...profile.profile, intentMix: next }),
      });
      await refreshProfile();
    } finally {
      setBusyFocus(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  const createOn = showCreateFacets(profile.profile);
  const loveOn = (mix.weights.love ?? 0) >= 0.15 || mix.pillars.includes("love");
  const meetupOn = (mix.weights.meetup ?? 0) >= 0.15 || mix.pillars.includes("meetup");
  const name = profile.displayName || profile.username || "You";

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-8 pt-2">
      {/* Hero — you */}
      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start gap-3">
          <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
            <Avatar url={profile.avatarUrl} name={profile.username} id={profile.id} size="lg" square />
          </CosmeticAvatarShell>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-white">{name}</h1>
              <Flair data={cosmetics.flair} />
            </div>
            {profile.username && (
              <p className="mt-0.5 text-[13px] text-white/45">@{profile.username}</p>
            )}
            <p className="mt-1.5 text-[13px] leading-snug text-white/55">
              {profile.bio?.trim()
                || (loveOn ? "Open to connection — your Wall lights up with people & messages."
                  : createOn ? "Your canvas for people and projects."
                    : "Your place on VYBZ — alerts, people, and what you love.")}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="eyebrow mb-2">Focus</p>
          <div className="flex flex-wrap gap-1.5">
            {FOCUS_OPTIONS.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={busyFocus}
                onClick={() => void setFocus(f.id)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-95",
                  mix.focus === f.id
                    ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50"
                    : "bg-white/[0.05] text-white/55 hover:text-white/80",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/profile/edit" className="btn btn-ghost h-8 px-3 py-0 text-[12px]">
            Customize
          </Link>
          <Link to="/store" className="btn btn-ghost h-8 px-3 py-0 text-[12px]">
            Flair
          </Link>
          {(unread ?? 0) > 0 && (
            <Link to="/messages" className="btn btn-primary h-8 px-3 py-0 text-[12px]">
              <Inbox className="h-3.5 w-3.5" /> {unread} new
            </Link>
          )}
        </div>
      </section>

      {/* Pulse modules — Intent Mix sized */}
      <section className="mb-5">
        <p className="eyebrow mb-2">Pulse</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(loveOn || meetupOn || mix.focus === "for_you" || mix.focus === "love" || mix.focus === "meetup") && (
            <PulseCard
              icon={Sparkles}
              title="Spark"
              body={meetupOn && !loveOn ? "Activity partners near you" : "People who match your vibe"}
              to="/spark"
            />
          )}
          <PulseCard
            icon={Inbox}
            title="Messages"
            body={(unread ?? 0) > 0 ? `${unread} unread` : "Free DM, voice & cam"}
            to="/messages"
          />
          {createOn && (
            <PulseCard
              icon={Users}
              title="Network"
              body="Complementary collaborators"
              to="/connect"
            />
          )}
          {(createOn || mix.focus === "create") && (
            <PulseCard
              icon={AudioLines}
              title="Drops"
              body="Sound from the network"
              to="/feed"
            />
          )}
          <PulseCard
            icon={Radio}
            title="Live & rooms"
            body="Presence without pressure"
            to="/social"
          />
        </div>
      </section>

      {/* Wall — Live Feed */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="eyebrow">Your Wall</p>
          <Link to="/profile?tab=inbox" className="flex items-center gap-1 text-[12px] font-semibold text-veil-200">
            Inbox <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mb-3 text-[12px] text-white/40">
          Matches, messages, and moments — right on your canvas.
        </p>
        <ProfileLiveFeed />
      </section>
    </div>
  );
}

function PulseCard({
  icon: Icon,
  title,
  body,
  to,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 transition hover:border-veil-400/35 active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-veil-500/15 text-veil-100">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-semibold text-white">{title}</span>
        <span className="block truncate text-[12px] text-white/45">{body}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
    </Link>
  );
}
