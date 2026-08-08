import { useState } from "react";
import { Download, ImagePlus, Loader2, Sparkles } from "lucide-react";
import {
  ART_FILE_FAIL_BYTES,
  ART_FILE_WARN_BYTES,
  ART_STORE_MIN_PX,
  fixArtworkFile,
  probeArtworkFile,
  type ArtCheckResult,
} from "@/features/tools/artCheck";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";

function prettyBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

export function ArtCheckPage() {
  const { showToast } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ArtCheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [fixedUrl, setFixedUrl] = useState<string | null>(null);

  useRegisterAppBar({ title: "Art Check" }, []);

  async function onPick(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) {
      showToast("Drop or choose an image");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (fixedUrl) URL.revokeObjectURL(fixedUrl);
    setFixedUrl(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setBusy(true);
    try {
      setResult(await probeArtworkFile(f));
    } catch {
      showToast("Couldn't read that image");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function runFix() {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await fixArtworkFile(file, {
        brighten: result?.needsBrighten ?? false,
        pad: true,
      });
      if (fixedUrl) URL.revokeObjectURL(fixedUrl);
      setFixedUrl(URL.createObjectURL(blob));
      showToast(`Fixed to ${ART_STORE_MIN_PX}² PNG`);
    } catch {
      showToast("Fix failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="art-check">
      <p className="mb-4 text-[13px] text-white/45">
        Measure cover art against store-style square / {ART_STORE_MIN_PX}px rules and common upload
        size guidance ({ART_FILE_WARN_BYTES / (1024 * 1024)}–{ART_FILE_FAIL_BYTES / (1024 * 1024)}{" "}
        MiB soft caps — not a DSP submission claim). Fix resizes and pads; brighten only when
        measured luma is low.
      </p>

      <label
        className="mb-5 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center transition hover:border-veil-300/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onPick(e.dataTransfer.files?.[0]);
        }}
      >
        <ImagePlus className="h-8 w-8 text-veil-300/80" />
        <span className="text-sm text-white/80">Drop artwork or browse</span>
        <span className="text-[11px] text-white/35">PNG, JPG, WebP</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onPick(f);
          }}
        />
      </label>

      {busy && !result && (
        <p className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Measuring…
        </p>
      )}

      {result && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {previewUrl && (
              <img src={previewUrl} alt="Original artwork" className="aspect-square w-full rounded-xl object-contain bg-black/40" />
            )}
            {fixedUrl && (
              <img src={fixedUrl} alt="Fixed artwork" className="aspect-square w-full rounded-xl object-contain bg-black/40" />
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[10px] uppercase text-white/35">Size</dt>
              <dd className="tabular-nums text-white/85">
                {result.width} × {result.height}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Square</dt>
              <dd>{result.square ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Store min</dt>
              <dd>{result.meetsStoreMin ? "Pass" : `Need ${ART_STORE_MIN_PX}²`}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Mean luma</dt>
              <dd className="tabular-nums">{(result.meanLuma * 100).toFixed(0)}%</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">File</dt>
              <dd>{prettyBytes(result.fileBytes)}</dd>
            </div>
            <div data-testid="art-file-size-verdict">
              <dt className="text-[10px] uppercase text-white/35">File size gate</dt>
              <dd>
                {result.fileSizeVerdict === "pass" && "Pass"}
                {result.fileSizeVerdict === "warn" && "Warn (≥ 8 MiB)"}
                {result.fileSizeVerdict === "fail" && "Fail-style (≥ 10 MiB)"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Brighten?</dt>
              <dd>{result.needsBrighten ? "Suggested" : "Not needed"}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void runFix()} className="btn btn-primary px-4 py-2.5 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Fix to {ART_STORE_MIN_PX}²
            </button>
            {fixedUrl && (
              <a href={fixedUrl} download="artwork-fixed.png" className="btn btn-ghost px-4 py-2.5 text-sm">
                <Download className="h-4 w-4" /> Download PNG
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
