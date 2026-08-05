import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StateView } from "@/components/states/StateView";
import { useSession } from "@/store/session";
import { usePlatform, useShellMode } from "@/platform/bridge/PlatformProvider";
import { getPrepareOwnerId, getReleaseBundle } from "@/features/prepare/service";
import { severityTone } from "@/features/prepare/severity";
import {
  buildDdpStubPackage,
  buildDistributionPackage,
  buildDistributionReport,
  type DistributionReport,
} from "@/features/distribution/buildReport";
import type { FindingDraft } from "@vybz/domain/releases";

function verdictTone(v: DistributionReport["verdict"]): "success" | "warning" | "danger" | "neutral" {
  if (v === "pass") return "success";
  if (v === "warnings") return "warning";
  return "danger";
}

export function DistributionReportPage() {
  const { id } = useParams();
  const { userId, showToast } = useSession();
  const ownerId = getPrepareOwnerId(userId);
  const platform = usePlatform();
  const shell = useShellMode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DistributionReport | null>(null);
  const [exportSha, setExportSha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("Release");
  const [loudnessLabel, setLoudnessLabel] = useState<string>("Not measured");

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const bundle = await getReleaseBundle(ownerId, id);
      if (!bundle) {
        setError("Release not found");
        setReport(null);
        return;
      }
      setTitle(bundle.project.title);
      const audio = bundle.assets.find((a) => a.kind === "audio");
      const art = bundle.assets.find((a) => a.kind === "artwork");
      const probe = (audio?.probe ?? {}) as {
        integratedLufsApprox?: number;
        peakDbfs?: number;
        loudnessMeasured?: boolean;
        loudnessMethod?: "pcm-wav" | "decoded";
        loudnessResampled?: boolean;
        isrc?: string;
      };
      const artProbe = (art?.probe ?? {}) as {
        fileName?: string;
        mimeType?: string;
        sizeBytes?: number;
        width?: number;
        height?: number;
        dpi?: number;
      };

      const loudness =
        probe.loudnessMeasured &&
        probe.integratedLufsApprox != null &&
        !Number.isNaN(probe.integratedLufsApprox)
          ? {
              integratedLufs: probe.integratedLufsApprox,
              // True peak needs an oversampling meter (M4); we only have sample peak.
              truePeakDb: null,
              samplePeakDbfs: probe.peakDbfs ?? null,
            }
          : null;

      const source =
        probe.loudnessMethod === "decoded"
          ? probe.loudnessResampled
            ? "decoded audio, resampled"
            : "decoded audio"
          : "file PCM";

      setLoudnessLabel(
        loudness?.integratedLufs != null
          ? `${loudness.integratedLufs.toFixed(1)} LUFS integrated — estimated, not standards-certified (from ${source})${
              loudness.samplePeakDbfs != null
                ? ` · sample peak ${loudness.samplePeakDbfs.toFixed(1)} dBFS · true peak not measured`
                : ""
            }`
          : audio
            ? "Not measured — this device could not decode the audio"
            : "Not measured",
      );

      const meta = bundle.project as { isrc?: string | null };
      const next = buildDistributionReport(id, {
        title: bundle.project.title,
        artistName: bundle.project.artistName,
        isrc: meta.isrc ?? probe.isrc ?? null,
        hasAudio: Boolean(audio),
        hasArtwork: Boolean(art),
        loudness,
        artwork: art
          ? {
              fileName: artProbe.fileName ?? art.fileName ?? "artwork",
              mimeType: artProbe.mimeType ?? "image/png",
              sizeBytes: artProbe.sizeBytes ?? 0,
              width: artProbe.width,
              height: artProbe.height,
              dpi: artProbe.dpi ?? null,
            }
          : null,
        requireLoudness: Boolean(audio),
      });
      setReport(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build report");
    } finally {
      setLoading(false);
    }
  }, [id, ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onExport() {
    if (!report || !id) return;
    setBusy(true);
    try {
      const pkg =
        shell === "desktop"
          ? await buildDdpStubPackage(report)
          : await buildDistributionPackage(report);
      setExportSha(pkg.sha256);
      setReport(pkg.report);
      const file = {
        name: pkg.fileName,
        mimeType: "application/zip",
        blob: new Blob([new Uint8Array(pkg.bytes)], { type: "application/zip" }),
      };
      if (shell === "android" && platform.sharing?.shareExport) {
        try {
          await platform.sharing.shareExport(file);
        } catch {
          await platform.files.saveExport(file);
        }
      } else {
        await platform.files.saveExport(file);
      }
      showToast(`Export ready · SHA ${pkg.sha256.slice(0, 12)}…`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <StateView variant="loading" title="Building distribution report" />;
  if (error && !report) return <StateView variant="error" title="Distribution error" body={error} />;
  if (!id || !report) return <StateView variant="empty" title="Missing release" />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-28 md:p-8" data-testid="distribution-page">
      <div>
        <Link to={`/release/${id}`} className="text-xs text-fog hover:text-snow">
          ← Prepare
        </Link>
        <p className="nexus-eyebrow mt-3">Distribution</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="nexus-headline text-2xl md:text-3xl" data-testid="distribution-title">
            {title}
          </h1>
          <Badge tone={verdictTone(report.verdict)} data-testid="distribution-verdict">
            {report.verdict}
          </Badge>
        </div>
        <p className="nexus-subline mt-2 text-sm">
          Packaging checks · ISRC · artwork · loudness when measured.
        </p>
        <p className="mt-2 text-xs text-fog/80" data-testid="distribution-loudness">
          Loudness: {loudnessLabel}
        </p>
      </div>

      {error ? <StateView variant="error" title="Export error" body={error} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="forge" loading={busy} onClick={() => void onExport()} data-testid="distribution-export">
          {shell === "desktop" ? "Export DDP stub ZIP" : shell === "android" ? "Share export" : "Download ZIP"}
        </Button>
        {exportSha ? (
          <p className="self-center text-xs text-fog" data-testid="distribution-export-sha">
            SHA-256 {exportSha}
          </p>
        ) : null}
      </div>

      <ul className="flex flex-col gap-2" data-testid="distribution-findings">
        {report.findings.length === 0 ? (
          <li className="text-sm text-fog">No distribution findings — package looks ready.</li>
        ) : (
          report.findings.map((f: FindingDraft) => (
            <li
              key={f.code}
              className="forge-card"
              data-testid={`distribution-finding-${f.code}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={severityTone(f.severity)}>{f.severity}</Badge>
                <span className="font-medium text-snow">{f.title}</span>
              </div>
              <p className="mt-1 text-xs text-fog">{f.detail}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
