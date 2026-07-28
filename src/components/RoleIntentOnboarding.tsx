import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import {
  INTENT_PILLARS,
  mixFromPillars,
  lookingForFromPillars,
  type IntentPillar,
  sealIntentMixPrivacy,
} from "@/lib/intentMix";
import { cx } from "@/lib/utils";

/**
 * Phase 6 — soft Intent Mix intake (multi-select, skip OK).
 * Replaces craft-first RoleIntentOnboarding as the post-username gate.
 * One identity; pillars only seed curation — never a mode wall.
 */
export function RoleIntentOnboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const { profile, refreshProfile, showToast } = useSession();
  const [selected, setSelected] = useState<IntentPillar[]>([]);
  const [busy, setBusy] = useState(false);

  function toggle(id: IntentPillar) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function finish(pillars: IntentPillar[]) {
    setBusy(true);
    try {
      const mix = mixFromPillars(pillars);
      const lookingFor = lookingForFromPillars(pillars);
      const createOn = pillars.includes("create");
      const label = createOn ? "Creator" : "Member";
      await api.applyRoleIntentOnboarding(
        null,
        label,
        createOn ? ["Showcase work"] : ["Meet people"],
        [],
        createOn ? "music" : null,
        [],
        createOn ? "creator" : "supporter",
      );
      await api.updateMyProfile({
        profile: sealIntentMixPrivacy({
          ...(profile?.profile ?? {}),
          intentMix: mix,
          lookingFor: lookingFor.length ? lookingFor : profile?.profile?.lookingFor,
          roleLabel: label,
          roleClass: createOn ? "creator" : "supporter",
          profession: createOn ? (profile?.profile?.profession ?? "music") : profile?.profile?.profession,
        }),
      });
      void api.recordSocialScoreEvent("intent_mix", { pillars }).catch(() => undefined);
      void api.awardSocialVc("intent_mix", "onboarding", "once").catch(() => undefined);
      await refreshProfile();
      onComplete();
      navigate("/");
    } catch (e) {
      showToast((e as Error).message || "Couldn't save preferences.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10" data-dark-stage>
      <div className="w-full max-w-md">
        <p className="eyebrow mb-2">Your hub</p>
        <h1 className="font-display text-2xl font-bold text-gradient">What brings you?</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Music first. Pick any · or skip. Romance stays optional in Connection Lab.
        </p>

        <div className="mt-6 space-y-2">
          {INTENT_PILLARS.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cx(
                  "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
                  on
                    ? "border-veil-400/70 bg-veil-500/20"
                    : "border-white/10 bg-white/[0.04] hover:border-veil-400/40",
                )}
              >
                <span
                  className={cx(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold",
                    on ? "border-feel bg-feel/20 text-feel" : "border-white/25 text-transparent",
                  )}
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold text-white">{p.label}</span>
                  <span className="block text-[12px] text-white/45">{p.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void finish(selected)}
          className="btn btn-primary mt-6 w-full py-3.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void finish([])}
          className="mt-3 w-full text-center text-[13px] text-white/45 hover:text-white/70 disabled:opacity-50"
        >
          Skip for now — explore
        </button>
      </div>
    </div>
  );
}
