import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { OverlayPortal } from "@/lib/overlayPortal";
import { cx } from "@/lib/utils";

export type MenuAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Short trailing hint — shortcut, format, or state. */
  hint?: string;
  /** Present means the item is disabled and this explains why. */
  disabledReason?: string;
  danger?: boolean;
  /** Leave the menu open after selecting (used by multi-step flows). */
  keepOpen?: boolean;
  onSelect?: () => void | Promise<void>;
};

export type MenuGroup = {
  id: string;
  label?: string;
  actions: MenuAction[];
};

export type MenuAnchor = { x: number; y: number };

const MENU_WIDTH = 248;
const VIEWPORT_PAD = 8;

/** Touch and coarse pointers get a bottom sheet; fine pointers get an anchored popover. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

function flatten(groups: MenuGroup[]): MenuAction[] {
  return groups.flatMap((g) => g.actions);
}

export function ContextMenu({
  open,
  anchor,
  groups,
  title,
  subtitle,
  onClose,
  returnFocusTo,
}: {
  open: boolean;
  anchor: MenuAnchor | null;
  groups: MenuGroup[];
  title?: string;
  subtitle?: string;
  onClose: () => void;
  /** Element that opened the menu — focus returns here on close. */
  returnFocusTo?: HTMLElement | null;
}) {
  const finePointer = useFinePointer();
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pos, setPos] = useState<MenuAnchor>({ x: 0, y: 0 });

  const visibleGroups = useMemo(
    () => groups.filter((g) => g.actions.length > 0),
    [groups]
  );
  const items = useMemo(() => flatten(visibleGroups), [visibleGroups]);
  const enabledIndexes = useMemo(
    () => items.map((a, i) => (a.disabledReason ? -1 : i)).filter((i) => i >= 0),
    [items]
  );

  useEffect(() => {
    if (open) setActiveIdx(enabledIndexes[0] ?? 0);
  }, [open, enabledIndexes]);

  // Clamp the popover inside the viewport before paint so it never opens offscreen.
  useLayoutEffect(() => {
    if (!open || !anchor || !finePointer) return;
    const height = listRef.current?.offsetHeight ?? 320;
    const maxX = window.innerWidth - MENU_WIDTH - VIEWPORT_PAD;
    const maxY = window.innerHeight - height - VIEWPORT_PAD;
    setPos({
      x: Math.max(VIEWPORT_PAD, Math.min(anchor.x, Math.max(VIEWPORT_PAD, maxX))),
      y: Math.max(VIEWPORT_PAD, Math.min(anchor.y, Math.max(VIEWPORT_PAD, maxY))),
    });
  }, [open, anchor, finePointer, visibleGroups]);

  const close = useCallback(() => {
    onClose();
    returnFocusTo?.focus?.();
  }, [onClose, returnFocusTo]);

  const run = useCallback(
    (action: MenuAction) => {
      if (action.disabledReason) return;
      if (!action.keepOpen) close();
      void action.onSelect?.();
    },
    [close]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        close();
        return;
      }
      if (!enabledIndexes.length) return;
      const cursor = enabledIndexes.indexOf(activeIdx);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx(enabledIndexes[(cursor + 1 + enabledIndexes.length) % enabledIndexes.length]!);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(enabledIndexes[(cursor - 1 + enabledIndexes.length) % enabledIndexes.length]!);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIdx(enabledIndexes[0]!);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIdx(enabledIndexes[enabledIndexes.length - 1]!);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const action = items[activeIdx];
        if (action) run(action);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, activeIdx, enabledIndexes, items, run, close]);

  // Move DOM focus to the menu so screen readers announce it and keys land here.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => listRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  let runningIdx = -1;

  const body = (
    <div
      ref={listRef}
      role="menu"
      aria-label={title ? `Actions for ${title}` : "Actions"}
      tabIndex={-1}
      className={cx(
        "mat-surface-strong relative flex flex-col overflow-hidden outline-none",
        finePointer
          ? "rounded-2xl border border-white/12 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.85)]"
          : "rounded-t-3xl border-t border-white/12"
      )}
      style={finePointer ? { width: MENU_WIDTH } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {(title || subtitle) && (
        <div className="border-b border-[var(--hairline)] px-3.5 pb-2.5 pt-3">
          {title && (
            <p className="truncate text-[13px] font-semibold text-white" title={title}>
              {title}
            </p>
          )}
          {subtitle && <p className="truncate text-[11px] text-white/40">{subtitle}</p>}
        </div>
      )}

      <div
        className={cx(
          "no-scrollbar min-h-0 flex-1 overflow-y-auto p-1.5",
          finePointer ? "max-h-[70vh]" : "max-h-[65dvh] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        )}
      >
        {visibleGroups.map((group, gi) => (
          <div key={group.id} className={gi > 0 ? "mt-1 border-t border-[var(--hairline)] pt-1" : undefined}>
            {group.label && (
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {group.label}
              </p>
            )}
            {group.actions.map((action) => {
              runningIdx += 1;
              const idx = runningIdx;
              const disabled = Boolean(action.disabledReason);
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  aria-disabled={disabled}
                  data-testid={`track-action-${action.id}`}
                  title={action.disabledReason}
                  tabIndex={-1}
                  onMouseEnter={() => !disabled && setActiveIdx(idx)}
                  onClick={() => run(action)}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 text-left transition",
                    finePointer ? "py-2 text-[13px]" : "py-3 text-[15px]",
                    disabled
                      ? "cursor-not-allowed text-white/25"
                      : action.danger
                        ? "text-wild hover:bg-wild/10"
                        : "text-white/85 hover:bg-white/[0.07]",
                    !disabled && activeIdx === idx && (action.danger ? "bg-wild/10" : "bg-white/[0.07]")
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : <span className="w-4 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate">{action.label}</span>
                  {action.hint && !disabled && (
                    <span className="shrink-0 font-mono text-[10px] text-white/30">{action.hint}</span>
                  )}
                  {disabled && (
                    <span className="shrink-0 text-[10px] text-white/30">Unavailable</span>
                  )}
                </button>
              );
            })}
            {group.actions
              .filter((a) => a.disabledReason)
              .map((a) => (
                <p key={`${a.id}-why`} className="px-2.5 pb-1 text-[10px] leading-snug text-white/30">
                  {a.label}: {a.disabledReason}
                </p>
              ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <OverlayPortal>
      <AnimatePresence>
        <motion.div
          key="scrim"
          className={cx("fixed inset-0 z-[95]", finePointer ? "" : "bg-black/60 backdrop-blur-sm")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.12 }}
          onClick={close}
          onContextMenu={(e) => {
            e.preventDefault();
            close();
          }}
        >
          {finePointer ? (
            <motion.div
              className="absolute"
              style={{ left: pos.x, top: pos.y }}
              initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              animate={reduce ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
            >
              {body}
            </motion.div>
          ) : (
            <motion.div
              className="absolute inset-x-0 bottom-0"
              initial={reduce ? undefined : { y: 24, opacity: 0 }}
              animate={reduce ? undefined : { y: 0, opacity: 1 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {body}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </OverlayPortal>
  );
}
