import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CornerDownLeft, Search } from "lucide-react";
import { availableDestinations } from "@/app/routeTruth";
import { OverlayPortal } from "@/lib/overlayPortal";
import { next as playerNext, prev as playerPrev, toggle, toggleMute, usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";
import { type Command, buildCommands, rankCommands } from "@/shell/commands";
import {
  closeCommandPalette,
  openCommandPalette as openFromShortcut,
  useCommandPaletteOpen,
} from "@/shell/commandPaletteStore";

const LIST_ID = "command-palette-list";
const optionId = (id: string) => `command-palette-option-${id.replace(/[^a-z0-9]+/gi, "-")}`;

/**
 * Keyboard-first navigation and actions.
 *
 * It replaces a read-only input that looked like search and did nothing. Every
 * entry either runs or states why it cannot, and navigation entries come from
 * `routeTruth`, so the palette can never offer a page that does not exist.
 */
export function CommandPalette({
  onCompose,
  onBulkUpload,
}: {
  onCompose?: () => void;
  onBulkUpload?: () => void;
}) {
  const open = useCommandPaletteOpen();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const player = usePlayer();
  const reduce = useReduceFx();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const commands = useMemo(
    () =>
      buildCommands({
        destinations: availableDestinations({ storefront: !!FLAGS.storefront }),
        currentPath: pathname,
        hasTrack: !!player.track,
        playing: player.playing,
        queueLength: player.queueLength,
        queueIndex: player.queueIndex,
        canCompose: !!onCompose,
        canBulkUpload: !!onBulkUpload,
      }),
    [
      pathname,
      player.track,
      player.playing,
      player.queueLength,
      player.queueIndex,
      onCompose,
      onBulkUpload,
    ],
  );

  const results = useMemo(() => rankCommands(commands, query), [commands, query]);

  // Keep the selection inside the list as it shrinks under typing.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActiveIndex(0);
    // Focus after paint so the portal node exists.
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const dismiss = useCallback(() => {
    closeCommandPalette();
    restoreFocusTo.current?.focus?.();
  }, []);

  const run = useCallback(
    (command: Command) => {
      if (command.unavailableReason) return;
      if (command.to) {
        navigate(command.to);
      } else {
        switch (command.id) {
          case "player:toggle":
            void toggle();
            break;
          case "player:next":
            playerNext();
            break;
          case "player:prev":
            playerPrev();
            break;
          case "player:mute":
            toggleMute();
            break;
          case "create:drop":
            onCompose?.();
            break;
          case "create:batch":
            onBulkUpload?.();
            break;
          default:
            return;
        }
      }
      dismiss();
    },
    [navigate, onCompose, onBulkUpload, dismiss],
  );

  // Ctrl/Cmd+K anywhere. Registered whether or not the palette is open, so the
  // shortcut also closes it. Nothing else in the app binds a modifier chord.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      e.preventDefault();
      if (open) dismiss();
      else openFromShortcut();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  // Scroll the active option into view without moving DOM focus off the input.
  useEffect(() => {
    if (!open) return;
    const active = results[activeIndex];
    if (!active) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(active.id))}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, results]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + dir + results.length) % results.length);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(Math.max(0, results.length - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[activeIndex];
      if (chosen) run(chosen);
    }
  }

  const active = results[activeIndex];

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center px-4 pt-[12vh]"
        data-testid="command-palette"
      >
        <button
          type="button"
          aria-label="Close command palette"
          onClick={dismiss}
          className="absolute inset-0 h-full w-full cursor-default bg-black/60"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className={cx(
            "forge-glass relative z-[1] w-full max-w-xl overflow-hidden",
            !reduce && "animate-[vybz-reveal_0.18s_cubic-bezier(0.16,1,0.3,1)_both]",
          )}
        >
          <span className="forge-glass-edge" aria-hidden />
          <div className="relative z-[1] flex items-center gap-2.5 border-b border-[var(--surface-border)] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={LIST_ID}
              aria-activedescendant={active ? optionId(active.id) : undefined}
              aria-autocomplete="list"
              aria-label="Search"
              placeholder="Go somewhere…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded-md border border-[var(--surface-border)] px-1.5 py-0.5 text-[10px] font-semibold text-white/40 sm:block">
              Esc
            </kbd>
          </div>

          {results.length === 0 ? (
            <p className="relative z-[1] px-4 py-8 text-center text-[13px] text-white/45">
              Nothing matches “{query}”.
            </p>
          ) : (
            <ul
              ref={listRef}
              id={LIST_ID}
              role="listbox"
              aria-label="Commands"
              className="relative z-[1] max-h-[min(24rem,50vh)] overflow-y-auto p-1.5"
            >
              {results.map((command, i) => {
                const disabled = !!command.unavailableReason;
                const selected = i === activeIndex;
                return (
                  <li
                    key={command.id}
                    id={optionId(command.id)}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={disabled || undefined}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => run(command)}
                    className={cx(
                      "flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[13px]",
                      selected && !disabled && "bg-white/10",
                      selected && disabled && "bg-white/[0.04]",
                      disabled && "cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cx(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        disabled ? "text-white/25" : "text-[rgb(var(--accent-rgb))]",
                      )}
                    >
                      {command.group}
                    </span>
                    <span className={cx("min-w-0 flex-1 truncate", disabled ? "text-white/35" : "text-white/90")}>
                      {command.title}
                    </span>
                    {disabled ? (
                      <span className="shrink-0 text-[11px] text-white/30">
                        {command.unavailableReason}
                      </span>
                    ) : selected ? (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </OverlayPortal>
  );
}
