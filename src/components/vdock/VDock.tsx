import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { DockPlaybackProgress, NowPlayingWidget } from "@/components/GlobalPlayer";
import { DEFAULT_ORB_ACTIONS, type OrbFanAction } from "@/components/taskbar/OrbFan";
import { OrbJoystick } from "@/components/taskbar/OrbJoystick";
import { VDockItemRow, VDockTray, nearestDropTarget, pointOverVDock } from "@/components/vdock/VDockPins";
import { useVDockWidgetTimers } from "@/components/vdock/widgets/DockWidgets";
import {
  PIN_BY_ID,
  WIDGET_BY_ID,
  getVDockLayout,
  insertDockItem,
  removeDockItem,
  reorderDockItem,
  setVDockLayout,
  useVDockLayout,
  type DockItem,
  type DockSlot,
  type VDockLayout,
} from "@/lib/vdock/layout";
import { usePlayer } from "@/lib/audioBus";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";

type DragState = {
  item: DockItem;
  from: DockSlot | "catalog";
  x: number;
  y: number;
};

/** V-Dock — pins, widgets (any creative craft), Now Playing, Orb (immovable). */
export function VDock({ onCompose }: { onCompose: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unread } = useSession();
  const { track } = usePlayer();
  const saved = useVDockLayout();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<VDockLayout | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const orbZoneRef = useRef<HTMLDivElement>(null);
  const layout = draft ?? saved;
  const hasTrack = !!track;

  useVDockWidgetTimers();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--dock-reserve", "6.25rem");
    return () => { root.style.removeProperty("--dock-reserve"); };
  }, []);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") discardEdit(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function enterEdit(seed?: VDockLayout) {
    const base = seed ?? getVDockLayout();
    setDraft({ left: [...base.left], right: [...base.right] });
    setEditing(true);
    try { navigator.vibrate?.([8, 30, 8]); } catch { /* ignore */ }
  }

  function discardEdit() {
    setEditing(false);
    setDraft(null);
    setDrag(null);
  }

  function finishEdit() {
    if (draft) setVDockLayout(draft);
    setEditing(false);
    setDraft(null);
    setDrag(null);
  }

  function onLongPressEnter(_slot: DockSlot) {
    enterEdit(getVDockLayout());
  }

  function onDragStart(slot: DockSlot, point: { x: number; y: number }) {
    if (!draft) return;
    const item = draft[slot.side][slot.index];
    if (!item) return;
    setDrag({ item, from: slot, x: point.x, y: point.y });
  }

  function onCatalogDragStart(item: DockItem, point: { x: number; y: number }) {
    if (!draft) return;
    setDrag({ item, from: "catalog", x: point.x, y: point.y });
  }

  function onDragEnd(point: { x: number; y: number }) {
    setDrag((current) => {
      if (!current) return null;
      const overBar = pointOverVDock(point.x, point.y);
      const exclude = current.from === "catalog" ? undefined : current.from;
      const target = nearestDropTarget(point.x, point.y, exclude);

      if (current.from === "catalog") {
        if (target) {
          setDraft((d) => (d ? insertDockItem(d, current.item, target) : d));
          try { navigator.vibrate?.(8); } catch { /* ignore */ }
        }
        return null;
      }

      if (!overBar && !target) {
        setDraft((d) => (d ? removeDockItem(d, current.from as DockSlot) : d));
        try { navigator.vibrate?.(6); } catch { /* ignore */ }
        return null;
      }

      if (
        target &&
        (target.side !== (current.from as DockSlot).side || target.index !== (current.from as DockSlot).index)
      ) {
        setDraft((d) => (d ? reorderDockItem(d, current.from as DockSlot, target) : d));
        try { navigator.vibrate?.(8); } catch { /* ignore */ }
      }
      return null;
    });
  }

  useEffect(() => {
    if (!drag || !editing) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null));
    const up = (e: PointerEvent) => onDragEnd({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag, editing, draft]);

  const actions: OrbFanAction[] = DEFAULT_ORB_ACTIONS.map((a) => ({
    ...a,
    run: () => {
      if (a.id === "drop") onCompose();
      else if (a.id === "live") navigate(FLAGS.socialLive ? "/social?go=1" : "/live?go=1");
      else if (a.id === "spark") navigate("/spark");
      else if (a.id === "messages") navigate("/messages");
    },
  }));

  const dragKey = drag ? `${drag.item.kind}:${drag.item.id}` : null;
  const ghostIcon = drag
    ? (drag.item.kind === "pin" ? PIN_BY_ID[drag.item.id]?.icon : WIDGET_BY_ID[drag.item.id]?.icon)
    : null;
  const Ghost = ghostIcon;
  const removingHint = !!(drag && drag.from !== "catalog" && !pointOverVDock(drag.x, drag.y));

  const rowProps = {
    pathname,
    unread,
    editing,
    draft: layout,
    onLongPressEnter,
    draggingKey: dragKey,
    onDragStart,
  };

  return (
    <div className="group/vdock pointer-events-none flex w-full overflow-visible pb-[max(0.35rem,env(safe-area-inset-bottom))]">
      <div
        className={cx(
          "pointer-events-auto glass relative mx-0 flex w-full max-w-none flex-col overflow-visible",
          "rounded-none border-x-0 border-b-0 border-transparent",
          "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.95)]",
          editing && "ring-1 ring-veil-400/35",
        )}
        data-vdock
      >
        <VDockTray
          open={editing}
          draft={draft}
          draggingKey={dragKey}
          onDone={finishEdit}
          onCatalogDragStart={onCatalogDragStart}
        />

        <DockPlaybackProgress />

        <div
          className={cx(
            "relative grid h-[72px] w-full items-stretch px-[max(0.15rem,env(safe-area-inset-left))] pr-[max(0.15rem,env(safe-area-inset-right))] sm:h-[76px]",
            hasTrack
              ? "grid-cols-[minmax(0,1fr)_auto_auto_minmax(0,1fr)]"
              : "grid-cols-[1fr_auto_1fr]",
          )}
        >
          <VDockItemRow side="left" {...rowProps} />

          {hasTrack && (
            <div className="relative z-10 flex min-w-0 items-center border-x border-white/[0.06] px-1.5 sm:px-2">
              <NowPlayingWidget dimmed={editing} />
            </div>
          )}

          <div
            ref={orbZoneRef}
            className={cx(
              "relative z-20 flex shrink-0 items-center justify-center overflow-visible px-1",
              editing && "pointer-events-none opacity-40",
            )}
          >
            <OrbJoystick actions={actions} disabled={editing} />
          </div>

          <VDockItemRow side="right" {...rowProps} />
        </div>
      </div>

      {Ghost && drag && (
        <div
          className={cx(
            "pointer-events-none fixed z-[80] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border bg-ink-900/90 text-white shadow-card backdrop-blur-md",
            removingHint ? "border-wild/60 scale-90 opacity-70" : "border-veil-400/40",
          )}
          style={{ left: drag.x, top: drag.y }}
        >
          <Ghost className={cx("h-5 w-5", removingHint ? "text-wild" : "text-veil-200")} />
        </div>
      )}
    </div>
  );
}

/** @deprecated Use VDock */
export const Taskbar = VDock;
