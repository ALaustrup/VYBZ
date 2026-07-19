import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Clapperboard,
  Gamepad2,
  Loader2,
  Music2,
  Palette,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { PROFESSIONS, PROFESSION_LABEL } from "@/lib/profileFields";
import { cx } from "@/lib/utils";

const PROFESSION_ICON: Record<string, typeof Music2> = {
  Music2, Palette, Clapperboard, Gamepad2,
};

/**
 * Lightweight post-signup setup — username already collected.
 * Optional craft + optional photo, then invite them to share work on the Feed.
 * Full matchmaking facets live on Profile edit later.
 */
export function RoleIntentOnboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"craft" | "share">("craft");
  const [profession, setProfession] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);

  async function pickAvatar(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const url = await api.uploadAvatar(file, ext);
      if (url) {
        setAvatarUrl(url);
        await api.updateMyProfile({ avatarUrl: url });
        await refreshProfile();
      }
    } finally {
      setBusy(false);
    }
  }

  async function finish(openCompose: boolean) {
    setBusy(true);
    try {
      const label = profession
        ? (PROFESSION_LABEL[profession] ?? "Creator")
        : "Creator";
      await api.applyRoleIntentOnboarding(
        null,
        label,
        profession ? ["Showcase work"] : ["Just exploring"],
        [],
        profession,
        [],
        "creator",
      );
      void api.refreshEmbedding();
      await refreshProfile();
      onComplete();
      navigate(openCompose ? "/?compose=1" : "/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md p-7"
      >
        {step === "craft" && (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">
              Almost in
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-gradient">
              What do you make?
            </h1>
            <p className="mb-5 mt-2 text-[15px] leading-relaxed text-white/55">
              Optional — helps the Feed and Find feel relevant. You can skip and fill this in anytime.
            </p>

            <div className="grid gap-2">
              {PROFESSIONS.map((p) => {
                const Icon = PROFESSION_ICON[p.icon] ?? Sparkles;
                const on = profession === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfession(on ? null : p.id)}
                    className={cx(
                      "flex items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
                      on
                        ? "border-veil-400/70 bg-veil-500/20"
                        : "border-white/10 bg-white/[0.04] hover:border-veil-400/40",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900/60">
                      <Icon className={cx("h-5 w-5", on ? "text-veil-100" : "text-white/70")} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-sm font-bold text-white">{p.label}</span>
                      <span className="block text-[12px] leading-tight text-white/45">{p.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void pickAvatar(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                aria-label="Add photo"
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/[0.04] transition hover:border-veil-400/50"
              >
                {avatarUrl ? (
                  <Avatar url={avatarUrl} name={profile?.username} id={profile?.id} size="md" className="!h-14 !w-14" />
                ) : (
                  <Camera className="h-5 w-5 text-white/45" />
                )}
              </button>
              <p className="text-[13px] text-white/45">Photo optional</p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => setStep("share")}
              className="btn btn-primary mt-5 w-full py-3.5 text-[15px]"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish(false)}
              className="mt-3 w-full text-center text-[13px] text-white/45 hover:text-white/70"
            >
              Skip for now
            </button>
          </>
        )}

        {step === "share" && (
          <>
            <button
              type="button"
              onClick={() => setStep("craft")}
              className="mb-2 text-[12px] text-white/45 hover:text-white/70"
            >
              ← Back
            </button>
            <h1 className="font-display text-2xl font-bold text-gradient">
              Share something
            </h1>
            <p className="mb-6 mt-2 text-[15px] leading-relaxed text-white/55">
              VYBZ works best when you put work out — a loop, a sketch, a clip, a draft. Drop it on the Feed and creators who fit can find you.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish(true)}
              className="btn btn-primary w-full py-3.5 text-[15px]"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Share a drop <ArrowRight className="h-4 w-4" /></>}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish(false)}
              className="mt-3 w-full text-center text-[13px] text-white/45 hover:text-white/70"
            >
              Enter the Feed
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
