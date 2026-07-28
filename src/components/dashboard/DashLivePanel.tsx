import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, Radio } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ProfileLiveFeed } from "@/components/profile/ProfileLiveFeed";
import { VcTipSheet } from "@/components/VcTipSheet";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { formatVcAddress } from "@/lib/vc";
import type { LiveSessionCard } from "@/types";

/** Active live streams + Vc tip; alerts feed below. */
export function DashLivePanel() {
  const { userId } = useSession();
  const [sessions, setSessions] = useState<LiveSessionCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tip, setTip] = useState<LiveSessionCard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSessions(await api.listLiveSessions(40));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow mb-2 flex items-center gap-1.5"><Radio className="h-3.5 w-3.5" /> Live now</p>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
        ) : sessions.length === 0 ? (
          <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40">
            No one is live. When they are, tip them with Vc.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => {
              const isSelf = s.hostId === userId;
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <Avatar url={s.avatarUrl} name={s.displayName || s.username} id={s.hostId} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{s.title || "Live session"}</p>
                    <p className="truncate font-mono text-[11px] text-cyan-200/70">
                      {formatVcAddress(s.username) || s.displayName || "Host"}
                    </p>
                    <p className="text-[11px] text-white/35">{s.viewerCount} watching</p>
                  </div>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => setTip(s)}
                      className="flex h-9 items-center gap-1.5 rounded-full bg-[rgb(var(--neon-mint)/0.18)] px-3 text-xs font-semibold text-[rgb(var(--neon-mint))] ring-1 ring-[rgb(var(--neon-mint)/0.35)] active:scale-95"
                    >
                      <Gift className="h-3.5 w-3.5" /> Tip
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <p className="eyebrow mb-2">Alerts</p>
        <ProfileLiveFeed />
      </div>

      <VcTipSheet
        open={!!tip}
        onClose={() => setTip(null)}
        username={tip?.username ?? null}
        displayName={tip?.displayName}
        hostId={tip?.hostId}
      />
    </div>
  );
}
