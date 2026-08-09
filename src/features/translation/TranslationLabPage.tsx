/**
 * M7 Translation Lab kickoff — streaming loudness preview (disclosed, not platform-exact).
 */

import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  STREAMING_NORM_PREVIEW_VERSION,
  STREAMING_NORM_TARGET_LUFS,
  applyStreamingNormPreview,
} from "@vybz/processing/waveform";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { decodeToBuffer, encodeWav } from "@/lib/audioEdit";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";

type Mode = "original" | "streaming";

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

export function TranslationLabPage() {
  const { showToast } = useSession();
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("original");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lufsBefore, setLufsBefore] = useState<number | null>(null);
  const [lufsAfter, setLufsAfter] = useState<number | null>(null);
  const [gainDb, setGainDb] = useState<number | null>(null);
  const [disclosure, setDisclosure] = useState<string | null>(null);

  useRegisterAppBar({ title: "Translation Lab", subtitle: "Streaming preview" }, []);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [originalUrl, previewUrl]);

  async function onFile(file: File | undefined) {
    if (!file || !isAudioFile(file)) {
      showToast("Choose an audio file");
      return;
    }
    setBusy(true);
    try {
      const buf = await decodeToBuffer(file);
      const planar = planarFromBuffer(buf);
      const r = applyStreamingNormPreview(planar, buf.sampleRate);
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setOriginalUrl(URL.createObjectURL(file));
      setPreviewUrl(URL.createObjectURL(encodeWav(bufferFromPlanar(r.channels, buf.sampleRate))));
      setFileName(file.name);
      setLufsBefore(r.integratedLufsBefore);
      setLufsAfter(r.integratedLufsAfter);
      setGainDb(r.gainDb);
      setDisclosure(r.disclosure);
      setMode("streaming");
      showToast("Streaming normalisation preview ready");
    } catch {
      showToast("Couldn't decode that file");
      setLufsBefore(null);
      setLufsAfter(null);
    } finally {
      setBusy(false);
    }
  }

  const activeUrl = mode === "original" ? originalUrl : previewUrl;

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="translation-lab">
      <p className="mb-4 text-[13px] text-white/45">
        M7 kickoff: hear an approximate streaming loudness sit at {STREAMING_NORM_TARGET_LUFS}{" "}
        LUFS. Simulations are labelled — not exact platform processing.
      </p>

      <label className="btn btn-primary mb-5 cursor-pointer px-4 py-2.5 text-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Load master
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

      {previewUrl && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Translation preview">
            <button
              type="button"
              data-testid="translate-mode-original"
              aria-pressed={mode === "original"}
              onClick={() => setMode("original")}
              className={`btn px-3 py-2 text-sm ${mode === "original" ? "btn-primary" : "btn-ghost"}`}
            >
              Original
            </button>
            <button
              type="button"
              data-testid="translate-mode-streaming"
              aria-pressed={mode === "streaming"}
              onClick={() => setMode("streaming")}
              className={`btn px-3 py-2 text-sm ${mode === "streaming" ? "btn-primary" : "btn-ghost"}`}
            >
              Streaming −14
            </button>
            <span className="text-[11px] text-white/35">
              {fileName} · {STREAMING_NORM_PREVIEW_VERSION}
            </span>
          </div>

          {activeUrl && (
            <audio key={activeUrl} controls src={activeUrl} className="w-full" data-testid="translate-player" />
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3" data-testid="translate-metrics">
            <div>
              <dt className="text-[10px] uppercase text-white/35">Integrated before</dt>
              <dd className="tabular-nums">
                {lufsBefore == null ? "Not measured" : `${lufsBefore.toFixed(1)} LUFS`}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Integrated after</dt>
              <dd className="tabular-nums">
                {lufsAfter == null ? "Not measured" : `${lufsAfter.toFixed(1)} LUFS`}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Preview gain</dt>
              <dd className="tabular-nums">
                {gainDb == null ? "Not measured" : `${gainDb >= 0 ? "+" : ""}${gainDb.toFixed(1)} dB`}
              </dd>
            </div>
          </dl>

          {disclosure && (
            <p className="text-[12px] text-amber-200/80" data-testid="translate-disclosure">
              {disclosure}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
