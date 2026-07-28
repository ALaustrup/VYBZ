import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Headphones, Radio, Sparkles, Shield } from "lucide-react";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

const SECTIONS = [
  {
    icon: Headphones,
    title: "Listen",
    body: "Upload your catalog. Stream on VDock. Discover by taste — not hollow feeds.",
  },
  {
    icon: Sparkles,
    title: "Tip",
    body: "Fans tip artists with Vc (~username). Cosmetics light up your identity. No ads.",
  },
  {
    icon: Radio,
    title: "Live",
    body: "Go live on your profile. Chat, presence, and tips on the same durable identity.",
  },
  {
    icon: Shield,
    title: "Identity",
    body: "Real accounts. Passkeys. Messaging free forever. Connection Lab only if you opt in.",
  },
] as const;

/**
 * Official launch marketing surface — signed-out default.
 * Hero: brand + one line + CTAs. Below: product story + waitlist.
 */
export function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden text-white">
      {/* Full-bleed stage atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 40%, rgba(236,72,153,0.14), transparent 50%), radial-gradient(ellipse 60% 45% at 10% 70%, rgba(251,191,36,0.1), transparent 45%), #05060a",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
          mixBlendMode: "overlay",
        }}
      />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="font-display text-xs font-semibold tracking-[0.2em] text-white/45">VYBZ</span>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/legal/terms" className="text-white/40 hover:text-white/70">Terms</Link>
          <Link to="/enter" className="rounded-full border border-white/20 px-3 py-1.5 font-medium text-white/80 hover:border-cyan-400/40 hover:text-white">
            Enter VYBZ
          </Link>
        </div>
      </header>

      {/* Hero — one composition */}
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-3xl flex-col items-center justify-center px-5 pb-16 pt-6 text-center">
        <LandingLogo />
        <motion.h1
          className="mt-8 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Find Yours.
        </motion.h1>
        <motion.p
          className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60 sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          The next-level home for indie artists — listen, tip, and go live under one real identity.
        </motion.p>
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
        >
          <a
            href="#waitlist"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 px-7 font-display text-sm font-bold text-ink-950 hover:brightness-110"
          >
            Join alpha waitlist
          </a>
          <Link
            to="/enter"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 font-display text-sm font-semibold text-white backdrop-blur-sm hover:border-cyan-400/40"
          >
            Enter VYBZ
          </Link>
        </motion.div>
      </section>

      {/* Product breakdown */}
      <section className="mx-auto w-full max-w-3xl px-5 pb-20">
        <h2 className="font-display text-center text-2xl font-bold text-white sm:text-3xl">
          What we&apos;re building
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-white/50">
          Tip + live + catalog — a profitable wedge for indie artists and the fans who back them.
        </p>
        <ul className="mt-10 space-y-10">
          {SECTIONS.map((s, i) => (
            <motion.li
              key={s.title}
              className="flex gap-4"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/15 text-cyan-300 ring-1 ring-white/10">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Waitlist */}
      <section className="mx-auto w-full max-w-3xl border-t border-white/10 px-5 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-white">Be first in</h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/50">
          Leave your email. When VYBZ launches officially, you&apos;ll hear from us — not a faceless blast list.
        </p>
        <div className="mt-8">
          <WaitlistForm id="waitlist" />
        </div>
        <p className="mt-6 text-center text-[11px] text-white/35">
          By joining you agree to our{" "}
          <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-white/55">Privacy</Link>
          {" "}&{" "}
          <Link to="/legal/terms" className="underline underline-offset-2 hover:text-white/55">Terms</Link>.
        </p>
      </section>

      <footer className="pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-[11px] text-white/30">
        © {new Date().getFullYear()} Astra Matrix, Inc. · vybz.cloud
      </footer>
    </div>
  );
}
