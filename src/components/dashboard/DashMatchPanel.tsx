import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, Music2, UserPlus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";

/** Music-taste matches from shared listens / ratings / genres. */
export function DashMatchPanel() {
  const { showToast } = useSession();
  const [rows, setRows] = useState<api.TasteMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await api.tasteMatches(40));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function connect(id: string) {
    setBusyId(id);
    try {
      await api.connect(id);
      void api.logMatchFeedback(id, "connect", "connect_page");
      showToast("Connection requested");
      setRows((prev) => prev.filter((r) => r.userId !== id));
    } catch (e) {
      showToast((e as Error).message || "Could not connect");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>;
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-10 text-center">
        <Music2 className="mx-auto mb-3 h-8 w-8 text-cyan-200/50" />
        <p className="font-display text-base text-white/85">No taste matches yet</p>
        <p className="mt-1 text-[13px] text-white/40">
          Listen to others&apos; drops and leave real feedback — affinity builds from shared plays and ratings.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((m) => {
        const pct = Math.round(Math.min(1, Math.max(0, m.fit)) * 100);
        return (
          <li key={m.userId} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
            <Avatar url={m.avatarUrl} name={m.displayName || m.username} id={m.userId} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[15px] font-semibold text-white">
                {m.displayName || m.username || "Member"}
              </p>
              <p className="truncate font-mono text-[11px] text-cyan-200/70">
                {formatVcAddress(m.username) || "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-white/40">
                {pct}% taste · {m.sharedPlays} shared listens
                {m.sharedGenres.length > 0 ? ` · ${m.sharedGenres.slice(0, 3).join(" · ")}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === m.userId}
              onClick={() => void connect(m.userId)}
              className={cx(
                "flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
                "bg-[rgb(var(--neon-cyan)/0.18)] text-cyan-100 ring-1 ring-cyan-300/30 active:scale-95 disabled:opacity-40",
              )}
            >
              {busyId === m.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Connect
            </button>
          </li>
        );
      })}
      <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-white/35">
        <Heart className="h-3 w-3" /> Matched by what you actually listen to
      </p>
    </ul>
  );
}
