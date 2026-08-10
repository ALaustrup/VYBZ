/**
 * M7 Translation Lab — streaming loudness + phone/car + lossy codec previews (disclosed).
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Pause, Play, Upload } from "lucide-react";
import {
  CODEC_TRANSLATION_VERSION,
  DEVICE_TRANSLATION_VERSION,
  STREAMING_NORM_PREVIEW_VERSION,
  STREAMING_NORM_TARGET_LUFS,
  applyCodecTranslationPreview,
  applyDeviceTranslationPreview,
  applyStreamingNormPreview,
  evaluateTranslationFindings,
  type TranslationFinding,
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
import { shipAutoFixForCode } from "@/features/prepare/autoFixMap";

type Mode = "original" | "streaming" | "phone" | "car" | "lossy";

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
  const player = usePlayerShell();
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("original");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null);
  const [phoneUrl, setPhoneUrl] = useState<string | null>(null);
  const [carUrl, setCarUrl] = useState<string | null>(null);
  const [lossyUrl, setLossyUrl] = useState<string | null>(null);
  const [lufsBefore, setLufsBefore] = useState<number | null>(null);
  const [lufsAfter, setLufsAfter] = useState<number | null>(null);
  const [gainDb, setGainDb] = useState<number | null>(null);
  const [findings, setFindings] = useState<TranslationFinding[]>([]);
  const [disclosure, setDisclosure] = useState<string | null>(null);

  useRegisterAppBar({ title: "Translation Lab", subtitle: "How it travels" }, []);

  useAudioPreviewUrlCleanup(originalUrl, "translation-preview:");
  useAudioPreviewUrlCleanup(streamingUrl, "translation-preview:");
  useAudioPreviewUrlCleanup(phoneUrl, "translation-preview:");
  useAudioPreviewUrlCleanup(carUrl, "translation-preview:");
  useAudioPreviewUrlCleanup(lossyUrl, "translation-preview:");

  async function onFile(file: File | undefined) {
    if (!file || !isAudioFile(file)) {
      showToast("Choose an audio file");
      return;
    }
    setBusy(true);
    try {
      stopOwnedPlayback();
      const buf = await decodeToBuffer(file);
      const planar = planarFromBuffer(buf);
      const stream = applyStreamingNormPreview(planar, buf.sampleRate);
      const phone = applyDeviceTranslationPreview(planar, buf.sampleRate, "phone");
      const car = applyDeviceTranslationPreview(planar, buf.sampleRate, "car");
      const lossy = applyCodecTranslationPreview(planar, buf.sampleRate, "lossy");

      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (streamingUrl) URL.revokeObjectURL(streamingUrl);
      if (phoneUrl) URL.revokeObjectURL(phoneUrl);
      if (carUrl) URL.revokeObjectURL(carUrl);
      if (lossyUrl) URL.revokeObjectURL(lossyUrl);

      setOriginalUrl(URL.createObjectURL(file));
      setStreamingUrl(
        URL.createObjectURL(encodeWav(bufferFromPlanar(stream.channels, buf.sampleRate)))
      );
      setPhoneUrl(URL.createObjectURL(encodeWav(bufferFromPlanar(phone.channels, buf.sampleRate))));
      setCarUrl(URL.createObjectURL(encodeWav(bufferFromPlanar(car.channels, buf.sampleRate))));
      setLossyUrl(URL.createObjectURL(encodeWav(bufferFromPlanar(lossy.channels, buf.sampleRate))));
      setFileName(file.name);
      setLufsBefore(stream.integratedLufsBefore);
      setLufsAfter(stream.integratedLufsAfter);
      setGainDb(stream.gainDb);
      setFindings(evaluateTranslationFindings(stream));
      setDisclosure(stream.disclosure);
      setMode("streaming");
      showToast("Translation previews ready");
    } catch {
      showToast("Couldn't decode that file");
      setLufsBefore(null);
      setLufsAfter(null);
      setGainDb(null);
      setFindings([]);
    } finally {
      setBusy(false);
    }
  }

  function selectMode(next: Mode) {
    stopOwnedPlayback();
    setMode(next);
    if (next === "streaming") {
      setDisclosure(
        `Approximate streaming loudness preview (BS.1770 gain-to-target). Not an exact emulation of any platform. (${STREAMING_NORM_PREVIEW_VERSION})`
      );
    } else if (next === "phone") {
      setDisclosure(
        `Phone-style preview (high-pass + reduced bass). Approximate simulation — not a measured phone speaker. (${DEVICE_TRANSLATION_VERSION})`
      );
    } else if (next === "car") {
      setDisclosure(
        `Car-style preview (bass lift + mid scoop). Approximate simulation — not a measured cabin response. (${DEVICE_TRANSLATION_VERSION})`
      );
    } else if (next === "lossy") {
      setDisclosure(
        `Lossy-style preview (≈15 kHz bandwidth + mild quantization). Approximate simulation — not a measured MP3/AAC/Opus encode of any platform. (${CODEC_TRANSLATION_VERSION})`
      );
    } else {
      setDisclosure(null);
    }
  }

  const activeUrl =
    mode === "original"
      ? originalUrl
      : mode === "streaming"
        ? streamingUrl
        : mode === "phone"
          ? phoneUrl
          : mode === "car"
            ? carUrl
            : lossyUrl;
  const activeTrackId = activeUrl ? `translation-preview:${mode}:${activeUrl}` : null;
  const activeInVdock = player.track?.id === activeTrackId;

  function stopOwnedPlayback() {
    stopAudioPreview("translation-preview:");
  }

  function playSelectedInVdock() {
    if (!activeUrl || !activeTrackId) return;
    if (activeInVdock) {
      void toggle();
      return;
    }
    const baseName = fileName.replace(/\.[^.]+$/, "") || "Local master";
    const track = {
      id: activeTrackId,
      url: activeUrl,
      title: `${baseName} · ${mode === "original" ? "Original" : "Translation preview"}`,
      artist: "Translation Lab",
      signal:
        mode === "original"
          ? localSignal()
          : simulationSignal(disclosure ?? "Approximate translation preview"),
    };
    playTrack(track, [track]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="translation-lab">
      <p className="mb-4 text-[13px] text-white/45">
        Hear approximate streaming loudness ({STREAMING_NORM_TARGET_LUFS} LUFS), phone/car
        listening EQ, and a lossy-style codec simulation. Simulations are labelled — not exact
        platform or device processing.
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

      {streamingUrl && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Translation preview">
            <button
              type="button"
              data-testid="translate-mode-original"
              aria-pressed={mode === "original"}
              onClick={() => selectMode("original")}
              className={`btn px-3 py-2 text-sm ${mode === "original" ? "btn-primary" : "btn-ghost"}`}
            >
              Original
            </button>
            <button
              type="button"
              data-testid="translate-mode-streaming"
              aria-pressed={mode === "streaming"}
              onClick={() => selectMode("streaming")}
              className={`btn px-3 py-2 text-sm ${mode === "streaming" ? "btn-primary" : "btn-ghost"}`}
            >
              Streaming −14
            </button>
            <button
              type="button"
              data-testid="translate-mode-phone"
              aria-pressed={mode === "phone"}
              onClick={() => selectMode("phone")}
              className={`btn px-3 py-2 text-sm ${mode === "phone" ? "btn-primary" : "btn-ghost"}`}
            >
              Phone
            </button>
            <button
              type="button"
              data-testid="translate-mode-car"
              aria-pressed={mode === "car"}
              onClick={() => selectMode("car")}
              className={`btn px-3 py-2 text-sm ${mode === "car" ? "btn-primary" : "btn-ghost"}`}
            >
              Car
            </button>
            <button
              type="button"
              data-testid="translate-mode-lossy"
              aria-pressed={mode === "lossy"}
              onClick={() => selectMode("lossy")}
              className={`btn px-3 py-2 text-sm ${mode === "lossy" ? "btn-primary" : "btn-ghost"}`}
            >
              Lossy codec
            </button>
            <span className="text-[11px] text-white/35">{fileName}</span>
          </div>

          {activeUrl && (
            <button
              type="button"
              onClick={playSelectedInVdock}
              className="btn btn-primary px-4 py-2.5 text-sm"
              data-testid="translate-play-vdock"
            >
              {activeInVdock && player.playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {activeInVdock && player.playing ? "Pause VDock" : "Play selected in VDock"}
            </button>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3" data-testid="translate-metrics">
            <div>
              <dt className="text-[10px] uppercase text-white/35">Integrated before</dt>
              <dd className="tabular-nums">
                {lufsBefore == null ? "Not measured" : `${lufsBefore.toFixed(1)} LUFS`}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Streaming after</dt>
              <dd className="tabular-nums">
                {lufsAfter == null ? "Not measured" : `${lufsAfter.toFixed(1)} LUFS`}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-white/35">Streaming gain</dt>
              <dd className="tabular-nums">
                {gainDb == null ? "Not measured" : `${gainDb >= 0 ? "+" : ""}${gainDb.toFixed(1)} dB`}
              </dd>
            </div>
          </dl>

          {findings.length > 0 && (
            <section
              className="space-y-2 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4"
              data-testid="translate-findings"
              aria-label="Translation findings"
            >
              <div>
                <h2 className="text-sm font-semibold text-white">Actionable findings</h2>
                <p className="text-[11px] text-white/40">
                  Measured against this preview target. Correct assists are starting points, not platform certification.
                </p>
              </div>
              {findings.map((finding) => {
                const fix = shipAutoFixForCode(finding.code);
                return (
                  <article key={finding.code} className="rounded-xl border border-white/10 bg-black/15 p-3">
                    <h3 className="text-sm font-medium text-white">{finding.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">{finding.detail}</p>
                    {fix && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Link
                          to={`/tools/correct?op=${fix.op}`}
                          className="btn btn-ghost px-3 py-2 text-xs"
                          data-testid={`translate-correct-${fix.op}`}
                        >
                          {fix.label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        {fix.disclosure && (
                          <span className="text-[10px] text-white/35">{fix.disclosure}</span>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

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
