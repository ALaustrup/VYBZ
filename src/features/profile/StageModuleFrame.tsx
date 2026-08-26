import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical } from "lucide-react";
import { cx } from "@/lib/utils";
import {
  STAGE_MODULE_LABEL,
  STAGE_MODULE_SPAN,
  type StageModuleId,
} from "./stageLayout";

const DRAG_TYPE = "text/plain";
const DRAG_PREFIX = "vybz-stage-module:";

export function StageModuleFrame({
  id,
  arranging,
  empty,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDropOn,
  hidden = false,
  hideDisabled = false,
  onToggleHidden,
  children,
}: {
  id: StageModuleId;
  arranging: boolean;
  empty?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDropOn: (fromId: string) => void;
  hidden?: boolean;
  hideDisabled?: boolean;
  onToggleHidden?: () => void;
  children: ReactNode;
}) {
  const label = STAGE_MODULE_LABEL[id];
  const span = STAGE_MODULE_SPAN[id];

  return (
    <section
      data-testid={`stage-module-${id}`}
      data-stage-module={id}
      onDragOver={
        arranging
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          : undefined
      }
      onDrop={
        arranging
          ? (e) => {
              e.preventDefault();
              const raw = e.dataTransfer.getData(DRAG_TYPE);
              if (!raw.startsWith(DRAG_PREFIX)) return;
              onDropOn(raw.slice(DRAG_PREFIX.length));
            }
          : undefined
      }
      className={cx(
        span === "wide" ? "lg:col-span-7" : "lg:col-span-5",
        arranging && "rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3",
        arranging && empty && "opacity-60",
      )}
    >
      {arranging ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            draggable
            aria-label={`Drag ${label}`}
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_TYPE, `${DRAG_PREFIX}${id}`);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Move ${label} up`}
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-25"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Move ${label} down`}
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-25"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
          {empty ? <span className="text-[11px] text-white/30">Empty</span> : null}
          {hidden ? <span className="text-[11px] text-white/30">Hidden</span> : null}
          {onToggleHidden ? (
            <button
              type="button"
              data-testid={`stage-module-${hidden ? "show" : "hide"}-${id}`}
              aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
              disabled={hideDisabled}
              onClick={onToggleHidden}
              className="ml-auto flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-25"
            >
              {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {hidden ? "Show" : "Hide"}
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
