import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { usePlayer, seek } from "@/lib/audioBus";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** SoundCloud-style timestamped comments on a drop. */
export function WaveComments({ dropId }: { dropId: string }) {
  const player = usePlayer();
  const { showToast, userId } = useSession();
  const [rows, setRows] = useState<api.WaveComment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const active = player.track?.id === dropId;

  const load = useCallback(async () => {
    setRows(await api.listWaveComments(dropId));
  }, [dropId]);

  useEffect(() => { void load(); }, [load]);

  async function post() {
    if (!userId) return;
    const t = active ? player.currentTime : 0;
    setBusy(true);
    const res = await api.addWaveComment(dropId, body, t);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error || "Couldn't post");
      return;
    }
    setBody("");
    showToast(`Comment @ ${fmt(t)}`);
    await load();
  }

  return (
    <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
        <MessageSquare className="h-3.5 w-3.5" /> Wave comments
      </p>
      <div className="mb-2 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 280))}
          placeholder={active ? `Comment at ${fmt(player.currentTime)}…` : "Play to stamp time, or comment at 0:00"}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
        />
        <button type="button" disabled={busy || !body.trim()} onClick={() => void post()} className="btn btn-primary h-9 px-3 text-xs disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-[12px] text-white/35">Be first on the wave.</p>
      ) : (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto">
          {rows.map((c) => {
            const hot = active && Math.abs(player.currentTime - c.timeSec) < 1.25;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { if (active) seek(c.timeSec); }}
                  className={cx(
                    "flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition",
                    hot ? "bg-[rgb(var(--neon-cyan)/0.15)] ring-1 ring-cyan-300/30" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="shrink-0 font-mono text-[10px] text-cyan-200/80">{fmt(c.timeSec)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-white/40">{formatVcAddress(c.username)} </span>
                    <span className="text-[12px] text-white/75">{c.body}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
