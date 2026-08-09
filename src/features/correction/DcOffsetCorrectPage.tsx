/**
 * M6 Correct — reversible ops with bypass + before/after metrics.
 * Ops: DC, peak-safety, L/R balance, silence trim, mains-hum. No credit deduction. Local-only.
 */

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import {
  CHANNEL_BALANCE_VERSION,
  CORRECTION_VERSION,
  MAINS_HUM_CORRECT_VERSION,
  PEAK_SAFETY_CEILING_DBFS,
  PEAK_SAFETY_VERSION,
  SILENCE_TRIM_VERSION,
  STEREO_WIDTH_VERSION,
  applyChannelBalance,
  applyMainsHumReduce,
  applyPeakSafety,
  applySilenceTrim,
  applyStereoWidth,
  removeDcOffset,
  type LevelSnapshot,
} from "@vybz/processing/waveform";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { decodeToBuffer, encodeWav } from "@/lib/audioEdit";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";

type CorrectOp = "dc" | "peak" | "balance" | "silence" | "hum" | "width";

const OP_SUBTITLE: Record<CorrectOp, string> = {
  dc: "DC offset",
  peak: "Peak safety",
  balance: "Channel balance",
  silence: "Silence trim",
  hum: "Mains hum",
  width: "Stereo width",
};

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
  const [op, setOp] = useState<CorrectOp>("dc");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [planar, setPlanar] = useState<Float32Array[] | null>(null);
  const [sampleRate, setSampleRate] = useState(48000);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [correctedUrl, setCorrectedUrl] = useState<string | null>(null);
  const [bypass, setBypass] = useState(false);

  useRegisterAppBar({ title: "Correct", subtitle: OP_SUBTITLE[op] }, [op]);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (correctedUrl) URL.revokeObjectURL(correctedUrl);
    };
  }, [originalUrl, correctedUrl]);

  const activeUrl = bypass ? originalUrl : correctedUrl;

  const metrics = useMemo(() => {
    if (!preview) return null;
    return bypass ? preview.before : preview.after;
  }, [bypass, preview]);

  function runOp(channels: Float32Array[], rate: number, chosen: CorrectOp) {
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
    } else {
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
    }

    const outBuf = bufferFromPlanar(result.channels, rate);
    const wav = encodeWav(outBuf);
    setCorrectedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(wav);
    });
    setPreview(result.preview);
    setBypass(false);
  }

  async function onFile(file: File | undefined) {
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
      showToast("Correction preview ready — bypass toggles original");
    } catch {
      showToast("Couldn't decode that file");
      setPreview(null);
      setPlanar(null);
    } finally {
      setBusy(false);
    }
  }

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="dc-offset-correct">
      <p className="mb-4 text-[13px] text-white/45">
        M6 corrections: DC, peak-safety, L/R balance, silence trim, mains-hum, or stereo width
        (auto mid/side). Bypass keeps the original. No credits charged.
      </p>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Correction operation">
        <button
          type="button"
          data-testid="correct-op-dc"
          aria-pressed={op === "dc"}
          onClick={() => onSelectOp("dc")}
          className={`btn px-3 py-2 text-sm ${op === "dc" ? "btn-primary" : "btn-ghost"}`}
        >
          DC offset
        </button>
        <button
          type="button"
          data-testid="correct-op-peak"
          aria-pressed={op === "peak"}
          onClick={() => onSelectOp("peak")}
          className={`btn px-3 py-2 text-sm ${op === "peak" ? "btn-primary" : "btn-ghost"}`}
        >
          Peak safety
        </button>
        <button
          type="button"
          data-testid="correct-op-balance"
          aria-pressed={op === "balance"}
          onClick={() => onSelectOp("balance")}
          className={`btn px-3 py-2 text-sm ${op === "balance" ? "btn-primary" : "btn-ghost"}`}
        >
          Channel balance
        </button>
        <button
          type="button"
          data-testid="correct-op-silence"
          aria-pressed={op === "silence"}
          onClick={() => onSelectOp("silence")}
          className={`btn px-3 py-2 text-sm ${op === "silence" ? "btn-primary" : "btn-ghost"}`}
        >
          Silence trim
        </button>
        <button
          type="button"
          data-testid="correct-op-hum"
          aria-pressed={op === "hum"}
          onClick={() => onSelectOp("hum")}
          className={`btn px-3 py-2 text-sm ${op === "hum" ? "btn-primary" : "btn-ghost"}`}
        >
          Mains hum
        </button>
        <button
          type="button"
          data-testid="correct-op-width"
          aria-pressed={op === "width"}
          onClick={() => onSelectOp("width")}
          className={`btn px-3 py-2 text-sm ${op === "width" ? "btn-primary" : "btn-ghost"}`}
        >
          Stereo width
        </button>
      </div>

      <label className="btn btn-primary mb-5 cursor-pointer px-4 py-2.5 text-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Load audio
        <input
          type="file"
          accept={AUDIO_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onFile(f);
          }}
        />
      </label>

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="correct-bypass"
              aria-pressed={bypass}
              onClick={() => setBypass((v) => !v)}
              className={`btn px-3 py-2 text-sm ${bypass ? "btn-primary" : "btn-ghost"}`}
            >
              {bypass ? "Bypass on · original" : "Bypass off · corrected"}
            </button>
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
            </span>
          </div>

          {activeUrl && (
            <audio key={activeUrl} controls src={activeUrl} className="w-full" data-testid="correct-player" />
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3" data-testid="correct-metrics">
            <div>
              <dt className="text-[10px] uppercase text-white/35">{preview.detailLabel}</dt>
              <dd className="tabular-nums">{preview.detailValue}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Peak (active)</dt>
              <dd className="tabular-nums">{fmtDb(metrics?.peakDbfs)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">RMS (active)</dt>
              <dd className="tabular-nums">{fmtDb(metrics?.rmsDbfs)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Peak before</dt>
              <dd className="tabular-nums">{fmtDb(preview.before.peakDbfs)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Peak after</dt>
              <dd className="tabular-nums">{fmtDb(preview.after.peakDbfs)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Listening</dt>
              <dd>{bypass ? "Original (bypass)" : "Corrected"}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
