import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Loader2, X } from "lucide-react";
import { overlayVariants, sheetVariants, springSoft, withReduce } from "@/lib/motion";
import { useReduceFx } from "@/lib/display";
import { useSession } from "@/store/session";
import { usePlatform } from "@/platform/bridge/PlatformProvider";
import { PlatformError } from "@/platform/bridge";
import { enqueueUploads, editUploadMeta, annotateUploadBody } from "@/features/upload/uploadQueue";
import {
  GENERATE_DEFAULT_SECONDS,
  GENERATE_MAX_SECONDS,
  GENERATE_MIN_SECONDS,
  generationDisclosure,
  titleFromPrompt,
} from "./generateRequest";
import { probeGenerateWorker } from "./localWorker";

export function GenerateSheet({
  open,
  onClose,
  onQueued,
}: {
  open: boolean;
  onClose: () => void;
  onQueued: () => void;
}) {
  const { showToast } = useSession();
  const platform = usePlatform();
  const reduce = useReduceFx();
  const [prompt, setPrompt] = useState("");
  const [durationSec, setDurationSec] = useState(GENERATE_DEFAULT_SECONDS);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [localOk, setLocalOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void platform.processing.getCapabilities().then((caps) => {
      if (!alive) return;
      setLocalOk(caps.localGenerate);
      if (!caps.localGenerate) {
        setAvailable(false);
        return;
      }
      void probeGenerateWorker().then((ok) => {
        if (alive) setAvailable(ok);
      });
    });
    return () => {
      alive = false;
    };
  }, [open, platform]);

  async function generate() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await platform.processing.generateAudio({
        prompt,
        durationSec,
        model: "small-music",
      });
      const file = result.file.blob;
      if (!(file instanceof File) && !(file instanceof Blob)) {
        showToast("Worker returned no file.");
        return;
      }
      const wav = file instanceof File ? file : new File([file], result.file.name, { type: "audio/wav" });
      const { ids } = enqueueUploads([wav]);
      const id = ids[0];
      if (id) {
        editUploadMeta(id, "title", titleFromPrompt(result.prompt));
        annotateUploadBody(
          id,
          generationDisclosure({ prompt: result.prompt, model: result.model, seed: result.seed }),
        );
      }
      showToast("In your Library queue — not on your VYBZ until you Place.");
      onClose();
      onQueued();
    } catch (err) {
      const message = err instanceof PlatformError ? err.message : "Couldn't generate that.";
      showToast(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 sm:items-center"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={withReduce(reduce, { duration: 0.22 })}
        >
          <motion.div
            role="dialog"
            aria-labelledby="generate-title"
            data-testid="generate-sheet"
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c0d10] p-4 shadow-none"
            variants={sheetVariants}
            transition={withReduce(reduce, springSoft)}
          >
            <div className="mb-3 flex items-center justify-between">
              <p id="generate-title" className="text-[15px] font-semibold text-white/90">
                Generate
              </p>
              <button type="button" aria-label="Close" onClick={onClose} className="forge-chip h-9 w-9">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-[13px] text-white/45">
              Makes a private file in Library. It is not published and not placed on your VYBZ.
              Powered by Stability AI.
            </p>
            {localOk === false ? (
              <p className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white/50">
                Generate runs on this computer, not on the phone yet.
              </p>
            ) : available === false ? (
              <p className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white/50">
                Local worker is off. Run <span className="text-white/70">npm run generate:worker</span> on this machine.
              </p>
            ) : null}
            <label className="mb-2 block text-[12px] text-white/50" htmlFor="generate-prompt">
              Prompt
            </label>
            <textarea
              id="generate-prompt"
              data-testid="generate-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="lo-fi hip hop beat, 90 BPM"
              className="mb-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white/85 outline-none focus:border-white/25"
            />
            <label className="mb-2 block text-[12px] text-white/50" htmlFor="generate-duration">
              Seconds ({GENERATE_MIN_SECONDS}–{GENERATE_MAX_SECONDS})
            </label>
            <input
              id="generate-duration"
              type="number"
              min={GENERATE_MIN_SECONDS}
              max={GENERATE_MAX_SECONDS}
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="mb-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white/85 outline-none"
            />
            <button
              type="button"
              data-testid="generate-run"
              disabled={busy || !prompt.trim() || localOk !== true || available !== true}
              onClick={() => void generate()}
              className="btn btn-primary flex h-11 w-full items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
              {busy ? "Generating…" : "Generate"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
