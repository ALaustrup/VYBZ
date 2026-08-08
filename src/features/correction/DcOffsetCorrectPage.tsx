/**
 * M6 kickoff — DC offset correction preview (bypass + before/after metrics).
 * No credit deduction. Local-only; download is optional WAV.
 */

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { CORRECTION_VERSION, removeDcOffset, type DcRemoveResult } from "@vybz/processing/waveform";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { decodeToBuffer, encodeWav } from "@/lib/audioEdit";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";

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
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<DcRemoveResult | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [correctedUrl, setCorrectedUrl] = useState<string | null>(null);
  const [bypass, setBypass] = useState(false);

  useRegisterAppBar({ title: "Correct", subtitle: "DC offset" }, []);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (correctedUrl) URL.revokeObjectURL(correctedUrl);
    };
  }, [originalUrl, correctedUrl]);

  const activeUrl = bypass ? originalUrl : correctedUrl;

  const metrics = useMemo(() => {
    if (!result) return null;
    return bypass ? result.before : result.after;
  }, [bypass, result]);

  async function onFile(file: File | undefined) {
    if (!file || !isAudioFile(file)) {
      showToast("Choose an audio file");
      return;
    }
    setBusy(true);
    try {
      const buf = await decodeToBuffer(file);
      const planar = planarFromBuffer(buf);
      const corrected = removeDcOffset(planar);
      const outBuf = bufferFromPlanar(corrected.channels, buf.sampleRate);
      const wav = encodeWav(outBuf);
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (correctedUrl) URL.revokeObjectURL(correctedUrl);
      setOriginalUrl(URL.createObjectURL(file));
      setCorrectedUrl(URL.createObjectURL(wav));
      setResult(corrected);
      setFileName(file.name);
      setBypass(false);
      showToast("DC correction preview ready — bypass toggles original");
    } catch {
      showToast("Couldn't decode that file");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="dc-offset-correct">
      <p className="mb-4 text-[13px] text-white/45">
        M6 kickoff: remove measured DC offset. Bypass keeps the original (reversible). Before/after
        peak and RMS are measured on-device. No credits charged. Proc {CORRECTION_VERSION}.
      </p>

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

      {result && (
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
                download={`${fileName.replace(/\.[^.]+$/, "") || "vybz"}-dc-fixed.wav`}
                className="btn btn-ghost px-3 py-2 text-sm"
                data-testid="correct-download"
              >
                <Download className="h-4 w-4" /> Download corrected WAV
              </a>
            )}
            <span className="text-[11px] text-white/35">{fileName}</span>
          </div>

          {activeUrl && (
            <audio key={activeUrl} controls src={activeUrl} className="w-full" data-testid="correct-player" />
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3" data-testid="correct-metrics">
            <div>
              <dt className="text-[10px] uppercase text-white/35">Removed mean</dt>
              <dd className="tabular-nums">{result.removedMean.toExponential(3)}</dd>
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
              <dt className="text-[10px] uppercase text-white/35">DC before</dt>
              <dd className="tabular-nums">{result.before.dc?.mean.toExponential(3) ?? "Not measured"}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">DC after</dt>
              <dd className="tabular-nums">{result.after.dc?.mean.toExponential(3) ?? "Not measured"}</dd>
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
