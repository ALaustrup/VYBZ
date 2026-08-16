import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { ForgeDropzone, ToolWorkbench } from "@/components/ToolWorkbench";
import { decodeToBuffer, encodeWav, isVideoFile } from "@/lib/audioEdit";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import { workingTrackAsFile } from "@/features/workspace/workingSet";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";
import {
  CONVERTER_UNAVAILABLE_ENCODE,
  encodeOpusWebm,
  encodeWav24,
  listConverterFormats,
  toMonoBuffer,
  type ConverterOutFormat,
} from "@/features/tools/converterFormats";

type Row = {
  id: string;
  file: File;
  status: "ready" | "working" | "done" | "error";
  outUrl?: string;
  outName?: string;
  outLabel?: string;
  error?: string;
  sampleRate?: number;
  durationSec?: number;
};

/**
 * OR-037 Media Converter — decode → WAV16 / WAV24 / Opus-WebM (when supported).
 * MP3/AAC/FLAC encode remain unavailable; matrix discloses that (Law 1).
 */
export function MediaConverterPage() {
  const { showToast } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [targetRate, setTargetRate] = useState<44100 | 48000 | 0>(0);
  const [outFormat, setOutFormat] = useState<ConverterOutFormat>("wav16");
  const [mono, setMono] = useState(false);
  const formats = useMemo(() => listConverterFormats(), []);

  useRegisterAppBar({ title: "Converter", subtitle: "Media" }, []);

  function addFiles(list: FileList | File[]) {
    const next: Row[] = [];
    for (const file of Array.from(list)) {
      if (!isAudioFile(file) && !isVideoFile(file)) continue;
      next.push({ id: crypto.randomUUID(), file, status: "ready" });
    }
    if (!next.length) {
      showToast("Add audio or video files");
      return;
    }
    setRows((r) => [...r, ...next]);
  }

  const working = useWorkingTrack();
  const loadedWorkingId = useRef<string | null>(null);
  useEffect(() => {
    if (!working || rows.length || loadedWorkingId.current === working.id) return;
    const file = workingTrackAsFile(working);
    if (!file) return;
    loadedWorkingId.current = working.id;
    addFiles([file]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from song workspace
  }, [working, rows.length]);

  async function convertOne(row: Row) {
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: "working" } : r)));
    try {
      let buffer = await decodeToBuffer(row.file);
      if (targetRate && buffer.sampleRate !== targetRate) {
        buffer = await resampleBuffer(buffer, targetRate);
      }
      if (mono) buffer = toMonoBuffer(buffer);

      let blob: Blob;
      let ext: string;
      let label: string;
      if (outFormat === "wav16") {
        blob = encodeWav(buffer);
        ext = "wav";
        label = "WAV 16-bit";
      } else if (outFormat === "wav24") {
        blob = encodeWav24(buffer);
        ext = "wav";
        label = "WAV 24-bit";
      } else {
        blob = await encodeOpusWebm(buffer);
        ext = "webm";
        label = "Opus/WebM";
      }

      const base = row.file.name.replace(/\.[^.]+$/, "") || "audio";
      const outName = `${base}_${buffer.sampleRate}.${ext}`;
      const outUrl = URL.createObjectURL(blob);
      setRows((list) =>
        list.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: "done",
                outUrl,
                outName,
                outLabel: label,
                sampleRate: buffer.sampleRate,
                durationSec: buffer.duration,
              }
            : r,
        ),
      );
    } catch (e) {
      setRows((list) =>
        list.map((r) =>
          r.id === row.id
            ? { ...r, status: "error", error: (e as Error).message || "Failed" }
            : r,
        ),
      );
    }
  }

  async function convertAll() {
    const pending = rows.filter((r) => r.status === "ready" || r.status === "error");
    for (const row of pending) await convertOne(row);
    showToast("Conversion finished — download files below");
  }

  const selected = formats.find((f) => f.id === outFormat);

  return (
    <ToolWorkbench
      eyebrow="Converter"
      title="Media converter"
      subtitle="Decode audio/video to browser-honest outputs. We never fake MP3 or AAC encode."
      testId="media-converter"
    >
      <ForgeDropzone
        label="Drop media to convert"
        hint="or click to choose · wav/aiff/flac/mp3/ogg/m4a/opus + video · multiple OK"
        accept={AUDIO_ACCEPT}
        multiple
        inputTestId="media-converter-input"
        onFiles={(list) => {
          if (list) addFiles(list);
        }}
      />

      <div
        className="forge-glass relative space-y-3 !rounded-2xl p-4"
        data-testid="converter-format-matrix"
      >
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <p className="relative z-[1] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Output format
        </p>
        <div className="relative z-[1] flex flex-wrap gap-2">
          {formats.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={!f.available}
              data-testid={`converter-format-${f.id}`}
              onClick={() => setOutFormat(f.id)}
              className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                outFormat === f.id
                  ? "border-[rgb(var(--app-accent-rgb)/0.55)] bg-[rgb(var(--app-accent-rgb)/0.15)] text-white"
                  : "border-white/12 bg-black/25 text-white/70 hover:border-white/25"
              } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              {f.label}
              {!f.available ? " · N/A" : ""}
            </button>
          ))}
        </div>
        {selected ? (
          <p className="relative z-[1] text-[12px] text-white/45" data-testid="converter-format-note">
            {selected.note}
            {selected.lossless ? " · Lossless PCM." : " · Lossy."}
          </p>
        ) : null}
        <div className="relative z-[1] border-t border-white/[0.06] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Not available to encode here
          </p>
          <ul className="mt-2 space-y-1 text-[12px] text-white/40" data-testid="converter-unavailable">
            {CONVERTER_UNAVAILABLE_ENCODE.map((f) => (
              <li key={f.id}>
                <span className="text-white/60">{f.label}</span> — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="forge-glass relative flex flex-wrap items-center gap-3 !rounded-2xl p-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <label className="relative z-[1] text-[12px] text-white/50">
          Sample rate{" "}
          <select
            value={targetRate}
            onChange={(e) => setTargetRate(Number(e.target.value) as 44100 | 48000 | 0)}
            className="ml-1 rounded-lg border border-white/10 bg-ink-900 px-2 py-1 text-white"
          >
            <option value={0}>Keep source</option>
            <option value={44100}>44.1 kHz</option>
            <option value={48000}>48 kHz</option>
          </select>
        </label>
        <label className="relative z-[1] flex items-center gap-2 text-[12px] text-white/50">
          <input
            type="checkbox"
            checked={mono}
            onChange={(e) => setMono(e.target.checked)}
            data-testid="converter-mono"
          />
          Mono downmix
        </label>
        <button
          type="button"
          disabled={!rows.some((r) => r.status === "ready" || r.status === "error") || !selected?.available}
          onClick={() => void convertAll()}
          className="relative z-[1] btn btn-primary px-4 py-2 text-sm disabled:opacity-40"
          data-testid="converter-run"
        >
          Convert
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="forge-glass relative flex items-center gap-3 !rounded-xl px-3 py-2.5 text-sm"
          >
            <span className="forge-glass-edge pointer-events-none" aria-hidden />
            <div className="relative z-[1] min-w-0 flex-1">
              <p className="truncate text-white/85">{r.file.name}</p>
              <p className="text-[11px] text-white/35">
                {r.status === "working" && "Converting…"}
                {r.status === "ready" && "Ready"}
                {r.status === "error" && (r.error || "Error")}
                {r.status === "done" &&
                  `${r.sampleRate} Hz · ${r.durationSec?.toFixed(1)} s · ${r.outLabel ?? "out"}`}
              </p>
            </div>
            {r.status === "working" && (
              <Loader2 className="relative z-[1] h-4 w-4 animate-spin text-[rgb(var(--app-accent-rgb))]" />
            )}
            {r.status === "done" && r.outUrl && (
              <a
                href={r.outUrl}
                download={r.outName}
                className="relative z-[1] btn btn-ghost px-3 py-1.5 text-[12px]"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            )}
          </li>
        ))}
      </ul>
    </ToolWorkbench>
  );
}

async function resampleBuffer(buffer: AudioBuffer, rate: number): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.duration * rate),
    rate,
  );
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start();
  return offline.startRendering();
}
