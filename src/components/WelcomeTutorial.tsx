import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Headphones, Radio, UserRound, ArrowRight, Check } from "lucide-react";
import { useSession } from "@/store/session";
import { needsIntentMixIntake } from "@/lib/intentMix";
import { cx } from "@/lib/utils";

const STEPS = [
  { icon: Headphones, title: "Listen", body: "Upload · queue · VDock — your soundtrack is always on." },
  { icon: Radio, title: "Live", body: "Go live on your profile. Tip with Vc. Chat in realtime." },
  { icon: UserRound, title: "You", body: "Artist page · Connect when you want · messaging free forever." },
];

/** Shown once after onboarding — music-hub steps. */
export function WelcomeTutorial() {
  const { profile } = useSession();
  const ready = !!profile?.username && !needsIntentMixIntake(profile?.profile);
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem("vybz.tutorial.v5") === "1"
        || localStorage.getItem("vybz.tutorial.v4") === "1"
        || localStorage.getItem("vybz.tutorial.v3") === "1"
        || localStorage.getItem("vybz.tutorial.v2") === "1"
        || localStorage.getItem("vybz.tutorial.v1") === "1";
    } catch { return true; }
  });
  const [step, setStep] = useState(0);
  if (seen || !ready) return null;

  const done = () => {
    try {
      localStorage.setItem("vybz.tutorial.v5", "1");
      localStorage.setItem("vybz.tutorial.v4", "1");
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
          className="forge-glass-edge relative z-10 w-full max-w-sm rounded-t-3xl p-7 text-center sm:rounded-3xl">
          <span className="forge-card-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center text-[rgb(var(--neon-cyan))]"><S.icon className="h-7 w-7" /></span>
          <h2 className="nexus-headline text-xl">{S.title}</h2>
          <p className="nexus-subline mt-2 text-[15px]">{S.body}</p>
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => <span key={i} className={cx("h-1.5 rounded-full transition-all", i === step ? "w-5 bg-[rgb(var(--neon-cyan))]" : "w-1.5 bg-white/20")} />)}
          </div>
          <button type="button" onClick={() => (last ? done() : setStep(step + 1))} className="forge-cta mt-5 w-full py-3.5 text-[15px]">
            {last ? <>Enter <Check className="h-4 w-4" /></> : <>Next <ArrowRight className="h-4 w-4" /></>}
          </button>
          {!last && <button type="button" onClick={done} className="mt-3 w-full text-center text-[13px] text-white/45 hover:text-white/70">Skip</button>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
