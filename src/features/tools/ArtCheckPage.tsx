import { useState } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { ForgeDropzone, ForgeMetric, ToolWorkbench } from "@/components/ToolWorkbench";
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

  useRegisterAppBar({ title: "Cover" }, []);

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
    <ToolWorkbench
      eyebrow="Cover"
      title="Cover art"
      subtitle={`Square, at least ${ART_STORE_MIN_PX}px. Over ${ART_FILE_WARN_BYTES / (1024 * 1024)} MB we warn, ${ART_FILE_FAIL_BYTES / (1024 * 1024)} MB is too big. Fix resizes and pads.`}
      testId="art-check"
    >
      <ForgeDropzone
        label="Drop artwork"
        hint="or click to choose · PNG, JPG, WebP"
        accept="image/*"
        busy={busy && !result}
        inputTestId="art-check-input"
        onFiles={(list) => void onPick(list?.[0])}
      />

      {busy && !result && (
        <p className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Measuring…
        </p>
      )}

      {result && (
        <div className="forge-glass forge-plasma relative space-y-4 !rounded-2xl p-4">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[1] grid gap-4 sm:grid-cols-2">
            {previewUrl && (
              <img src={previewUrl} alt="Original artwork" className="aspect-square w-full rounded-xl object-contain bg-black/40" />
            )}
            {fixedUrl && (
              <img src={fixedUrl} alt="Fixed artwork" className="aspect-square w-full rounded-xl object-contain bg-black/40" />
            )}
          </div>
          <dl className="relative z-[1] grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ForgeMetric label="Size" value={`${result.width} × ${result.height}`} />
            <ForgeMetric label="Square" value={result.square ? "Yes" : "No"} />
            <ForgeMetric
              label="Store min"
              value={result.meetsStoreMin ? "Pass" : `Need ${ART_STORE_MIN_PX}²`}
            />
            <ForgeMetric label="Mean luma" value={`${(result.meanLuma * 100).toFixed(0)}%`} />
            <ForgeMetric label="File" value={prettyBytes(result.fileBytes)} />
            <div data-testid="art-file-size-verdict">
              <ForgeMetric
                label="File size gate"
                value={
                  result.fileSizeVerdict === "pass"
                    ? "Pass"
                    : result.fileSizeVerdict === "warn"
                      ? "Warn (≥ 8 MiB)"
                      : "Fail-style (≥ 10 MiB)"
                }
              />
            </div>
            <ForgeMetric label="Brighten?" value={result.needsBrighten ? "Suggested" : "Not needed"} />
          </dl>
          <div className="relative z-[1] flex flex-wrap gap-2">
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
    </ToolWorkbench>
  );
}
