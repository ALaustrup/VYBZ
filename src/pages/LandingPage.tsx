import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AudioWaveform, ScanSearch, Sparkles } from "lucide-react";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { BuildStamp } from "@/components/BuildStamp";
import { staggerContainer, staggerItem } from "@/lib/motion";

const STEPS = [
  {
    icon: ScanSearch,
    title: "Drop your master",
    body: "Track + cover. Measured on your device — free, no account required.",
  },
  {
    icon: AudioWaveform,
    title: "See what's real",
    body: "Loudness, peaks, artwork size — only facts from your files, never guesswork.",
  },
  {
    icon: Sparkles,
    title: "Fix and release",
    body: "Clear score, actionable fixes, and a path from mix to master to publish.",
  },
] as const;

/**
 * Signed-out acquisition — artist-first, progressive disclosure (Masterplan §13).
 */
export function LandingPage() {
  return (
    <div className="public-scroll-frame nexus-void relative text-white">
      <GeometricBackdrop intensity="hero" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="nexus-eyebrow">VYBZ</span>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/codex" className="text-white/40 transition hover:text-white/70">
            Codex
          </Link>
          <Link to="/enter" className="forge-cta-ghost min-h-[2.25rem] px-4 py-1.5 text-xs">
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-5 pb-12 pt-10 text-center sm:pb-16 sm:pt-14">
        <LandingLogo />
        <motion.h1
          className="nexus-headline mt-8 max-w-xl text-4xl sm:text-5xl"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Your music deserves the truth before it goes out.
        </motion.h1>
        <motion.p
          className="nexus-subline mx-auto mt-4 max-w-md text-[15px] sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          Upload a track. Get a real readiness score. Fix what matters. Release with confidence.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
        >
          <Link to="/releases/new" className="forge-cta" data-testid="landing-readiness-cta">
            Scan my track — free
          </Link>
          <Link to="/enter" className="forge-cta-ghost">
            Sign in
          </Link>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-20">
        <motion.ul
          className="grid gap-3 sm:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {STEPS.map((item) => (
            <motion.li key={item.title} variants={staggerItem} className="forge-card text-left">
              <span className="forge-card-icon mb-3 inline-flex">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="font-display text-[15px] font-semibold text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/48">{item.body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      <section className="relative z-10 border-t border-white/[0.06] px-5 py-14">
        <div className="mx-auto max-w-md text-center">
          <h2 className="nexus-headline text-xl">Ready when you are.</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/releases/new" className="forge-cta">
              Start free scan
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 text-center text-[11px] text-white/35">
        <Link to="/legal/privacy" className="hover:text-white/55">
          Privacy
        </Link>
        <span className="px-2">·</span>
        <Link to="/legal/terms" className="hover:text-white/55">
          Terms
        </Link>
        <span className="px-2">·</span>
        © {new Date().getFullYear()} Astra Matrix, Inc.
        <BuildStamp className="mt-2" />
      </footer>
    </div>
  );
}
