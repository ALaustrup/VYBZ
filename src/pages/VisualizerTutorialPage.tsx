import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Film,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Ruler,
  Sparkles,
} from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { cx } from "@/lib/utils";

const STEPS = [
  {
    id: "goal",
    title: "Your VDock visual",
    body: "A short looping clip or still that fills the music bar while your track plays. Keep it subtle so transport controls stay readable.",
    icon: Film,
  },
  {
    id: "size",
    title: "Size & format",
    body: "Match these specs so VYBZ can encode cleanly for every device.",
    icon: Ruler,
  },
  {
    id: "canva",
    title: "Build in Canva",
    body: "Use Canva’s video or custom-size design tools, then export a muted loop.",
    icon: LayoutTemplate,
  },
  {
    id: "own",
    title: "Use your own media",
    body: "Phone footage, renders, or stills work — trim and mute before upload.",
    icon: ImageIcon,
  },
  {
    id: "check",
    title: "Final checklist",
    body: "Confirm readiness, then claim your 10 Vc tutorial reward.",
    icon: Sparkles,
  },
] as const;

const SPECS = [
  { label: "Aspect", value: "Landscape 16:9 or 21:9" },
  { label: "Width", value: "1280px max (720–1280 ideal)" },
  { label: "Height", value: "Even pixels (e.g. 720 × 360 for bar crop)" },
  { label: "Length", value: "8–12 seconds, seamless loop" },
  { label: "Video", value: "MP4 (H.264) or WebM, no audio" },
  { label: "Still", value: "JPG / PNG / WebP, under 12 MB" },
  { label: "Motion", value: "Slow pulses, soft light — avoid busy text" },
  { label: "Safe zone", value: "Keep focal subject in the vertical center third" },
];

const CANVA_STEPS = [
  "Open Canva → Create a design → Custom size → 1280 × 720 px (or 1920 × 1080, then scale down).",
  "Add your clip, photo, or generative background. Keep the middle band calm — that is what shows in the dock.",
  "Animate gently (pan / breathe). Cap length at ~10 seconds and set to loop if available.",
  "Export → MP4 (or GIF → convert to MP4). Mute audio in export or strip it in any trimmer.",
  "Back in VYBZ Compose → VDock visual → Custom → upload the file.",
];

const OWN_STEPS = [
  "Shoot or export landscape footage. Prefer stable lighting and continuous motion.",
  "Or open Visualizer Studio (/visuals/studio): upload media, attach music, tune audio-reactive FX live.",
  "Trim to 8–12s. Loop end-to-start so the cut is invisible (match first/last frame hues).",
  "Mute the track — VDock already plays your song. Studio export is muted automatically.",
  "Upload under Custom in the visual carousel when releasing a drop.",
];

const CHECKLIST = [
  "Landscape, ≤1280px wide",
  "8–12s loop or high-quality still",
  "Muted / no competing audio",
  "Center third readable under glass + controls",
  "MP4/WebM or JPG/PNG/WebP",
];

/**
 * Guided tutorial: craft a custom VDock visualizer (Canva or own media) → +10 Vc once.
 */
export function VisualizerTutorialPage() {
  const navigate = useNavigate();
  const { celebrate, showToast, refreshProfile, userId } = useSession();
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(() => {
    try {
      return localStorage.getItem("vybz.visualizerTutorial.v1") === "1";
    } catch {
      return false;
    }
  });

  useRegisterAppBar({
    title: "Visualizer tutorial",
  }, []);

  const S = STEPS[step];
  const last = step === STEPS.length - 1;
  const allChecked = useMemo(
    () => CHECKLIST.every((_, i) => checks[i]),
    [checks],
  );

  async function finish() {
    if (!userId) {
      showToast("Sign in to claim 10 Vc");
      return;
    }
    if (!allChecked) {
      showToast("Tick every checklist item first");
      return;
    }
    if (claimed) {
      showToast("Tutorial reward already claimed");
      navigate(-1);
      return;
    }
    setClaiming(true);
    try {
      const amt = await api.awardSocialVc("visualizer_tutorial", "tutorial", "vdock-visual");
      try {
        localStorage.setItem("vybz.visualizerTutorial.v1", "1");
      } catch { /* ignore */ }
      setClaimed(true);
      await refreshProfile();
      if (amt > 0) celebrate(`+${amt} Vc · visualizer tutorial`);
      else celebrate("Visualizer tutorial complete");
      showToast(amt > 0 ? `Earned ${amt} Vc` : "Already rewarded — you're set");
      navigate("/");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-10 pt-2">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/80"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Step {step + 1} / {STEPS.length}
          </p>
          <h1 className="font-display text-xl font-bold text-white">{S.title}</h1>
        </div>
      </div>

      <div className="mb-4 flex gap-1">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={cx(
              "h-1 flex-1 rounded-full transition",
              i <= step ? "bg-cyan-400" : "bg-white/12",
            )}
          />
        ))}
      </div>

      <section className="glass-panel p-5" data-dark-stage>
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--neon-cyan)/0.16)] text-[rgb(var(--neon-cyan))]">
          <S.icon className="h-6 w-6" />
        </span>
        <p className="text-[15px] leading-relaxed text-white/70">{S.body}</p>

        {S.id === "size" && (
          <ul className="mt-4 space-y-2">
            {SPECS.map((row) => (
              <li
                key={row.label}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{row.label}</span>
                <span className="text-right text-[13px] font-medium text-white/85">{row.value}</span>
              </li>
            ))}
          </ul>
        )}

        {S.id === "canva" && (
          <div className="mt-4 space-y-3">
            <ol className="space-y-2.5">
              {CANVA_STEPS.map((line, i) => (
                <li key={line} className="flex gap-2.5 text-[13px] leading-relaxed text-white/70">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] font-bold text-cyan-100">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
            <a
              href="https://www.canva.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-white/85 transition hover:border-cyan-300/40 hover:text-white"
            >
              Open Canva <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {S.id === "own" && (
          <ol className="mt-4 space-y-2.5">
            {OWN_STEPS.map((line, i) => (
              <li key={line} className="flex gap-2.5 text-[13px] leading-relaxed text-white/70">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--neon-mint)/0.18)] text-[11px] font-bold text-[rgb(var(--neon-mint))]">
                  {i + 1}
                </span>
                {line}
              </li>
            ))}
          </ol>
        )}

        {S.id === "check" && (
          <div className="mt-4 space-y-2">
            {CHECKLIST.map((line, i) => {
              const on = !!checks[i];
              return (
                <button
                  key={line}
                  type="button"
                  onClick={() => setChecks((c) => ({ ...c, [i]: !c[i] }))}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-[13px] transition",
                    on
                      ? "border-cyan-300/40 bg-cyan-500/12 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20",
                  )}
                >
                  <span
                    className={cx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      on ? "border-cyan-300 bg-cyan-400 text-ink-950" : "border-white/25",
                    )}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {line}
                </button>
              );
            })}
            <p className="pt-2 text-[12px] text-white/45">
              Complete once to earn <span className="font-semibold text-cyan-200">10 Vc</span>. Already claimed rewards stay on your wallet.
            </p>
          </div>
        )}
      </section>

      <div className="mt-5 flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="btn btn-ghost flex-1 py-3">
            Back
          </button>
        )}
        {!last ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className="btn btn-primary flex-[1.4] py-3">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={claiming || !allChecked}
            onClick={() => void finish()}
            className="btn btn-primary flex-[1.4] py-3 disabled:opacity-40"
          >
            {claiming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : claimed ? (
              <>Done <Check className="h-4 w-4" /></>
            ) : (
              <>Claim 10 Vc <Sparkles className="h-4 w-4" /></>
            )}
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-[12px] text-white/35">
        Prefer a ready-made look?{" "}
        <Link to="/" className="text-cyan-200/80 hover:underline">
          Use Vizualz in Compose
        </Link>
        {" · "}
        <Link to="/visuals/studio" className="text-cyan-200/80 hover:underline">
          Open Visualizer Studio
        </Link>
      </p>
    </div>
  );
}
