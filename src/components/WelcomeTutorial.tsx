import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, AudioLines, Check, CircleDot, Sparkles } from "lucide-react";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

const STEPS = [
  {
    icon: AudioLines,
    title: "Your Feed",
    body: "Home is a stream of music drops. Play anything — the orb and borders react to the sound.",
  },
  {
    icon: CircleDot,
    title: "The Orb",
    body: "Tap the sphere in the center of the taskbar for New drop, Go live, Spark, and Messages. Pin your favorite pages on the left and right.",
  },
  {
    icon: Sparkles,
    title: "Share your work",
    body: "Drop a loop or stem from the Orb. Choose public, network, or private — and pick an outline effect that plays with your track.",
  },
];

/** Shown once after onboarding — three tips for the orb taskbar era. */
export function WelcomeTutorial() {
  const { profile } = useSession();
  const hasRole = !!(profile?.profile?.role || profile?.profile?.roleLabel);
  const [seen, setSeen] = useState(() => {
    try { return localStorage.getItem("vybz.tutorial.v2") === "1" || localStorage.getItem("vybz.tutorial.v1") === "1"; } catch { return true; }
  });
  const [step, setStep] = useState(0);
  if (seen || !profile?.username || !hasRole) return null;

  const done = () => {
    try {
      localStorage.setItem("vybz.tutorial.v2", "1");
      localStorage.setItem("vybz.tutorial.v1", "1");
    } catch { /* ignore */ }
    setSeen(true);
  };
  const S = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
        <motion.div key={step} initial={{ y: 20, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="glass-panel relative z-10 w-full max-w-sm rounded-t-3xl p-7 text-center sm:rounded-3xl">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-veil-500/20 text-veil-100"><S.icon className="h-7 w-7" /></span>
          <h2 className="font-display text-xl font-bold text-white">{S.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-white/65">{S.body}</p>
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => <span key={i} className={cx("h-1.5 rounded-full transition-all", i === step ? "w-5 bg-veil-400" : "w-1.5 bg-white/20")} />)}
          </div>
          <button type="button" onClick={() => (last ? done() : setStep(step + 1))} className="btn btn-primary mt-5 w-full py-3.5 text-[15px]">
            {last ? <>Start creating <Check className="h-4 w-4" /></> : <>Next <ArrowRight className="h-4 w-4" /></>}
          </button>
          {!last && <button type="button" onClick={done} className="mt-3 w-full text-center text-[13px] text-white/45 hover:text-white/70">Skip</button>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
