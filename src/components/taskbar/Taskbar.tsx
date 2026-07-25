import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { DockPlaybackProgress, NowPlayingWidget } from "@/components/GlobalPlayer";
import { DEFAULT_ORB_ACTIONS, type OrbFanAction } from "@/components/taskbar/OrbFan";
import { OrbJoystick } from "@/components/taskbar/OrbJoystick";
import {
  TaskbarPinRow,
  TaskbarPinTray,
  nearestDropTarget,
  pointOverTaskbar,
} from "@/components/taskbar/TaskbarPins";
import {
  PIN_BY_ID,
  getTaskbarPins,
  insertPin,
  removePin,
  reorderPin,
  setTaskbarPins,
  useTaskbarPins,
  type PinId,
  type PinSlot,
  type TaskbarPinsState,
} from "@/lib/taskbarPins";
import { usePlayer } from "@/lib/audioBus";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";

type DragState = {
  id: PinId;
  from: PinSlot | "catalog";
  x: number;
  y: number;
};

/** Bottom-centered taskbar — pins + Orb + integrated player (mobile = desktop). */
export function Taskbar({ onCompose }: { onCompose: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unread } = useSession();
  const { track } = usePlayer();
  const saved = useTaskbarPins();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TaskbarPinsState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const orbZoneRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pins = draft ?? saved;
  const hasTrack = !!track;

  useEffect(() => {
    // Single unified dock height (player is an inline widget, not a second bar).
    const root = document.documentElement;
    root.style.setProperty("--dock-reserve", "6.25rem");
    return () => {
      root.style.removeProperty("--dock-reserve");
    };
  }, []);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") discardEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function enterEdit(seed?: TaskbarPinsState) {
    const base = seed ?? getTaskbarPins();
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
    if (draft) setTaskbarPins(draft);
    setEditing(false);
    setDraft(null);
    setDrag(null);
  }

  function onLongPressEnter(_slot: PinSlot) {
    enterEdit(getTaskbarPins());
  }

  function onDragStart(slot: PinSlot, point: { x: number; y: number }) {
    if (!draft) return;
    const id = draft[slot.side][slot.index];
    if (!id) return;
    setDrag({ id, from: slot, x: point.x, y: point.y });
  }

  function onCatalogDragStart(id: PinId, point: { x: number; y: number }) {
    if (!draft) return;
    setDrag({ id, from: "catalog", x: point.x, y: point.y });
  }

  function onDragMove(point: { x: number; y: number }) {
    setDrag((d) => (d ? { ...d, x: point.x, y: point.y } : null));
  }

  function onDragEnd(point: { x: number; y: number }) {
    setDrag((current) => {
      if (!current) return null;
      const overBar = pointOverTaskbar(point.x, point.y);
      const exclude = current.from === "catalog" ? undefined : current.from;
      const target = nearestDropTarget(point.x, point.y, exclude);

      if (current.from === "catalog") {
        if (target) {
          setDraft((d) => (d ? insertPin(d, current.id, target) : d));
          try { navigator.vibrate?.(8); } catch { /* ignore */ }
        }
        return null;
      }

      // Dragged off the taskbar → remove
      if (!overBar && !target) {
        setDraft((d) => (d ? removePin(d, current.from as PinSlot) : d));
        try { navigator.vibrate?.(6); } catch { /* ignore */ }
        return null;
      }

      if (
        target &&
        (target.side !== current.from.side || target.index !== current.from.index)
      ) {
        setDraft((d) => (d ? reorderPin(d, current.from as PinSlot, target) : d));
        try { navigator.vibrate?.(8); } catch { /* ignore */ }
      }
      return null;
    });
  }

  useEffect(() => {
    if (!drag || !editing) return;
    const move = (e: PointerEvent) => onDragMove({ x: e.clientX, y: e.clientY });
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

  const ghost = drag ? PIN_BY_ID[drag.id] : null;
  const removingHint = !!(drag && drag.from !== "catalog" && !pointOverTaskbar(drag.x, drag.y));

  const pinProps = {
    pathname,
    unread,
    orientation: "horizontal" as const,
    editing,
    draft: pins,
    onLongPressEnter,
    draggingId: drag?.id ?? null,
    onDragStart,
  };

  return (
    <div className="group/taskbar pointer-events-none flex w-full overflow-visible pb-[max(0.35rem,env(safe-area-inset-bottom))]">
      <div
        ref={barRef}
        className={cx(
          "pointer-events-auto glass relative mx-0 flex w-full max-w-none flex-col overflow-visible",
          "rounded-none border-x-0 border-b-0 border-transparent",
          "shadow-[0_18px_50px_-28px_rgba(0,0,0,0.95)]",
          editing && "ring-1 ring-veil-400/35",
        )}
      >
        <TaskbarPinTray
          open={editing}
          draft={draft}
          draggingId={drag?.id ?? null}
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
          <TaskbarPinRow side="left" {...pinProps} spread />

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

          <TaskbarPinRow side="right" {...pinProps} spread />
        </div>
      </div>

      {ghost && drag && (
        <div
          className={cx(
            "pointer-events-none fixed z-[80] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border bg-ink-900/90 text-white shadow-card backdrop-blur-md",
            removingHint ? "border-wild/60 scale-90 opacity-70" : "border-veil-400/40",
          )}
          style={{ left: drag.x, top: drag.y }}
        >
          <ghost.icon className={cx("h-5 w-5", removingHint ? "text-wild" : "text-veil-200")} />
        </div>
      )}
    </div>
  );
}
