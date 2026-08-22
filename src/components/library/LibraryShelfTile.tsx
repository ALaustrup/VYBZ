import { useRef, useState } from "react";
import { Check, MoreVertical, Pause, Play, Sparkles } from "lucide-react";
import { TrackActionMenu } from "@/components/TrackActionMenu";
import type { MenuAnchor } from "@/components/menu/ContextMenu";
import { isPlayableMediaUrl, playTrack, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { paletteFor, cx } from "@/lib/utils";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import type { Drop } from "@/types";

/**
 * Horizontal shelf tile — one work in a row of many.
 * Shares TrackActionMenu with grid / list / table so an action is the same everywhere.
 */
export function LibraryShelfTile({
  drop: d,
  selected,
  onSelect,
  isFeatured,
  onStage,
  onChanged,
  onPlace,
  snapshotDropIds,
}: {
  drop: Drop;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  isFeatured: boolean;
  onStage: boolean;
  onChanged: (c: { kind: "deleted" | "renamed" | "featured" | "placed"; dropId: string; title?: string }) => void;
  onPlace: () => void;
  snapshotDropIds?: string[];
}) {
  const player = usePlayer();
  const { showToast } = useSession();
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const isCurrent = player.track?.id === d.id;
  const playing = isCurrent && player.playing;
  const playable = isPlayableMediaUrl(d.audioUrl);
  const [c1, c2] = paletteFor(d.seed);
  const cover = d.playbackCustomization?.backdropUrl;

  function togglePlay() {
    if (!playable) {
      showToast("This drop has no playable audio URL yet");
      return;
    }
    if (!isCurrent) void api.recordPlay(d.id);
    playTrack(toPlayerTrack(d));
  }

  return (
    <li
      className={cx(
        "group w-[9.5rem] shrink-0 snap-start overflow-hidden rounded-2xl border transition",
        selected ? "border-[rgb(var(--accent-rgb)/0.55)]" : "border-white/10 hover:border-white/22",
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuAnchor({ x: e.clientX, y: e.clientY });
      }}
    >
      <div className="relative aspect-square overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(145deg, ${c1}, ${c2} 70%, #050508)` }}
          />
        )}
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${d.title?.trim() || "Untitled"}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e);
          }}
          data-testid="library-select-item"
          className={cx(
            "absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border backdrop-blur",
            selected
              ? "border-transparent bg-[rgb(var(--accent-rgb))] text-black"
              : "border-white/30 bg-black/40 text-transparent",
          )}
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute inset-0 z-[1] flex items-center justify-center bg-black/0 hover:bg-black/25"
        >
          {playing ? (
            <Pause className="h-8 w-8 text-white drop-shadow" />
          ) : (
            <Play className="ml-0.5 h-8 w-8 text-white/90 opacity-0 drop-shadow transition group-hover:opacity-100 hover:opacity-100" />
          )}
        </button>
      </div>
      <div className="flex items-start gap-1 px-2 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white/90">{d.title?.trim() || "Untitled"}</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-wide text-white/35">
            {d.audioFormat ?? "File"}
            {onStage ? " · On VYBZ" : ""}
          </p>
        </div>
        {isFeatured ? <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" /> : null}
        <button
          ref={moreRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const rect = moreRef.current?.getBoundingClientRect();
            setMenuAnchor(rect ? { x: rect.right - 248, y: rect.bottom + 6 } : { x: 16, y: 16 });
          }}
          aria-label={`Actions for ${d.title?.trim() || "this track"}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/45 hover:text-white"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      {onStage ? (
        <button
          type="button"
          onClick={onPlace}
          className="w-full border-t border-white/8 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/70 hover:text-cyan-100"
        >
          Arrange
        </button>
      ) : (
        <button
          type="button"
          onClick={onPlace}
          data-testid={`place-tile-${d.id}`}
          className="w-full border-t border-white/8 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45 hover:text-white"
        >
          Place
        </button>
      )}
      {menuAnchor !== null ? (
        <TrackActionMenu
          drop={d}
          open
          anchor={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          returnFocusTo={moreRef.current}
          onChanged={onChanged}
          onPlay={togglePlay}
          isFeatured={isFeatured}
          onStage={onStage}
          snapshotDropIds={snapshotDropIds}
        />
      ) : null}
    </li>
  );
}
