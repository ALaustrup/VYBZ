/**
 * M6 Correct — reversible ops with bypass, before/after, loudness-matched A/B.
 * Ops: DC, peak, balance, silence, hum, width, EQ, click, loudness. Local-only.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Pause, Play } from "lucide-react";
import {
  CHANNEL_BALANCE_VERSION,
  CLICK_ATTENUATE_VERSION,
  CORRECTION_VERSION,
  LOUDNESS_GAIN_VERSION,
  LOUDNESS_MATCH_COMPARE_VERSION,
  MAINS_HUM_CORRECT_VERSION,
  PEAK_SAFETY_CEILING_DBFS,
  PEAK_SAFETY_VERSION,
  SILENCE_TRIM_VERSION,
  SPECTRAL_EQ_VERSION,
  STEREO_WIDTH_VERSION,
  applyChannelBalance,
  applyClickAttenuate,
  applyLoudnessGain,
  applyMainsHumReduce,
  applyPeakSafety,
  applySilenceTrim,
  applySpectralEqAssist,
  applyStereoWidth,
  describeMatchGains,
  matchLoudnessForCompare,
  removeDcOffset,
  type LevelSnapshot,
} from "@vybz/processing/waveform";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { decodeToBuffer, encodeWav } from "@/lib/audioEdit";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import {
  playTrack,
  toggle,
  usePlayerShell,
} from "@/lib/audioBus";
import {
  stopAudioPreview,
  useAudioPreviewUrlCleanup,
} from "@/lib/audioPreview";
import {
  localSignal,
  simulationSignal,
} from "@/lib/vdock/playbackSignal";
import {
  ForgeChip,
  ForgeDropzone,
  ForgeMetric,
  ToolWorkbench,
} from "@/components/ToolWorkbench";
import { setWorkingTrack, workingTrackAsFile } from "@/features/workspace/workingSet";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";

type CorrectOp = "dc" | "peak" | "balance" | "silence" | "hum" | "width" | "eq" | "click" | "loudness";

const OP_SUBTITLE: Record<CorrectOp, string> = {
  dc: "DC offset",
  peak: "Peak safety",
  balance: "Channel balance",
  silence: "Silence trim",
  hum: "Mains hum",
  width: "Stereo width",
  eq: "EQ assist",
  click: "Click attenuate",
  loudness: "Loudness gain",
};

function isCorrectOp(value: string | null): value is CorrectOp {
  return value !== null && Object.prototype.hasOwnProperty.call(OP_SUBTITLE, value);
}

type PreviewState = {
  before: LevelSnapshot;
  after: LevelSnapshot;
  detailLabel: string;
  detailValue: string;
  version: string;
  downloadSuffix: string;
};

function planarFromBuffer(buf: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    out.push(buf.getChannelData(c).slice());
  }
  return out;
}

function bufferFromPlanar(channels: Float32Array[], sampleRate: number): AudioBuffer {
  const length = channels[0]?.length ?? 0;
  const ctx = new OfflineAudioContext(Math.max(1, channels.length), Math.max(1, length), sampleRate);
  const buf = ctx.createBuffer(Math.max(1, channels.length), Math.max(1, length), sampleRate);
  for (let c = 0; c < channels.length; c++) {
    buf.getChannelData(c).set(channels[c]!);
  }
  return buf;
}

function fmtDb(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "Not measured";
  return `${n.toFixed(1)} dBFS`;
}

export function DcOffsetCorrectPage() {
  const { showToast } = useSession();
  const player = usePlayerShell();
  const [searchParams] = useSearchParams();
  const [op, setOp] = useState<CorrectOp>(() => {
    const requested = searchParams.get("op");
    return isCorrectOp(requested) ? requested : "dc";
  });
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [planar, setPlanar] = useState<Float32Array[] | null>(null);
  const [sampleRate, setSampleRate] = useState(48000);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [correctedPlanar, setCorrectedPlanar] = useState<Float32Array[] | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [correctedUrl, setCorrectedUrl] = useState<string | null>(null);
  const [listenAUrl, setListenAUrl] = useState<string | null>(null);
  const [listenBUrl, setListenBUrl] = useState<string | null>(null);
  const [matchLoudness, setMatchLoudness] = useState(true);
  const [matchLabel, setMatchLabel] = useState<string | null>(null);
  const [bypass, setBypass] = useState(false);

  useRegisterAppBar({ title: "Correct", subtitle: OP_SUBTITLE[op] }, [op]);

  useAudioPreviewUrlCleanup(originalUrl, "correct-preview:");
  useAudioPreviewUrlCleanup(correctedUrl, "correct-preview:");
  useAudioPreviewUrlCleanup(listenAUrl, "correct-preview:");
  useAudioPreviewUrlCleanup(listenBUrl, "correct-preview:");

  const activeUrl = matchLoudness
    ? bypass
      ? listenAUrl
      : listenBUrl
    : bypass
      ? originalUrl
      : correctedUrl;
  const activeTrackId = activeUrl
    ? `correct-preview:${bypass ? "a" : "b"}:${matchLoudness ? "matched" : "unmatched"}:${activeUrl}`
    : null;
  const activeInVdock = player.track?.id === activeTrackId;

  const metrics = useMemo(() => {
    if (!preview) return null;
    return bypass ? preview.before : preview.after;
  }, [bypass, preview]);

  function buildMatchedListenUrls(
    source: Float32Array[],
    corrected: Float32Array[],
    rate: number,
  ) {
    const pair = matchLoudnessForCompare(source, corrected, rate);
    setMatchLabel(describeMatchGains(pair));
    const aUrl = URL.createObjectURL(encodeWav(bufferFromPlanar(pair.a, rate)));
    const bUrl = URL.createObjectURL(encodeWav(bufferFromPlanar(pair.b, rate)));
    setListenAUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return aUrl;
    });
    setListenBUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return bUrl;
    });
  }

  function clearMatchedListenUrls() {
    setMatchLabel(null);
    setListenAUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setListenBUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function runOp(channels: Float32Array[], rate: number, chosen: CorrectOp) {
    stopOwnedPlayback();
    let result: { channels: Float32Array[]; preview: PreviewState };
    if (chosen === "dc") {
      const r = removeDcOffset(channels);
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: "Removed mean",
          detailValue: r.removedMean.toExponential(3),
          version: CORRECTION_VERSION,
          downloadSuffix: "dc-fixed",
        },
      };
    } else if (chosen === "peak") {
      const r = applyPeakSafety(channels);
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: `Gain → ${PEAK_SAFETY_CEILING_DBFS} dBFS ceil`,
          detailValue: `${r.gainDb.toFixed(2)} dB`,
          version: PEAK_SAFETY_VERSION,
          downloadSuffix: "peak-safe",
        },
      };
    } else if (chosen === "balance") {
      const r = applyChannelBalance(channels);
      const beforeDb =
        r.balanceDeltaDbBefore == null ? "mono" : `${r.balanceDeltaDbBefore.toFixed(1)} dB`;
      const afterDb =
        r.balanceDeltaDbAfter == null ? "mono" : `${r.balanceDeltaDbAfter.toFixed(1)} dB`;
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: "L−R Δ (before → after)",
          detailValue: `${beforeDb} → ${afterDb}`,
          version: CHANNEL_BALANCE_VERSION,
          downloadSuffix: "balanced",
        },
      };
    } else if (chosen === "silence") {
      const r = applySilenceTrim(channels, rate);
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: "Duration (before → after)",
          detailValue: `${r.durationBeforeSec.toFixed(2)}s → ${r.durationAfterSec.toFixed(2)}s (−${(r.trimmedLeadSec + r.trimmedTrailSec).toFixed(2)}s)`,
          version: SILENCE_TRIM_VERSION,
          downloadSuffix: "silence-trim",
        },
      };
    } else if (chosen === "hum") {
      const r = applyMainsHumReduce(channels, rate);
      const before =
        r.prominenceDbBefore == null ? "Not measured" : `${r.prominenceDbBefore.toFixed(1)} dB`;
      const after =
        r.prominenceDbAfter == null ? "Not measured" : `${r.prominenceDbAfter.toFixed(1)} dB`;
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: `${r.frequencyHz} Hz prominence (before → after)`,
          detailValue: `${before} → ${after}`,
          version: MAINS_HUM_CORRECT_VERSION,
          downloadSuffix: "hum-reduce",
        },
      };
    } else if (chosen === "width") {
      const r = applyStereoWidth(channels, { mode: "auto" });
      const corrB = r.correlationBefore == null ? "—" : r.correlationBefore.toFixed(2);
      const corrA = r.correlationAfter == null ? "—" : r.correlationAfter.toFixed(2);
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: `Width ${r.modeApplied} · corr (before → after)`,
          detailValue: `${corrB} → ${corrA} (×${r.sideGain.toFixed(2)} side)`,
          version: STEREO_WIDTH_VERSION,
          downloadSuffix: "width",
        },
      };
    } else if (chosen === "eq") {
      const r = applySpectralEqAssist(channels, rate, { mode: "auto" });
      const lowB = r.balanceBefore ? `${(r.balanceBefore.lowShare * 100).toFixed(0)}%` : "—";
      const lowA = r.balanceAfter ? `${(r.balanceAfter.lowShare * 100).toFixed(0)}%` : "—";
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: `EQ ${r.modeApplied} · low share (before → after)`,
          detailValue: `${lowB} → ${lowA}`,
          version: SPECTRAL_EQ_VERSION,
          downloadSuffix: "eq-assist",
        },
      };
    } else if (chosen === "click") {
      const r = applyClickAttenuate(channels, rate);
      const before = r.countBefore == null ? "—" : String(r.countBefore);
      const after = r.countAfter == null ? "—" : String(r.countAfter);
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: `Clicks softened ${r.eventsFixed} · count (before → after)`,
          detailValue: `${before} → ${after}`,
          version: CLICK_ATTENUATE_VERSION,
          downloadSuffix: "click-soft",
        },
      };
    } else {
      const r = applyLoudnessGain(channels, rate);
      const before =
        r.integratedLufsBefore == null ? "—" : `${r.integratedLufsBefore.toFixed(1)} LUFS`;
      const after =
        r.integratedLufsAfter == null ? "—" : `${r.integratedLufsAfter.toFixed(1)} LUFS`;
      result = {
        channels: r.channels,
        preview: {
          before: r.before,
          after: r.after,
          detailLabel: `Integrated → ${r.targetLufs} LUFS (before → after)`,
          detailValue: `${before} → ${after} (${r.gainDb >= 0 ? "+" : ""}${r.gainDb.toFixed(1)} dB)`,
          version: LOUDNESS_GAIN_VERSION,
          downloadSuffix: "loudness",
        },
      };
    }

    const outBuf = bufferFromPlanar(result.channels, rate);
    const wav = encodeWav(outBuf);
    setCorrectedPlanar(result.channels);
    setCorrectedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(wav);
    });
    setPreview(result.preview);
    setBypass(false);
    if (matchLoudness) {
      buildMatchedListenUrls(channels, result.channels, rate);
    } else {
      clearMatchedListenUrls();
    }
  }

  async function onFile(file: File | undefined, source: "tool-drop" | "workspace" = "tool-drop") {
    if (!file || !isAudioFile(file)) {
      showToast("Choose an audio file");
      return;
    }
    setBusy(true);
    try {
      const buf = await decodeToBuffer(file);
      const nextPlanar = planarFromBuffer(buf);
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      setOriginalUrl(URL.createObjectURL(file));
      setPlanar(nextPlanar);
      setSampleRate(buf.sampleRate);
      setFileName(file.name);
      runOp(nextPlanar, buf.sampleRate, op);
      if (source === "tool-drop") {
        setWorkingTrack({
          title: file.name.replace(/\.[^.]+$/, "") || file.name,
          artistName: null,
          fileName: file.name,
          mimeType: file.type || "audio/wav",
          blob: file,
          source: "tool-drop",
        });
      }
      showToast("Correction preview ready — bypass toggles original");
    } catch {
      showToast("Couldn't decode that file");
      setPreview(null);
      setPlanar(null);
    } finally {
      setBusy(false);
    }
  }

  const working = useWorkingTrack();
  const loadedWorkingId = useRef<string | null>(null);
  useEffect(() => {
    if (!working || planar || loadedWorkingId.current === working.id) return;
    const file = workingTrackAsFile(working);
    if (!file) return;
    loadedWorkingId.current = working.id;
    void onFile(file, "workspace");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from song workspace
  }, [working, planar]);

  function onSelectOp(next: CorrectOp) {
    setOp(next);
    if (planar) {
      setBusy(true);
      try {
        runOp(planar, sampleRate, next);
      } finally {
        setBusy(false);
      }
    }
  }

  function onToggleMatch() {
    stopOwnedPlayback();
    const next = !matchLoudness;
    setMatchLoudness(next);
    if (!planar || !correctedPlanar) return;
    setBusy(true);
    try {
      if (next) buildMatchedListenUrls(planar, correctedPlanar, sampleRate);
      else clearMatchedListenUrls();
    } finally {
      setBusy(false);
    }
  }

  function stopOwnedPlayback() {
    stopAudioPreview("correct-preview:");
  }

  function selectBypass(next: boolean) {
    stopOwnedPlayback();
    setBypass(next);
  }

  function playSelectedInVdock() {
    if (!activeUrl || !activeTrackId) return;
    if (activeInVdock) {
      void toggle();
      return;
    }
    const baseName = fileName.replace(/\.[^.]+$/, "") || "Local audio";
    const correctedLabel = `${OP_SUBTITLE[op]} correction preview (${preview?.version ?? "version not reported"})`;
    const matchedLabel = `Loudness-matched ${bypass ? "original reference" : correctedLabel} (${LOUDNESS_MATCH_COMPARE_VERSION}); download remains unmatched`;
    const titleSuffix = bypass
      ? matchLoudness
        ? "Loudness-matched original reference"
        : "Original"
      : matchLoudness
        ? `${OP_SUBTITLE[op]} · loudness-matched`
        : OP_SUBTITLE[op];
    const track = {
      id: activeTrackId,
      url: activeUrl,
      title: `${baseName} · ${titleSuffix}`,
      artist: "Correct",
      signal:
        bypass && !matchLoudness
          ? localSignal()
          : simulationSignal(matchLoudness ? matchedLabel : correctedLabel),
    };
    playTrack(track, [track]);
  }

  return (
    <ToolWorkbench
      eyebrow="Correct"
      title="Correct"
      subtitle="M6 corrections with bypass and loudness-matched A/B listening. Download stays dry (unmatched). No credits charged."
      testId="dc-offset-correct"
    >
      <div className="forge-glass forge-plasma relative space-y-3 !rounded-2xl p-3 sm:p-4" role="group" aria-label="Correction operation">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <p className="relative z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Cleanup
        </p>
        <div className="relative z-[1] flex flex-wrap gap-2">
          <ForgeChip testId="correct-op-dc" active={op === "dc"} onClick={() => onSelectOp("dc")}>
            DC offset
          </ForgeChip>
          <ForgeChip testId="correct-op-peak" active={op === "peak"} onClick={() => onSelectOp("peak")}>
            Peak safety
          </ForgeChip>
          <ForgeChip testId="correct-op-silence" active={op === "silence"} onClick={() => onSelectOp("silence")}>
            Silence trim
          </ForgeChip>
          <ForgeChip testId="correct-op-hum" active={op === "hum"} onClick={() => onSelectOp("hum")}>
            Mains hum
          </ForgeChip>
          <ForgeChip testId="correct-op-click" active={op === "click"} onClick={() => onSelectOp("click")}>
            Click soften
          </ForgeChip>
        </div>
        <p className="relative z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Stereo / tone
        </p>
        <div className="relative z-[1] flex flex-wrap gap-2">
          <ForgeChip testId="correct-op-balance" active={op === "balance"} onClick={() => onSelectOp("balance")}>
            Channel balance
          </ForgeChip>
          <ForgeChip testId="correct-op-width" active={op === "width"} onClick={() => onSelectOp("width")}>
            Stereo width
          </ForgeChip>
          <ForgeChip testId="correct-op-eq" active={op === "eq"} onClick={() => onSelectOp("eq")}>
            EQ assist
          </ForgeChip>
        </div>
        <p className="relative z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Loudness
        </p>
        <div className="relative z-[1] flex flex-wrap gap-2">
          <ForgeChip testId="correct-op-loudness" active={op === "loudness"} onClick={() => onSelectOp("loudness")}>
            Loudness (−14)
          </ForgeChip>
        </div>
      </div>

      <ForgeDropzone
        label="Drop audio to correct"
        hint="or click to choose · local only · no credits"
        accept={AUDIO_ACCEPT}
        busy={busy}
        onFiles={(list) => void onFile(list?.[0])}
      />

      {preview && (
        <div className="forge-glass forge-plasma relative space-y-4 !rounded-2xl p-4 sm:p-5">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[1] flex flex-wrap items-center gap-2" role="group" aria-label="A/B preview">
            <ForgeChip testId="correct-ab-a" active={bypass} onClick={() => selectBypass(true)}>
              A · Original
            </ForgeChip>
            <ForgeChip testId="correct-ab-b" active={!bypass} onClick={() => selectBypass(false)}>
              B · Corrected
            </ForgeChip>
            <ForgeChip
              testId="correct-match-loudness"
              active={matchLoudness}
              onClick={onToggleMatch}
            >
              {matchLoudness ? "Match loudness on" : "Match loudness off"}
            </ForgeChip>
            <ForgeChip testId="correct-bypass" pressed={bypass} onClick={() => selectBypass(!bypass)}>
              Toggle A/B
            </ForgeChip>
            {correctedUrl && (
              <a
                href={correctedUrl}
                download={`${fileName.replace(/\.[^.]+$/, "") || "vybz"}-${preview.downloadSuffix}.wav`}
                className="btn btn-ghost px-3 py-2 text-sm"
                data-testid="correct-download"
              >
                <Download className="h-4 w-4" /> Download corrected WAV
              </a>
            )}
            <span className="text-[11px] text-white/35">
              {fileName} · {preview.version}
              {matchLoudness ? ` · ${LOUDNESS_MATCH_COMPARE_VERSION}` : ""}
            </span>
          </div>

          {activeUrl && (
            <button
              type="button"
              onClick={playSelectedInVdock}
              className="btn btn-primary relative z-[1] px-4 py-2.5 text-sm"
              data-testid="correct-play-vdock"
            >
              {activeInVdock && player.playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {activeInVdock && player.playing ? "Pause VDock" : "Play selected in VDock"}
            </button>
          )}
          {matchLoudness && matchLabel && (
            <p className="relative z-[1] text-[12px] text-white/45" data-testid="correct-match-label">
              Listening gains matched ({matchLabel}). Download is unmatched.
            </p>
          )}

          <dl
            className="relative z-[1] grid grid-cols-2 gap-3 sm:grid-cols-3"
            data-testid="correct-metrics"
          >
            <ForgeMetric label={preview.detailLabel} value={preview.detailValue} />
            <ForgeMetric label="Peak (active)" value={fmtDb(metrics?.peakDbfs)} />
            <ForgeMetric label="RMS (active)" value={fmtDb(metrics?.rmsDbfs)} />
            <ForgeMetric label="Peak before" value={fmtDb(preview.before.peakDbfs)} />
            <ForgeMetric label="Peak after" value={fmtDb(preview.after.peakDbfs)} />
            <ForgeMetric
              label="Listening"
              value={`${bypass ? "A · Original" : "B · Corrected"}${matchLoudness ? " · loudness-matched" : ""}`}
            />
          </dl>
        </div>
      )}
    </ToolWorkbench>
  );
}
