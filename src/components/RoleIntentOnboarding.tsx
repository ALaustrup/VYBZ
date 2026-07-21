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
import { PRIMARY_PROFESSION, PROFESSIONS, PROFESSION_LABEL } from "@/lib/profileFields";
import { cx } from "@/lib/utils";

const PROFESSION_ICON: Record<string, typeof Music2> = {
  Music2, Palette, Clapperboard, Gamepad2,
};

/**
 * Lightweight post-signup setup — username already collected.
 * Music-first: primary craft defaults to Music; other crafts are optional.
 * Full matchmaking facets live on Profile edit later.
 */
export function RoleIntentOnboarding({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"craft" | "share">("craft");
  const [profession, setProfession] = useState<string | null>(PRIMARY_PROFESSION);
  const [showMoreCrafts, setShowMoreCrafts] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);

  const music = PROFESSIONS.find((p) => p.id === PRIMARY_PROFESSION)!;
  const secondaries = PROFESSIONS.filter((p) => p.id !== PRIMARY_PROFESSION);

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
      const craft = profession ?? PRIMARY_PROFESSION;
      const label = PROFESSION_LABEL[craft] ?? "Creator";
      await api.applyRoleIntentOnboarding(
        null,
        label,
        ["Showcase work"],
        [],
        craft,
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

  function CraftButton({ id, label, blurb, icon }: { id: string; label: string; blurb: string; icon: string }) {
    const Icon = PROFESSION_ICON[icon] ?? Sparkles;
    const on = profession === id;
    return (
      <button
        type="button"
        onClick={() => setProfession(id)}
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
          <span className="block font-display text-sm font-bold text-white">{label}</span>
          <span className="block text-[12px] leading-tight text-white/45">{blurb}</span>
        </span>
      </button>
    );
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
              Make music with the right people
            </h1>
            <p className="mb-5 mt-2 text-[15px] leading-relaxed text-white/55">
              VYBZ is built for music collaboration. Confirm your lane — you can add other crafts later on your profile.
            </p>

            <div className="grid gap-2">
              <CraftButton {...music} />
              {showMoreCrafts ? (
                secondaries.map((p) => <CraftButton key={p.id} {...p} />)
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMoreCrafts(true)}
                  className="rounded-2xl border border-dashed border-white/10 px-3.5 py-2.5 text-left text-[12px] text-white/40 hover:border-white/20 hover:text-white/60"
                >
                  Also work in art, video, or games? (optional)
                </button>
              )}
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
              onClick={() => { setProfession(PRIMARY_PROFESSION); void finish(false); }}
              className="mt-3 w-full text-center text-[13px] text-white/45 hover:text-white/70"
            >
              Skip — enter as Music
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
              Drop a sound
            </h1>
            <p className="mb-6 mt-2 text-[15px] leading-relaxed text-white/55">
              Share a loop, stem, or track on the Feed — producers, vocalists, and engineers who fit can find you.
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
