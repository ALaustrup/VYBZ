import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { DisciplineOption } from "@/types";

/** What a creator is here for — drives the default feed curation. */
const INTENTS = [
  "Music collab", "Showcase art", "Connect with creators", "Get signed",
  "Make money", "Find a musician", "Hire creatives", "Find work",
  "Build a band", "Just exploring",
];

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-[15px] text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none";

/**
 * Streamlined post-signup onboarding: just the two questions that best align a
 * creator with matches & opportunities — their role (typed, fuzzily matched to
 * the closest career, confirmable or fully custom) and what they're here for.
 */
export function RoleIntentOnboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useSession();
  const [step, setStep] = useState<"role" | "confirm" | "intent">("role");
  const [roleText, setRoleText] = useState("");
  const [match, setMatch] = useState<DisciplineOption | null>(null);
  const [chosenRoleId, setChosenRoleId] = useState<string | null>(null);
  const [chosenRoleLabel, setChosenRoleLabel] = useState("");
  const [intents, setIntents] = useState<string[]>([]);
  const [customIntent, setCustomIntent] = useState("");
  const [busy, setBusy] = useState(false);

  async function findRole() {
    const q = roleText.trim();
    if (q.length < 2) return;
    setBusy(true);
    try {
      const [top] = await api.suggestDisciplines(q);
      if (top) { setMatch(top); setStep("confirm"); }
      else { await useCustomRole(q); }
    } finally { setBusy(false); }
  }

  function acceptMatch() {
    if (!match) return;
    setChosenRoleId(match.id); setChosenRoleLabel(match.label); setStep("intent");
  }

  async function useCustomRole(label: string) {
    setBusy(true);
    try {
      const res = await api.requestCustomDiscipline(label);
      if (res.status === "auto_mapped" && res.mappedRoleId) {
        setChosenRoleId(res.mappedRoleId); setChosenRoleLabel(res.mappedLabel ?? label);
      } else {
        setChosenRoleId(null); setChosenRoleLabel(label); // pending review; stored as free text
      }
      setStep("intent");
    } finally { setBusy(false); }
  }

  const toggleIntent = (i: string) =>
    setIntents((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  async function finish() {
    setBusy(true);
    try {
      const allIntents = [...intents, ...(customIntent.trim() ? [customIntent.trim()] : [])];
      if (chosenRoleId) await api.setMyRoles([{ roleId: chosenRoleId, skill: 3 }], []);
      await api.updateMyProfile({
        profile: { ...(profile?.profile ?? {}), role: chosenRoleId, roleLabel: chosenRoleLabel, intents: allIntents },
      });
      void api.refreshEmbedding();
      await refreshProfile();
      onComplete();
      navigate("/");
    } finally { setBusy(false); }
  }

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full max-w-md p-7">
        {step === "role" && (
          <>
            <h1 className="font-display text-2xl font-bold text-gradient">Choose your role</h1>
            <p className="mb-6 mt-2 text-[15px] leading-relaxed text-white/60">What do you do in the world of creative professions? Type it your way — we'll match you to the closest career.</p>
            <input autoFocus value={roleText} onChange={(e) => setRoleText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && findRole()}
              placeholder="e.g. beatmaker, illustrator, screenwriter, game designer…" className={inputCls} />
            <button onClick={findRole} disabled={busy || roleText.trim().length < 2} className="btn btn-primary mt-4 w-full py-3.5 text-[15px] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </>
        )}

        {step === "confirm" && match && (
          <>
            <h1 className="font-display text-2xl font-bold text-gradient">Is this you?</h1>
            <p className="mb-5 mt-2 text-[15px] text-white/60">Based on “{roleText.trim()}”, we think you're a…</p>
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-veil-400/30 bg-veil-500/[0.08] px-4 py-4">
              <Sparkles className="h-5 w-5 shrink-0 text-veil-200" />
              <span className="font-display text-lg font-semibold text-white">{match.label}</span>
            </div>
            <button onClick={acceptMatch} className="btn btn-primary w-full py-3.5 text-[15px]"><Check className="h-4 w-4" /> Yes, that's me</button>
            <button onClick={() => useCustomRole(roleText.trim())} disabled={busy}
              className="mt-3 w-full rounded-xl bg-white/[0.05] py-3 text-[14px] font-semibold text-white/75 hover:text-white active:scale-[0.99]">
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `No — use “${roleText.trim()}” instead`}
            </button>
            <button onClick={() => setStep("role")} className="mt-3 w-full text-center text-[13px] text-white/45 hover:text-white/70">Try a different word</button>
          </>
        )}

        {step === "intent" && (
          <>
            <h1 className="font-display text-2xl font-bold text-gradient">What are you here for?</h1>
            <p className="mb-5 mt-2 text-[15px] text-white/60">Pick what matters most — your home feed is built around it. You can change this anytime.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {INTENTS.map((i) => {
                const on = intents.includes(i);
                return (
                  <button key={i} onClick={() => toggleIntent(i)}
                    className={cx("rounded-full px-3.5 py-2 text-[13px] font-medium transition active:scale-95",
                      on ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.05] text-white/65 hover:text-white/90")}>
                    {on && <Check className="mr-1 inline h-3 w-3" />}{i}
                  </button>
                );
              })}
            </div>
            <input value={customIntent} onChange={(e) => setCustomIntent(e.target.value)}
              placeholder="Something else? Type it here" className={cx(inputCls, "py-3")} />
            <button onClick={finish} disabled={busy || (intents.length === 0 && !customIntent.trim())}
              className="btn btn-primary mt-4 w-full py-3.5 text-[15px] disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enter VYBZ <ArrowRight className="h-4 w-4" /></>}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
