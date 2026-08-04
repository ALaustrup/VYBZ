import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AudioWaveform,
  BadgeCheck,
  Layers,
  ScanSearch,
  Share2,
} from "lucide-react";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { buildLabel } from "@/lib/buildInfo";

const WORKFLOW = [
  {
    icon: ScanSearch,
    title: "Readiness scan",
    body: "Upload a track and get a free, honest release-readiness report — loudness, peaks, format, artwork, and metadata gaps.",
  },
  {
    icon: AudioWaveform,
    title: "Measured analysis",
    body: "Signal-derived facts only. Every value shows its source: measured, imported, user-entered, AI-suggested, or unavailable.",
  },
  {
    icon: Layers,
    title: "Prepare & package",
    body: "Credits, artwork checks, distribution readiness, and export paths built for independent artists and producers.",
  },
  {
    icon: Share2,
    title: "Release-centered social",
    body: "Share finished work and connect around releases — not empty feeds or generic social noise.",
  },
  {
    icon: Activity,
    title: "Master & validate",
    body: "Translation lab, mastering tools, and validation gates before you publish or distribute.",
  },
  {
    icon: BadgeCheck,
    title: "Distribution ready",
    body: "VYBZ prepares you for release. Distribution integrations arrive when they meet the same truth standard.",
  },
] as const;

/**
 * Signed-out acquisition surface — release preparation first, premium matte futurist.
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
        <motion.p
          className="nexus-eyebrow mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
        >
          Premium release preparation
        </motion.p>
        <motion.h1
          className="nexus-headline mt-3 max-w-xl text-4xl sm:text-5xl"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          Know your release is ready before the world hears it.
        </motion.h1>
        <motion.p
          className="nexus-subline mx-auto mt-4 max-w-lg text-[15px] sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          VYBZ is a pro-audio suite for independent artists — analyze, understand, correct,
          master, validate, and publish with measured truth at every step.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link to="/releases/new" className="forge-cta" data-testid="landing-readiness-cta">
            Run free readiness scan
          </Link>
          <Link to="/enter" className="forge-cta-ghost">
            Enter VYBZ
          </Link>
        </motion.div>
        <motion.p
          className="mt-4 text-[11px] text-white/32"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.48 }}
        >
          No payment required for your first scan · Results you can trust
        </motion.p>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-24">
        <div className="mb-10 text-center">
          <p className="nexus-eyebrow">Workflow</p>
          <h2 className="nexus-headline mt-2 text-2xl sm:text-3xl">
            Import → Analyze → Release
          </h2>
          <p className="nexus-subline mx-auto mt-3 max-w-xl text-sm">
            Built around the lifecycle serious producers actually run — not placeholder menus
            or fabricated metrics.
          </p>
        </div>
        <motion.ul
          className="grid gap-3 sm:grid-cols-2"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {WORKFLOW.map((item) => (
            <motion.li key={item.title} variants={staggerItem} className="forge-card">
              <div className="flex gap-3.5">
                <span className="forge-card-icon shrink-0">
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 text-left">
                  <h3 className="font-display text-[15px] font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/48">{item.body}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      <section className="relative z-10 border-t border-white/[0.06] px-5 py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="nexus-headline text-2xl">Start with signal, not guesswork.</h2>
          <p className="nexus-subline mt-3 text-sm">
            Your first readiness scan runs free. Create an account when you are ready to save
            projects and share releases.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link to="/releases/new" className="forge-cta">
              Begin scan
            </Link>
            <Link to="/enter" className="forge-cta-ghost">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-4 text-center text-[11px] text-white/28">
        <Link to="/legal/privacy" className="hover:text-white/50">Privacy</Link>
        <span className="px-2">·</span>
        <Link to="/legal/terms" className="hover:text-white/50">Terms</Link>
        <span className="px-2">·</span>
        © {new Date().getFullYear()} Astra Matrix, Inc.
        <span className="mt-2 block font-mono text-[10px] text-white/20" data-testid="build-sha">
          {buildLabel()}
        </span>
      </footer>
    </div>
  );
}
