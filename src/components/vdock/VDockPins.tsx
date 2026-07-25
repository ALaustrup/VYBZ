import { useMemo, useRef, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useSession } from "@/store/session";
import { DockWidget } from "@/components/vdock/widgets/DockWidgets";
import {
  MAX_LEFT,
  MAX_RIGHT,
  PIN_BY_ID,
  WIDGET_CATALOG,
  catalogPinsForRole,
  pinIsActive,
  useVDockLayout,
  type DockItem,
  type DockSide,
  type DockSlot,
  type PinId,
  type VDockLayout,
  type WidgetId,
} from "@/lib/vdock/layout";
import { cx } from "@/lib/utils";

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;

export function VDockItemRow({
  side,
  pathname,
  unread,
  editing = false,
  draft,
  onLongPressEnter,
  draggingKey,
  onDragStart,
}: {
  side: DockSide;
  pathname: string;
  unread: number;
  editing?: boolean;
  draft?: VDockLayout;
  onLongPressEnter?: (slot: DockSlot) => void;
  draggingKey?: string | null;
  onDragStart?: (slot: DockSlot, point: { x: number; y: number }) => void;
}) {
  const saved = useVDockLayout();
  const items = (draft ?? saved)[side];
  const max = side === "left" ? MAX_LEFT : MAX_RIGHT;

  return (
    <div
      className="flex h-full w-full min-w-0 items-center justify-evenly"
      data-vdock-side={side}
      data-taskbar-drop={side}
      data-vdock-drop={side}
    >
      {editing && items.length === 0 && (
        <div
          data-pin-slot={`${side}-0`}
          data-dock-slot={`${side}-0`}
          className="mx-1 flex h-full min-h-[44px] w-full flex-1 items-center justify-center rounded-2xl border border-dashed border-white/20 text-[10px] font-medium text-white/35"
        >
          Drop here · max {max}
        </div>
      )}
      {items.map((item, index) => {
        const slot: DockSlot = { side, index };
        const key = `${item.kind}:${item.id}`;
        const isDragging = draggingKey === key;

        if (item.kind === "widget") {
          return (
            <div
              key={key}
              data-pin-slot={`${side}-${index}`}
              data-dock-slot={`${side}-${index}`}
              data-pin-id={key}
              className={cx("flex h-full min-w-0 flex-1", isDragging && "opacity-30")}
            >
              <DockWidget
                id={item.id}
                editing={editing}
                onDragStart={editing ? (point) => onDragStart?.(slot, point) : undefined}
              />
            </div>
          );
        }

        const pin = PIN_BY_ID[item.id];
        if (!pin) return null;
        const Icon = pin.icon;
        const active = !editing && pinIsActive(pin, pathname);
        const showBadge = !editing && pin.badgeUnread && unread > 0 && pathname !== "/activity";

        const className = cx(
          "relative flex h-full min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1 transition touch-none select-none",
          editing ? "vdock-pin-jiggle text-white/80" : active ? "text-white" : "text-white/45 hover:text-white/80",
          isDragging && "opacity-30",
        );

        const inner = (
          <>
            {active && (
              <motion.span
                layoutId="vdock-pin-active"
                className="absolute inset-0 rounded-2xl bg-veil-500/14 ring-1 ring-veil-400/35"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              <Icon className={cx("h-[18px] w-[18px]", active && "text-veil-200")} />
              {showBadge && (
                <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-wild px-0.5 text-[8px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            <span className={cx("relative z-10 hidden text-[9px] font-semibold sm:block", active ? "text-white/90" : "text-white/40")}>
              {pin.label}
            </span>
          </>
        );

        if (editing) {
          return (
            <button
              key={key}
              type="button"
              data-pin-slot={`${side}-${index}`}
              data-dock-slot={`${side}-${index}`}
              data-pin-id={key}
              aria-label={`Move ${pin.label}`}
              className={className}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                onDragStart?.(slot, { x: e.clientX, y: e.clientY });
              }}
            >
              {inner}
            </button>
          );
        }

        return (
          <PinNavItem
            key={key}
            to={pin.to}
            end={!!pin.end}
            label={pin.label}
            className={className}
            slot={slot}
            onLongPressEnter={onLongPressEnter}
          >
            {inner}
          </PinNavItem>
        );
      })}
    </div>
  );
}

function PinNavItem({
  to, end, label, className, slot, onLongPressEnter, children,
}: {
  to: string; end: boolean; label: string; className: string; slot: DockSlot;
  onLongPressEnter?: (slot: DockSlot) => void; children: ReactNode;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const armed = useRef(false);
  function clear() {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
    armed.current = false;
  }
  return (
    <NavLink
      to={to} end={end} aria-label={label} title={label} className={className} draggable={false}
      onPointerDown={(e) => {
        if (e.button !== 0 || !onLongPressEnter) return;
        start.current = { x: e.clientX, y: e.clientY };
        armed.current = false;
        timer.current = window.setTimeout(() => {
          armed.current = true;
          try { navigator.vibrate?.(12); } catch { /* ignore */ }
          onLongPressEnter(slot);
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        if (!start.current || timer.current == null) return;
        const dx = e.clientX - start.current.x;
        const dy = e.clientY - start.current.y;
        if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) clear();
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onClick={(e) => { if (armed.current) { e.preventDefault(); armed.current = false; } }}
      onContextMenu={(e) => { if (onLongPressEnter) e.preventDefault(); }}
    >
      {children}
    </NavLink>
  );
}

export function VDockTray({
  open,
  draft,
  draggingKey,
  onDone,
  onCatalogDragStart,
}: {
  open: boolean;
  draft: VDockLayout | null;
  draggingKey?: string | null;
  onDone: () => void;
  onCatalogDragStart: (item: DockItem, point: { x: number; y: number }) => void;
}) {
  const { profile } = useSession();
  const pins = useMemo(
    () => catalogPinsForRole({
      isMod: profile?.platformRole === "moderator" || profile?.platformRole === "admin" || profile?.isAdmin,
      isAdmin: !!(profile?.isAdmin || profile?.platformRole === "admin"),
    }),
    [profile],
  );
  const placed = new Set([...(draft?.left ?? []), ...(draft?.right ?? [])].map((i) => `${i.kind}:${i.id}`));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="mat-surface-strong pointer-events-auto absolute bottom-[calc(100%+0.65rem)] left-1/2 z-40 w-[min(100vw-1rem,28rem)] -translate-x-1/2 overflow-hidden rounded-3xl"
          data-vdock-tray
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3">
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-semibold text-white">Customize V-Dock</h2>
              <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                Pins navigate. Widgets are tools. Drag onto left (max {MAX_LEFT}) or right (max {MAX_RIGHT}).
                Orb stays.
              </p>
            </div>
            <button type="button" onClick={onDone} className="cta-pill h-8 shrink-0 !text-[12px]">
              <Check className="h-3.5 w-3.5" /> Done
            </button>
          </div>

          <div className="no-scrollbar max-h-[48dvh] overflow-y-auto p-3">
            <p className="eyebrow mb-2 px-1">Pins</p>
            <div className="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {pins.map((p) => {
                const on = placed.has(`pin:${p.id}`);
                const Icon = p.icon;
                return (
                  <CatalogChip
                    key={p.id}
                    label={p.label}
                    on={on}
                    dim={draggingKey === `pin:${p.id}`}
                    icon={<Icon className="h-5 w-5" />}
                    onPointerDown={(pt) => onCatalogDragStart({ kind: "pin", id: p.id as PinId }, pt)}
                  />
                );
              })}
            </div>
            <p className="eyebrow mb-2 px-1">Widgets</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {WIDGET_CATALOG.map((w) => {
                const on = placed.has(`widget:${w.id}`);
                const Icon = w.icon;
                return (
                  <CatalogChip
                    key={w.id}
                    label={w.label}
                    on={on}
                    dim={draggingKey === `widget:${w.id}`}
                    icon={<Icon className="h-5 w-5" />}
                    onPointerDown={(pt) => onCatalogDragStart({ kind: "widget", id: w.id as WidgetId }, pt)}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CatalogChip({
  label, on, dim, icon, onPointerDown,
}: {
  label: string; on: boolean; dim?: boolean; icon: ReactNode;
  onPointerDown: (point: { x: number; y: number }) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      className={cx(
        "flex flex-col items-center gap-1 rounded-2xl border px-1.5 py-2.5 touch-none select-none transition active:scale-95",
        on ? "border-veil-400/40 bg-veil-500/15 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
        dim && "opacity-35",
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        onPointerDown({ x: e.clientX, y: e.clientY });
      }}
    >
      {icon}
      <span className="w-full truncate text-center text-[9px] font-semibold">{label}</span>
    </button>
  );
}

export function nearestDropTarget(x: number, y: number, exclude?: DockSlot): DockSlot | null {
  const nodes = document.querySelectorAll<HTMLElement>("[data-dock-slot], [data-pin-slot]");
  let best: DockSlot | null = null;
  let bestDist = Infinity;
  nodes.forEach((el) => {
    const key = el.dataset.dockSlot || el.dataset.pinSlot;
    if (!key) return;
    const [side, idxStr] = key.split("-") as [DockSide, string];
    const index = Number(idxStr);
    if (exclude && exclude.side === side && exclude.index === index) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = { side, index };
    }
  });
  if (bestDist <= 88 * 88 && best) return best;

  const sides = document.querySelectorAll<HTMLElement>("[data-vdock-drop], [data-taskbar-drop]");
  for (const el of sides) {
    const side = (el.dataset.vdockDrop || el.dataset.taskbarDrop) as DockSide | undefined;
    if (!side) continue;
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top - 12 && y <= r.bottom + 12) {
      const count = el.querySelectorAll("[data-pin-id]").length;
      return { side, index: count };
    }
  }
  return null;
}

export function pointOverVDock(x: number, y: number): boolean {
  const sides = document.querySelectorAll<HTMLElement>("[data-vdock-drop], [data-taskbar-drop]");
  for (const el of sides) {
    const r = el.getBoundingClientRect();
    if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 20 && y <= r.bottom + 20) return true;
  }
  return false;
}
