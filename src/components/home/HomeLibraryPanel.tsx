import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HardDrive, Library, Loader2, Pause, Play, Upload } from "lucide-react";
import { listVisibleCatalog } from "@/features/assetNode/catalog";
import * as api from "@/lib/api";
import { playTrack, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { classifyDrop, isPlayableAudioWork } from "@/features/profile/workKind";
import { useSession } from "@/store/session";
import type { Drop } from "@/types";

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

/**
 * Own-library slice on Home. Measured counts only. Place stays in Library.
 */
export function HomeLibraryPanel({ onCompose }: { onCompose: () => void }) {
  const { userId } = useSession();
  const navigate = useNavigate();
  const player = usePlayer();
  const [drops, setDrops] = useState<Drop[] | null>(null);
  const [workCount, setWorkCount] = useState<number | null>(null);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [page, total, catalog] = await Promise.all([
      api.dropsBy(userId, 6).catch(() => [] as Drop[]),
      api.countDropsBy(userId).catch(() => 0),
      listVisibleCatalog().catch(() => ({ nodes: [], assets: [] })),
    ]);
    setDrops(page);
    setWorkCount(total);
    setDeviceCount(catalog.assets.length);
  }, [userId]);

  useEffect(() => {
    void load();
    const ch = api.subscribeInserts("drops", undefined, () => void load());
    return () => api.unsubscribe(ch);
  }, [load]);

  if (!userId) return null;

  function toggle(d: Drop) {
    if (!isPlayableAudioWork(d)) return;
    playTrack(
      toPlayerTrack(d),
      (drops ?? []).filter((x) => isPlayableAudioWork(x)).map(toPlayerTrack),
    );
  }

  return (
    <section data-testid="home-library-panel" aria-label="Library">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Library
          </p>
          <h2 className="font-display text-lg font-semibold text-white">Your work</h2>
          <p className="mt-0.5 text-[12px] text-white/40">
            {workCount === null
              ? "…"
              : `${workCount} ${workCount === 1 ? "work" : "works"}`}
            {deviceCount !== null ? ` · ${deviceCount} on this device` : ""}
          </p>
        </div>
        <Link to="/library" className="text-[12px] text-white/45 transition hover:text-white/80">
          Open library
        </Link>
      </div>

      {drops === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/35" />
        </div>
      ) : drops.length === 0 ? (
        <div className="forge-glass relative flex flex-col gap-3 !rounded-2xl px-4 py-4">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <p className="relative z-[1] text-sm text-white/50">
            Private until you Place it on your VYBZ.
          </p>
          <div className="relative z-[1] flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCompose}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 text-[12px] font-semibold text-white/85"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => navigate("/library?tab=device")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 text-[12px] font-semibold text-white/85"
            >
              <HardDrive className="h-3.5 w-3.5" />
              This device
            </button>
          </div>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
          {drops.map((d) => {
            const isCurrent = player.track?.id === d.id;
            const playing = isCurrent && player.playing;
            const title = d.title?.trim() || "Untitled";
            const kind = classifyDrop(d);
            const playable = isPlayableAudioWork(d);
            return (
              <li key={d.id} className="border-b border-white/[0.06] last:border-b-0">
                <button
                  type="button"
                  onClick={() => (playable ? toggle(d) : navigate("/library"))}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/[0.04]"
                >
                  {kind === "image" && d.audioUrl ? (
                    <img
                      src={d.audioUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/70">
                      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{title}</span>
                    <span className="block truncate text-[11px] text-white/40">
                      {kind !== "audio"
                        ? kind
                        : fmtTime(d.durationSec ?? 0) || "Private until placed"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3 px-0.5 text-[12px] text-white/40">
        <Link to="/library" className="inline-flex items-center gap-1 hover:text-white/75">
          <Library className="h-3.5 w-3.5" />
          Place on your VYBZ
        </Link>
        <Link to="/library?tab=device" className="hover:text-white/75">
          Index this device
        </Link>
      </div>
    </section>
  );
}
