import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Crown,
  Heart,
  Loader2,
  MessageCircle,
  Music,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { Handle } from "@/components/Handle";
import { IdentityMeta } from "@/components/IdentityMeta";
import { WhisperCard } from "@/components/WhisperCard";
import {
  borderClass,
  fontClass,
  hasSparkle,
  nameShimmer,
  themeGradient,
} from "@/lib/cosmetics";
import { musicEmbed } from "@/lib/music";
import { cx, formatCount, timeAgo } from "@/lib/utils";
import { TRAITS } from "@/lib/profileFields";
import type { Confession, EchoPublic } from "@/types";

export function UserProfilePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { displayLevel, isNsfwHidden, openEcho } = useApp();
  const [profile, setProfile] = useState<backend.PublicProfile | null>(null);
  const [posts, setPosts] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [echo, setEcho] = useState<EchoPublic | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEcho(null);
    (async () => {
      const [p, c] = await Promise.all([
        backend.fetchPublicProfile(id),
        backend.fetchUserConfessions(id),
      ]);
      if (cancelled) return;
      setProfile(p);
      setPosts(c);
      setLoading(false);
      // Echo availability is gated server-side (enabled, both adults, not blocked).
      backend.fetchEchoPublic(id).then((e) => {
        if (!cancelled) setEcho(e);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-sm text-white/55">This veil has faded.</p>
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-veil-300">
          Go back
        </button>
      </div>
    );
  }

  const loadout = profile.loadout ?? {};
  const grad = themeGradient(loadout);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10">
      <div className="flex items-center gap-3 pt-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs uppercase tracking-wider text-white/40">Profile</span>
      </div>

      {/* Identity header (themed by equipped cosmetics). */}
      <div
        className="relative mt-3 overflow-hidden rounded-3xl border border-white/10 p-6"
        style={!profile.bannerUrl && grad ? { background: grad } : undefined}
      >
        {profile.bannerUrl ? (
          <div className="absolute inset-0 -z-10">
            <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-ink-950/20" />
          </div>
        ) : (
          !grad && <div className="absolute inset-0 -z-10 bg-veil-radial opacity-70" />
        )}
        {hasSparkle(loadout) && (
          <Sparkles className="absolute right-4 top-4 h-5 w-5 text-amber-300/70" />
        )}
        <div className="flex items-center gap-4">
          <div
            className={cx(
              "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/30",
              borderClass(loadout)
            )}
          >
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-8 w-8 text-veil-100" strokeWidth={2.25} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cx("flex items-center gap-2", nameShimmer(loadout) && "text-gradient")}>
              <span className={cx("text-base font-bold text-white", fontClass(loadout))}>
                <Handle
                  username={profile.username}
                  emoji={profile.alias}
                  size={18}
                />
              </span>
              {profile.godmode && (
                <span className="flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  <Crown className="h-3 w-3" /> Godmode
                </span>
              )}
            </div>
            <IdentityMeta
              gender={profile.gender ?? undefined}
              age={profile.age ?? undefined}
              location={profile.location ?? undefined}
              size="sm"
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Joined {timeAgo(profile.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats portfolio. */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Resonance" value={formatCount(profile.feels)} icon={<Heart className="h-3.5 w-3.5 text-feel-400" />} />
          <Stat label="Posts" value={String(profile.posts)} />
        </div>

        {/* Echo — chat with this member's opt-in AI while they're away. */}
        {echo && (
          <button
            onClick={() => openEcho(profile.id)}
            className="group mt-3 flex w-full items-center gap-3 rounded-2xl border border-aqua-400/25 bg-aqua-500/10 px-4 py-3 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-500/20 text-aqua-300">
              <MessageCircle className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                Chat with {echo.displayName || "their"} Echo
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
                  AI
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] text-white/45">
                An AI of this member, switched on by them
              </span>
            </span>
            <Sparkles className="h-4 w-4 shrink-0 text-aqua-300/70" />
          </button>
        )}
      </div>

      {/* Rich public profile (privacy-sanitized server-side). */}
      <ProfileDetailsView details={profile.details} />

      {/* Music. */}
      {(() => {
        const embed = musicEmbed(profile.musicUrl);
        if (!embed) return null;
        return (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] uppercase tracking-wider text-white/35">
              <Music className="h-3 w-3" /> On repeat
            </p>
            <iframe
              title="profile music"
              src={embed.src}
              height={embed.height}
              className="w-full rounded-2xl border border-white/10"
              allow="encrypted-media; clipboard-write; autoplay; fullscreen"
              loading="lazy"
            />
          </div>
        );
      })()}

      {/* Public posts. */}
      <p className="mb-2 mt-5 px-1 text-[11px] uppercase tracking-wider text-white/35">
        Posts
      </p>
      {posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">Nothing public yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {posts.map((c) => (
            <WhisperCard
              key={c.id}
              confession={c}
              level={displayLevel(c)}
              nsfwHidden={isNsfwHidden(c)}
              variant="tile"
              paused
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Public, privacy-sanitized rendering of a user's rich profile data points. */
function ProfileDetailsView({ details }: { details: backend.PublicProfile["details"] }) {
  const traitLabel = (key: string) => TRAITS.find((t) => t.key === key)?.label ?? key;
  const hasTraits = details.traits && Object.keys(details.traits).length > 0;
  const prompts = (details.prompts ?? []).filter((p) => p.q && p.a);
  const nothing =
    !details.bio &&
    !details.pronouns &&
    !(details.interests ?? []).length &&
    !(details.lookingFor ?? []).length &&
    !(details.languages ?? []).length &&
    !hasTraits &&
    !prompts.length;
  if (nothing) return null;

  const Chips = ({ items, tone }: { items: string[]; tone: string }) => (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className={cx("rounded-full px-2.5 py-1 text-xs font-medium", tone)}>
          {x}
        </span>
      ))}
    </div>
  );

  return (
    <div className="mt-3 space-y-3">
      {details.bio && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm leading-relaxed text-white/85">{details.bio}</p>
          {details.pronouns && (
            <p className="mt-1.5 text-[11px] text-white/40">{details.pronouns}</p>
          )}
        </div>
      )}

      {(details.interests ?? []).length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">Interests</p>
          <Chips items={details.interests ?? []} tone="bg-veil-500/20 text-veil-100" />
        </div>
      )}

      {(details.lookingFor ?? []).length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">Looking for</p>
          <Chips items={details.lookingFor ?? []} tone="bg-aqua-400/20 text-aqua-100" />
        </div>
      )}

      {(details.languages ?? []).length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/35">Languages</p>
          <Chips items={details.languages ?? []} tone="bg-white/10 text-white/80" />
        </div>
      )}

      {hasTraits && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(details.traits ?? {}).map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40">{traitLabel(k)}</p>
              <p className="mt-0.5 text-sm font-semibold text-white">{v}</p>
            </div>
          ))}
        </div>
      )}

      {prompts.map((p, i) => (
        <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold text-veil-200">{p.q}</p>
          <p className="mt-1 text-sm text-white/85">{p.a}</p>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3 text-center">
      <div className="flex items-center justify-center gap-1 font-display text-lg font-bold text-white">
        {icon}
        {value}
      </div>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}
