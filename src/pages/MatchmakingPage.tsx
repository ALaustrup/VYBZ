import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Disc3,
  Flame,
  Heart,
  Loader2,
  Music2,
  Repeat,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { EmptyState } from "@/components/EmptyState";
import {
  fetchCollabMatches,
  fetchMyVoteStats,
  fetchUserMatches,
  type CollabMatch,
  type UserMatch,
  type VoteStats,
} from "@/lib/backend";
import { cx } from "@/lib/utils";

/**
 * Connect — VYBZ's collaboration hub. Leads with the complementary-role engine
 * (collab_matches): creators who offer what you seek and/or seek what you offer,
 * blended with genre/DAW/plugin/tempo overlap + semantic resonance. Every match
 * explains its "why". A secondary taste layer (user_matches) surfaces people you
 * simply vibe with. Matchmaking is the first-class citizen here.
 */
export function MatchmakingPage() {
  const { hasWallet, openAccountGate, backendEnabled, creatorRoles } = useApp();
  const navigate = useNavigate();
  const [collabs, setCollabs] = useState<CollabMatch[]>([]);
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [stats, setStats] = useState<VoteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCollabMatches(30),
      fetchUserMatches(12),
      fetchMyVoteStats(),
    ]).then(([c, m, s]) => {
      if (cancelled) return;
      setCollabs(c);
      setMatches(m);
      setStats(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasIdentity =
    creatorRoles.offers.length > 0 || creatorRoles.seeks.length > 0;
  const open = (id: string) => (hasWallet ? navigate(`/u/${id}`) : openAccountGate());

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-1 pt-3">
        <button
          onClick={() => navigate("/profile")}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-xl font-bold text-gradient">Connect</h1>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {/* Two entry points: swipe collaborators (Spark) + the opportunity board. */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate("/spark")}
            className="flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-veil-400/30 bg-gradient-to-br from-veil-500/25 to-wild/10 p-3.5 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900/60">
              <Flame className="h-5 w-5 text-veil-100" />
            </span>
            <p className="font-display text-sm font-bold text-white">Spark</p>
            <p className="text-[11px] leading-tight text-white/55">
              Swipe to match by vibe
            </p>
          </button>
          <button
            onClick={() => navigate("/opportunities")}
            className="flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-aqua-400/30 bg-gradient-to-br from-aqua-400/20 to-glow/10 p-3.5 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900/60">
              <Briefcase className="h-5 w-5 text-aqua-200" />
            </span>
            <p className="font-display text-sm font-bold text-white">Opportunities</p>
            <p className="text-[11px] leading-tight text-white/55">
              Post &amp; find open roles
            </p>
          </button>
        </div>

        {/* Nudge to complete the creator identity when it's empty. */}
        {backendEnabled && !hasIdentity && !loading && (
          <button
            onClick={() => navigate("/profile")}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-aqua-400/25 bg-aqua-400/[0.06] p-3.5 text-left transition active:scale-[0.99]"
          >
            <Target className="h-5 w-5 shrink-0 text-aqua-300" />
            <p className="text-xs text-white/70">
              Add the roles you <span className="font-semibold text-white">bring</span> and
              the ones you're <span className="font-semibold text-white">looking for</span> —
              that's what powers precise collaborator matches.
            </p>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
          </button>
        )}

        <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
          <Sparkles className="h-3.5 w-3.5 text-veil-300" />
          Collaborators for you
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        ) : !backendEnabled ? (
          <EmptyState
            icon={Users}
            title="Connect is offline"
            body="Matchmaking needs the live backend. Once connected, we'll surface creators who complement exactly what you bring and seek."
          />
        ) : collabs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No collaborators yet"
            body="Set the roles you bring and want on your profile. The moment complementary creators join, they'll appear here — best-fit first, both directions."
          />
        ) : (
          <div className="space-y-2.5">
            {collabs.map((c) => (
              <CollabCard key={c.userId} c={c} onOpen={() => open(c.userId)} />
            ))}
          </div>
        )}

        {/* Secondary: taste-based affinity (inherited social signal). */}
        {matches.length > 0 && (
          <>
            <p className="mb-2 mt-6 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40">
              <Heart className="h-3.5 w-3.5 text-feel" />
              People you'd vibe with
            </p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <Metric icon={Heart} label="Vybs" value={stats?.feelsGiven ?? 0} tone="text-feel" />
              <Metric icon={Sparkles} label="Fails" value={stats?.wildsGiven ?? 0} tone="text-wild" />
              <Metric icon={Users} label="Matches" value={stats?.matches ?? 0} tone="text-veil-200" />
            </div>
            <div className="space-y-2">
              {matches.map((m) => (
                <button
                  key={m.userId}
                  onClick={() => open(m.userId)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left transition active:scale-[0.99]"
                >
                  <Avatar name={m.username || m.alias} tone="bg-veil-500/20 text-veil-100" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-white">
                      {m.username || m.alias}
                    </p>
                    <p className="truncate text-xs text-white/45">
                      {Math.round(m.affinity * 100)}% vibe
                      {m.sharedInterests > 0 &&
                        ` · ${m.sharedInterests} shared ${m.sharedInterests === 1 ? "interest" : "interests"}`}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-veil-500/15 px-3 py-1.5 text-xs font-semibold text-veil-100">
                    <UserPlus className="h-3.5 w-3.5" /> View
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One complementary-collaborator card, explaining its "why". */
function CollabCard({ c, onOpen }: { c: CollabMatch; onOpen: () => void }) {
  const name = c.username || c.alias;
  return (
    <button
      onClick={onOpen}
      className={cx(
        "block w-full rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
        c.mutual
          ? "border-feel/35 bg-gradient-to-br from-feel/10 to-aqua-400/[0.06]"
          : "border-white/8 bg-white/[0.03]"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={name}
          tone={c.mutual ? "bg-feel/25 text-white" : "bg-veil-500/20 text-veil-100"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display font-semibold text-white">{name}</p>
            {c.mutual && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-feel">
                <Repeat className="h-2.5 w-2.5" /> Mutual fit
              </span>
            )}
          </div>
          <p className="text-xs text-white/45">{Math.round(c.fit * 100)}% fit</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
          <UserPlus className="h-3.5 w-3.5" /> View
        </span>
      </div>

      {/* The "why" — role complementarity first. */}
      <div className="mt-2.5 space-y-1.5">
        {c.offersYouSeek.length > 0 && (
          <Why
            icon={<Music2 className="h-3 w-3 text-feel" />}
            label="Has what you want"
            items={c.offersYouSeek}
            tone="text-feel"
          />
        )}
        {c.seeksYouOffer.length > 0 && (
          <Why
            icon={<Target className="h-3 w-3 text-aqua-300" />}
            label="Wants what you bring"
            items={c.seeksYouOffer}
            tone="text-aqua-200"
          />
        )}
        {(c.shared_genres.length > 0 ||
          c.shared_daws.length > 0 ||
          c.shared_plugins.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {c.shared_genres.slice(0, 3).map((g) => (
              <Tag key={`g-${g}`} tone="bg-veil-500/20 text-veil-100">
                {g}
              </Tag>
            ))}
            {c.shared_daws.slice(0, 2).map((d) => (
              <Tag key={`d-${d}`} tone="bg-glow/20 text-white">
                <Disc3 className="mr-0.5 inline h-2.5 w-2.5" />
                {d}
              </Tag>
            ))}
            {c.shared_plugins.slice(0, 2).map((p) => (
              <Tag key={`p-${p}`} tone="bg-white/10 text-white/80">
                {p}
              </Tag>
            ))}
          </div>
        )}
        {c.resonance >= 0.6 && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-aqua-300">
            <Sparkles className="h-3 w-3" /> Strong resonance · your sounds just fit
          </p>
        )}
      </div>
    </button>
  );
}

function Why({
  icon,
  label,
  items,
  tone,
}: {
  icon: ReactNode;
  label: string;
  items: string[];
  tone: string;
}) {
  return (
    <p className="flex flex-wrap items-center gap-1 text-[11px] text-white/55">
      {icon}
      <span className="text-white/40">{label}:</span>
      <span className={cx("font-semibold", tone)}>{items.join(" · ")}</span>
    </p>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-medium", tone)}>
      {children}
    </span>
  );
}

function Avatar({ name, tone }: { name: string; tone: string }) {
  return (
    <span
      className={cx(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold",
        tone
      )}
    >
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Heart;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-center">
      <Icon className={`mx-auto h-4 w-4 ${tone}`} />
      <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] text-white/45">{label}</p>
    </div>
  );
}
