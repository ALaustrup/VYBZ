import { useRef, useState } from "react";
import { Check, MoreVertical, Pause, Play, Star } from "lucide-react";
import { TrackActionMenu } from "@/components/TrackActionMenu";
import type { MenuAnchor } from "@/components/menu/ContextMenu";
import { isPlayableMediaUrl, playTrack, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { Drop } from "@/types";

function fmtTime(s?: number): string {
  if (!s || !Number.isFinite(s)) return "—";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

/**
 * Dense library row for list and table views. Shares the same contextual action menu
 * as the card, so an action behaves identically wherever a track appears.
 */
export function LibraryRow({
  drop: d,
  variant,
  selected,
  onSelect,
  isFeatured,
  onChanged,
}: {
  drop: Drop;
  variant: "list" | "table";
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  isFeatured: boolean;
  onChanged: (c: { kind: "deleted" | "renamed" | "featured"; dropId: string; title?: string }) => void;
}) {
  const player = usePlayer();
  const { showToast } = useSession();
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  const isCurrent = player.track?.id === d.id;
  const playing = isCurrent && player.playing;
  const playable = isPlayableMediaUrl(d.audioUrl);

  function togglePlay() {
    if (!playable) {
      showToast("This drop has no playable audio URL yet");
      return;
    }
    if (!isCurrent) void api.recordPlay(d.id);
    playTrack(toPlayerTrack(d));
  }

  // Mounted only while open: the menu subscribes to the player and session, which would
  // otherwise cost one subscription per row in a large library.
  const menu =
    menuAnchor !== null ? (
      <TrackActionMenu
        drop={d}
        open
        anchor={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        returnFocusTo={moreRef.current}
        onChanged={onChanged}
        onPlay={togglePlay}
        isFeatured={isFeatured}
      />
    ) : null;

  const checkbox = (
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
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
        selected
          ? "border-transparent bg-[rgb(var(--accent-rgb))] text-black"
          : "border-white/25 text-transparent hover:border-white/50"
      )}
    >
      <Check className="h-3 w-3" />
    </button>
  );

  const more = (
    <button
      ref={moreRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const rect = moreRef.current?.getBoundingClientRect();
        setMenuAnchor(rect ? { x: rect.right - 248, y: rect.bottom + 6 } : { x: 16, y: 16 });
      }}
      aria-label={`Actions for ${d.title?.trim() || "this track"}`}
      aria-haspopup="menu"
      aria-expanded={menuAnchor !== null}
      data-testid={`track-actions-${d.id}`}
      className="track-action-affordance flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/55 hover:bg-white/[0.08] hover:text-white active:scale-90"
    >
      <MoreVertical className="h-4 w-4" />
    </button>
  );

  if (variant === "table") {
    return (
      <li
        className={cx(
          "group grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2 border-b border-white/[0.05] px-2.5 py-2 text-[13px] transition last:border-0",
          selected ? "bg-[rgb(var(--accent-rgb)/0.08)]" : "hover:bg-white/[0.03]"
        )}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuAnchor({ x: e.clientX, y: e.clientY });
        }}
      >
        {checkbox}
        <button
          type="button"
          onClick={togglePlay}
          className="flex min-w-0 items-center gap-2 text-left"
          title={d.title?.trim() || "Untitled"}
        >
          {playing ? (
            <Pause className="h-3 w-3 shrink-0 text-suite-cyan" />
          ) : (
            <Play className="h-3 w-3 shrink-0 text-white/30" />
          )}
          <span className="truncate text-white/85">{d.title?.trim() || "Untitled"}</span>
          {isFeatured && <Star className="h-3 w-3 shrink-0 text-amber-300" fill="currentColor" />}
        </button>
        <span className="hidden font-mono text-[11px] uppercase text-white/40 sm:block">
          {d.audioFormat ?? "—"}
        </span>
        <span className="font-mono text-[11px] text-white/40">{fmtTime(d.durationSec)}</span>
        <span className="flex items-center justify-end gap-1.5">
          <span className="font-mono text-[11px] text-white/40">{d.plays ?? 0}</span>
          {more}
        </span>
        {menu}
      </li>
    );
  }

  return (
    <li
      className={cx(
        "group flex items-center gap-3 rounded-xl border px-2.5 py-2 transition",
        selected
          ? "border-[rgb(var(--accent-rgb)/0.45)] bg-[rgb(var(--accent-rgb)/0.08)]"
          : "border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03]"
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuAnchor({ x: e.clientX, y: e.clientY });
      }}
    >
      {checkbox}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.05] text-white/75 hover:text-white active:scale-90"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-white/90">
          <span className="truncate">{d.title?.trim() || "Untitled"}</span>
          {isFeatured && <Star className="h-3 w-3 shrink-0 text-amber-300" fill="currentColor" />}
        </p>
        <p className="truncate font-mono text-[10px] uppercase tracking-wide text-white/35">
          {[d.album?.trim() || "Single", d.audioFormat ?? null, fmtTime(d.durationSec)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <span className="hidden shrink-0 items-center gap-3 text-[11px] text-white/35 sm:flex">
        <span title="Plays">{d.plays ?? 0} plays</span>
        <span title="Vyb reactions">♥ {d.feels}</span>
      </span>
      {more}
      {menu}
    </li>
  );
}
