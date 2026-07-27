import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Plus } from "lucide-react";
import { useSession } from "@/store/session";
import { DockPlaybackProgress, NowPlayingWidget } from "@/components/GlobalPlayer";
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
import { cx } from "@/lib/utils";

type DragState = {
  item: DockItem;
  from: DockSlot | "catalog";
  x: number;
  y: number;
};

/** V-Dock — icon-only pins/widgets, permanent Home at center, hover labels. */
export function VDock({ onCompose }: { onCompose: () => void }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { unread } = useSession();
  const { track } = usePlayer();
  const saved = useVDockLayout();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<VDockLayout | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const layout = draft ?? saved;
  const hasTrack = !!track;
  const atHome = pathname === "/";

  useVDockWidgetTimers();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--dock-reserve", "5.5rem");
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

  const dragKey = drag ? `${drag.item.kind}:${drag.item.id}` : null;
  const ghostIcon = drag
    ? (drag.item.kind === "pin" ? PIN_BY_ID[drag.item.id]?.icon : WIDGET_BY_ID[drag.item.id]?.icon)
    : null;
  const Ghost = ghostIcon;
  const removingHint = !!(drag && drag.from !== "catalog" && !pointOverVDock(drag.x, drag.y));

  const rowProps = {
    pathname,
    search,
    unread,
    editing,
    draft: layout,
    onLongPressEnter,
    draggingKey: dragKey,
    onDragStart,
  };

  return (
    <div className="group/vdock pointer-events-none relative mx-auto flex w-full max-w-3xl overflow-visible px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:px-3">
      <div
        className={cx(
          "pointer-events-auto glass relative flex w-full flex-col overflow-visible",
          "rounded-[1.35rem] border border-paper-900/10",
          "shadow-[0_18px_50px_-24px_rgba(15,40,90,0.35)]",
          editing && "ring-2 ring-veil-400/40",
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

        <div className="relative grid h-[58px] w-full grid-cols-[1fr_auto_1fr] items-stretch gap-1 px-1.5 sm:h-[60px] sm:px-2">
          <div className="vdock-side relative z-10 flex min-w-0 items-center gap-0.5">
            <div className="min-w-0 flex-1">
              <VDockItemRow side="left" {...rowProps} />
            </div>
            {hasTrack && (
              <div className="relative z-10 flex shrink-0 items-center pl-0.5">
                <NowPlayingWidget dimmed={editing} />
              </div>
            )}
          </div>

          <div className="relative z-20 flex items-center justify-center px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-tip="Home"
                aria-label="Home"
                disabled={editing}
                onClick={() => navigate("/")}
                className={cx(
                  "grid h-12 w-12 place-items-center rounded-2xl transition active:scale-95",
                  atHome
                    ? "bg-[#00C2FF] text-white shadow-[0_12px_28px_-12px_rgba(0,194,255,0.75)]"
                    : "bg-paper-100 text-paper-900 ring-1 ring-paper-900/10 hover:bg-white hover:ring-[#00C2FF]/40",
                  editing && "pointer-events-none opacity-40",
                )}
                data-solid-accent={atHome ? "1" : undefined}
              >
                <Home className="h-5 w-5" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                data-tip="New drop"
                data-solid-accent="1"
                aria-label="New drop"
                disabled={editing}
                onClick={onCompose}
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-xl bg-[#FF4D2E] text-white shadow-[0_10px_22px_-12px_rgba(255,77,46,0.7)] transition active:scale-95 hover:brightness-110",
                  editing && "pointer-events-none opacity-40",
                )}
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="vdock-side relative z-10 flex min-w-0 items-center">
            <VDockItemRow side="right" {...rowProps} />
          </div>
        </div>
      </div>

      {Ghost && drag && (
        <div
          className={cx(
            "pointer-events-none fixed z-[80] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border bg-white text-paper-900 shadow-card",
            removingHint ? "border-wild/60 scale-90 opacity-70" : "border-veil-400/50",
          )}
          style={{ left: drag.x, top: drag.y }}
        >
          <Ghost className={cx("h-5 w-5", removingHint ? "text-wild" : "text-veil-500")} />
        </div>
      )}
    </div>
  );
}

/** @deprecated Use VDock */
export const Taskbar = VDock;
