import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FLAGS } from "@/lib/flags";
import { cx } from "@/lib/utils";
import { PACK_STAGES, stageByPath, type PackStageId } from "./stages";

function stageHref(path: string): string {
  if ((path === "/tools/packs" || path === "/tools/packs/new") && !FLAGS.storefront) {
    return "/make";
  }
  return path;
}

export function PackPipelineBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = stageByPath(pathname);
  if (!current) return null;

  const idx = current.id;
  const prev = idx > 0 ? PACK_STAGES[idx - 1] : null;
  const next = idx < 8 ? PACK_STAGES[idx + 1] : null;

  return (
    <div
      className="shrink-0 border-b border-white/10 bg-black/30 px-3 py-2 backdrop-blur-md sm:px-4"
      data-testid="pack-pipeline-bar"
      data-stage={current.id}
    >
      <ol className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PACK_STAGES.map((stage) => {
          const active = stage.id === current.id;
          const done = stage.id < current.id;
          return (
            <li key={stage.id} className="shrink-0">
              <Link
                to={stageHref(stage.path)}
                data-testid={`pack-stage-${stage.id}`}
                aria-current={active ? "step" : undefined}
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition",
                  active && "bg-[rgb(var(--app-accent-rgb)/0.2)] text-white ring-1 ring-[rgb(var(--app-accent-rgb)/0.45)]",
                  done && !active && "text-white/70 hover:bg-white/[0.06]",
                  !done && !active && "text-white/35 hover:bg-white/[0.04] hover:text-white/55",
                )}
              >
                <span
                  className={cx(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[9px] tabular-nums",
                    active && "bg-[rgb(var(--app-accent-rgb))] text-black",
                    done && !active && "bg-white/20 text-white",
                    !done && !active && "bg-white/10 text-white/50",
                  )}
                >
                  {stage.id}
                </span>
                <span className="hidden sm:inline">{stage.short}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] text-white/40">{current.detail}</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            disabled={!prev}
            data-testid="pack-stage-back"
            onClick={() => prev && navigate(stageHref(prev.path))}
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] text-white/60 hover:bg-white/[0.06] disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <button
            type="button"
            disabled={!next}
            data-testid="pack-stage-continue"
            onClick={() => next && navigate(stageHref(next.path))}
            className="inline-flex items-center gap-0.5 rounded-full bg-[rgb(var(--app-accent-rgb)/0.18)] px-2 py-1 text-[11px] text-white hover:bg-[rgb(var(--app-accent-rgb)/0.28)] disabled:opacity-30"
          >
            Continue <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function packStageIdFromPath(pathname: string): PackStageId | null {
  return stageByPath(pathname)?.id ?? null;
}
