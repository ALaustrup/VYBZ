import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Loader2, Sparkles, UserPlus, Users } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { EmptyState } from "@/components/EmptyState";
import {
  fetchMyVoteStats,
  fetchUserMatches,
  type UserMatch,
  type VoteStats,
} from "@/lib/backend";

/**
 * Matchmaking — "People you'd vibe with." Connects you to users whose taste
 * overlaps yours, computed from the posts you both Vyb. Your voting metrics are
 * individual and curated to you; the same signal quietly powers these matches.
 */
export function MatchmakingPage() {
  const { hasWallet, openAccountGate, backendEnabled } = useApp();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [stats, setStats] = useState<VoteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchUserMatches(24), fetchMyVoteStats()]).then(([m, s]) => {
      if (cancelled) return;
      setMatches(m);
      setStats(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        {/* Your individual, curated voting metrics. */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Metric icon={Heart} label="Vybs" value={stats?.feelsGiven ?? 0} tone="text-feel" />
          <Metric icon={Sparkles} label="Fails" value={stats?.wildsGiven ?? 0} tone="text-wild" />
          <Metric icon={Users} label="Matches" value={stats?.matches ?? 0} tone="text-veil-200" />
        </div>

        <p className="mb-2 flex items-center gap-1.5 text-[11px] text-white/40">
          <Sparkles className="h-3.5 w-3.5 text-veil-300" />
          People who Vyb what you Vyb — ranked by shared taste
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        ) : !backendEnabled || matches.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matches yet"
            body="Vyb more confessions you connect with. As your taste takes shape, we'll surface the people you're most likely to vibe with."
          />
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <button
                key={m.userId}
                onClick={() => (hasWallet ? navigate(`/u/${m.userId}`) : openAccountGate())}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left transition active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-veil-500/20 font-display text-sm font-bold text-veil-100">
                  {(m.username || m.alias || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-white">
                    {m.username || m.alias}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {Math.round(m.affinity * 100)}% taste match · {m.shared} shared{" "}
                    {m.shared === 1 ? "Vyb" : "Vybs"}
                    {m.sharedDislikes > 0 && ` · ${m.sharedDislikes} shared Fails`}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-veil-500/15 px-3 py-1.5 text-xs font-semibold text-veil-100">
                  <UserPlus className="h-3.5 w-3.5" /> View
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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
