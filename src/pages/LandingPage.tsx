import { useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Upload } from "lucide-react";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { BuildStamp } from "@/components/BuildStamp";
import { FeaturedMiniPlayer } from "@/features/featured/FeaturedMiniPlayer";
import { normalizeInviteCode } from "@/lib/alphaAccess";
import { stashPendingInviteKey } from "@/lib/pendingInviteKey";
import { collectLibraryAudioFiles, dragHasFiles } from "@/lib/libraryDropIngest";
import { stashLandingDropFiles, peekLandingDropFiles } from "@/features/workspace/landingDropStash";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Signed-out alpha gate — brand + invite key (Masterplan §13 progressive disclosure).
 * OR-040: page-wide drag stashes audio in memory until sign-in — no pre-login workspace banner.
 * Featured mini-player (Helix) sits fixed at the bottom — not over invite controls.
 */
export function LandingPage() {
  const navigate = useNavigate();
  const reduce = useReduceFx();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dropHint, setDropHint] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function onEnter(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeInviteCode(code);
    if (normalized.length < 10) {
      setErr("Enter your full invite key.");
      return;
    }
    setBusy(true);
    setErr(null);
    stashPendingInviteKey(normalized);
    navigate("/enter");
  }

  const acceptFiles = useCallback((list: FileList | File[] | null) => {
    if (!list) return;
    const { files, skippedNonAudio, skippedOversize } = collectLibraryAudioFiles(list);
    if (skippedOversize > 0) {
      setDropHint(`${skippedOversize} file(s) over 1 GB — skipped`);
      return;
    }
    if (!files.length) {
      if (skippedNonAudio > 0) setDropHint("Drop audio files (WAV, FLAC, MP3, …)");
      return;
    }
    stashLandingDropFiles(files);
    const n = peekLandingDropFiles().length;
    setDropHint(
      n === 1
        ? "1 track ready — enter to open it after sign-in (session only · no upload until you sign in)."
        : `${n} tracks ready — enter to open them after sign-in (session only · no upload until you sign in).`,
    );
  }, []);

  return (
    <div
      className="public-scroll-frame public-ops-shell nexus-void relative flex min-h-[100dvh] flex-col pb-[max(4.5rem,env(safe-area-inset-bottom))] text-white"
      data-public-shell="landing"
      data-testid="public-landing"
      data-landing-drop-zone=""
      data-no-library-drop
      onDragEnter={(e) => {
        if (!dragHasFiles(e.dataTransfer)) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!dragHasFiles(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        if (!dragHasFiles(e.dataTransfer)) return;
        e.preventDefault();
        setDragging(false);
        acceptFiles(e.dataTransfer.files);
      }}
    >
      {/* OR-040: keep testid for gate; no visible workspace banner pre-login. */}
      <div data-testid="landing-drop-zone" className="sr-only" aria-hidden />
      <input
        type="file"
        accept="audio/*,.wav,.aiff,.flac,.mp3,.ogg,.m4a,.opus"
        multiple
        className="sr-only"
        tabIndex={-1}
        data-testid="landing-drop-input"
        aria-hidden
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <GeometricBackdrop intensity="hero" />

      {dragging ? (
        <div
          className="pointer-events-none fixed inset-0 z-[40] flex items-center justify-center bg-ink-950/55"
          data-testid="landing-drop-overlay"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-white/30 bg-ink-900/90 px-8 py-6">
            <Upload className="h-7 w-7 text-white/70" />
            <p className="font-display text-base text-white">Drop to stash for after you enter</p>
            <p className="text-[12px] text-white/45">No upload until you sign in</p>
          </div>
        </div>
      ) : null}

      {/* my-auto centres the gate when there is room and collapses instead of
          overflowing into the featured player's reserved strip on short viewports. */}
      <main className="relative z-10 flex flex-1 flex-col items-center px-5 py-12">
        <div className="my-auto flex w-full flex-col items-center">
        <LandingLogo />

        <motion.form
          onSubmit={onEnter}
          className="landing-invite-panel forge-glass relative mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 !rounded-2xl p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          data-testid="landing-invite-gate"
        >
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <label className="relative z-[1] sr-only" htmlFor="landing-invite-code">
            Invite key
          </label>
          <div className="landing-key-field relative z-[1]">
            <KeyRound className="landing-key-field-icon" aria-hidden />
            <input
              id="landing-invite-code"
              name="invite-code"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (err) setErr(null);
              }}
              placeholder="VYBZ-A1-····-········"
              className="landing-key-input"
              data-testid="landing-invite-input"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className={cx("relative z-[1] landing-neon-cta", !reduce && "landing-neon-cta--pulse")}
            data-testid="landing-invite-enter"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter"}
          </button>

          {err ? (
            <p className="relative z-[1] text-center text-xs text-rose-300" role="alert">
              {err}
            </p>
          ) : null}

          <Link
            to="/enter"
            className={cx("relative z-[1] landing-neon-cta-ghost", !reduce && "landing-neon-cta-ghost--pulse")}
            data-testid="landing-signin"
          >
            Already in? Sign in
          </Link>

          {dropHint ? (
            <p
              className="relative z-[1] text-center text-[12px] text-[rgb(var(--app-accent-rgb))]"
              data-testid="landing-drop-hint"
            >
              {dropHint}
            </p>
          ) : null}
        </motion.form>
        </div>
      </main>

      <footer className="relative z-10 px-5 pb-2 pt-2 text-center text-[11px] text-white/30">
        <Link to="/legal/privacy" className="hover:text-white/55">
          Privacy
        </Link>
        <span className="px-2">·</span>
        <Link to="/legal/terms" className="hover:text-white/55">
          Terms
        </Link>
        <BuildStamp className="mt-1.5 opacity-70" />
      </footer>
      <FeaturedMiniPlayer />
    </div>
  );
}
