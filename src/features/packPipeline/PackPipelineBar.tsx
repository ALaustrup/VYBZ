import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { FLAGS } from "@/lib/flags";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import { handoffPackMakerToStorefront } from "@/features/packs/packMakerSession";
import {
  isStageComplete,
  isStageSkipped,
  markStageComplete,
  markStageSkipped,
  usePackPipeline,
} from "./packPipelineStore";
import { PACK_STAGES, stageByPath } from "./stages";

function stageHref(path: string): string {
  if ((path === "/tools/packs" || path === "/tools/packs/new") && !FLAGS.storefront) {
    return "/make";
  }
  return path;
}

export function PackPipelineBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useSession();
  const snap = usePackPipeline();
  const current = stageByPath(pathname);
  const [busy, setBusy] = useState(false);
  if (!current) return null;
  const stage = current;

  const idx = stage.id;
  const prev = idx > 0 ? PACK_STAGES[idx - 1] : null;
  const next = idx < 8 ? PACK_STAGES[idx + 1] : null;

  function go(path: string) {
    navigate(stageHref(path));
  }

  async function onContinue() {
    if (!next) return;
    if (stage.id === 5) {
      setBusy(true);
      const result = await handoffPackMakerToStorefront();
      setBusy(false);
      if (result === "empty") {
        showToast("No pack built yet — Skip to publish with a ZIP you already have, or stay and assemble.");
        return;
      }
      if (result === "failed") {
        showToast("Couldn't build the ZIP. Stay here or Skip and upload one on the next step.");
        return;
      }
    }
    markStageComplete(stage.id);
    go(next.path);
  }

  function onSkip() {
    if (!next) return;
    markStageSkipped(stage.id);
    go(next.path);
  }

  return (
    <div
      className="shrink-0 border-b border-white/10 bg-black/40 px-3 py-2.5 backdrop-blur-md sm:px-5"
      data-testid="pack-pipeline-bar"
      data-stage={stage.id}
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Stage {stage.id} of 8
          <span className="ml-2 tracking-normal text-white/70">{stage.label}</span>
        </p>
        <p className="hidden min-w-0 truncate text-[11px] text-white/40 md:block">{stage.detail}</p>
      </div>

      <ol className="flex items-center gap-0 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PACK_STAGES.map((step, i) => {
          const active = step.id === stage.id;
          const done = isStageComplete(step.id, snap);
          const skipped = isStageSkipped(step.id, snap);
          return (
            <li key={step.id} className="flex min-w-0 items-center">
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cx(
                    "mx-0.5 h-px w-3 shrink-0 sm:w-5",
                    done || skipped || active ? "bg-white/25" : "bg-white/10",
                  )}
                />
              ) : null}
              <Link
                to={stageHref(step.path)}
                data-testid={`pack-stage-${step.id}`}
                aria-current={active ? "step" : undefined}
                title={
                  skipped
                    ? `${step.label} — skipped (not complete)`
                    : done
                      ? `${step.label} — done`
                      : step.label
                }
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition sm:px-2.5",
                  active && "bg-[rgb(var(--app-accent-rgb)/0.22)] text-white ring-1 ring-[rgb(var(--app-accent-rgb)/0.5)]",
                  !active && done && "text-white/75 hover:bg-white/[0.06]",
                  !active && skipped && "text-white/45 hover:bg-white/[0.05]",
                  !active && !done && !skipped && "text-white/30 hover:bg-white/[0.04] hover:text-white/55",
                )}
              >
                <span
                  className={cx(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] tabular-nums",
                    active && "bg-[rgb(var(--app-accent-rgb))] text-black",
                    !active && done && "bg-emerald-400/80 text-black",
                    !active && skipped && "border border-dashed border-white/35 bg-transparent text-white/45",
                    !active && !done && !skipped && "bg-white/10 text-white/50",
                  )}
                >
                  {done && !active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  {skipped && !active ? <Minus className="h-3 w-3" /> : null}
                  {active || (!done && !skipped) ? step.id : null}
                </span>
                <span className="hidden sm:inline">{step.short}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-1.5 text-[11px] text-white/40 md:hidden">{stage.detail}</p>

      <div className="mt-2 flex justify-end gap-1.5">
        <button
          type="button"
          disabled={!prev || busy}
          data-testid="pack-stage-back"
          onClick={() => prev && go(prev.path)}
          className="inline-flex items-center gap-0.5 rounded-full px-3 py-1.5 text-[12px] text-white/65 hover:bg-white/[0.06] disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="button"
          disabled={!next || busy}
          data-testid="pack-stage-skip"
          onClick={onSkip}
          className="inline-flex items-center gap-0.5 rounded-full px-3 py-1.5 text-[12px] text-white/50 ring-1 ring-white/10 hover:bg-white/[0.05] hover:text-white/70 disabled:opacity-30"
        >
          Skip
        </button>
        <button
          type="button"
          disabled={!next || busy}
          data-testid="pack-stage-continue"
          onClick={() => void onContinue()}
          className="inline-flex items-center gap-0.5 rounded-full bg-[rgb(var(--app-accent-rgb))] px-3 py-1.5 text-[12px] font-semibold text-black hover:brightness-110 disabled:opacity-30"
        >
          {busy ? "Saving…" : "Continue"} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
