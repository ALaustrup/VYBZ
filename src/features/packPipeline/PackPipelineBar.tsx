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

  const prev = stage.id > 0 ? PACK_STAGES[stage.id - 1] : null;
  const next = stage.id < 8 ? PACK_STAGES[stage.id + 1] : null;
  const positionPct = (stage.id / 8) * 100;

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
      className="pack-pipeline-bar shrink-0 border-b border-white/[0.08] px-4 py-3 sm:px-6"
      data-testid="pack-pipeline-bar"
      data-stage={stage.id}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            Pack session · {stage.id} / 8
          </p>
          <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
            {stage.label}
          </h2>
          <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-white/45">{stage.detail}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            disabled={!prev || busy}
            data-testid="pack-stage-back"
            onClick={() => prev && go(prev.path)}
            className="inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-[12px] text-white/65 ring-1 ring-white/10 hover:bg-white/[0.05] disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <button
            type="button"
            disabled={!next || busy}
            data-testid="pack-stage-skip"
            onClick={onSkip}
            className="inline-flex h-9 items-center rounded-full px-3.5 text-[12px] text-white/45 ring-1 ring-white/10 hover:bg-white/[0.05] hover:text-white/70 disabled:opacity-30"
          >
            Skip
          </button>
          <button
            type="button"
            disabled={!next || busy}
            data-testid="pack-stage-continue"
            onClick={() => void onContinue()}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-[rgb(var(--app-accent-rgb))] px-4 text-[12px] font-semibold text-black hover:brightness-110 disabled:opacity-30"
          >
            {busy ? "Saving…" : "Continue"} <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mt-3.5">
        <div className="absolute left-3 right-3 top-[13px] h-px bg-white/[0.08]" aria-hidden />
        <div
          className="absolute left-3 top-[13px] h-px bg-[rgb(var(--app-accent-rgb)/0.55)]"
          style={{ width: `calc(${positionPct}% - 0.75rem)` }}
          aria-hidden
        />
        <ol className="relative flex justify-between">
          {PACK_STAGES.map((step) => {
            const active = step.id === stage.id;
            const done = isStageComplete(step.id, snap);
            const skipped = isStageSkipped(step.id, snap);
            return (
              <li key={step.id} className="flex flex-col items-center">
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
                  className="group flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cx(
                      "flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10px] font-semibold tabular-nums ring-2 ring-[#05070c] transition",
                      active && "bg-[rgb(var(--app-accent-rgb))] text-black shadow-[0_0_16px_rgb(var(--app-accent-rgb)/0.45)]",
                      !active && done && "bg-emerald-400 text-black",
                      !active && skipped && "border border-dashed border-white/40 bg-[#070a10] text-white/50",
                      !active && !done && !skipped && "bg-white/10 text-white/45 group-hover:bg-white/16",
                    )}
                  >
                    {done && !active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    {skipped && !active ? <Minus className="h-3 w-3" /> : null}
                    {active || (!done && !skipped) ? step.id : null}
                  </span>
                  <span
                    className={cx(
                      "hidden text-[10px] font-medium tracking-wide lg:block",
                      active ? "text-white/80" : "text-white/30 group-hover:text-white/50",
                    )}
                  >
                    {step.short}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
