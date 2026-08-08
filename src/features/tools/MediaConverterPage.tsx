import { useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { decodeToBuffer, encodeWav, isVideoFile } from "@/lib/audioEdit";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";

type Row = {
  id: string;
  file: File;
  status: "ready" | "working" | "done" | "error";
  outUrl?: string;
  outName?: string;
  error?: string;
  sampleRate?: number;
  durationSec?: number;
};

/**
 * Media Converter v1 — decode → 16-bit WAV (honest matrix).
 * MP3 encode is not offered; browser has no MP3 encoder (see audioEdit).
 */
export function MediaConverterPage() {
  const { showToast } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [targetRate, setTargetRate] = useState<44100 | 48000 | 0>(0);

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

  async function convertOne(row: Row) {
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, status: "working" } : r)));
    try {
      let buffer = await decodeToBuffer(row.file);
      if (targetRate && buffer.sampleRate !== targetRate) {
        buffer = await resampleBuffer(buffer, targetRate);
      }
      const blob = encodeWav(buffer);
      const base = row.file.name.replace(/\.[^.]+$/, "") || "audio";
      const outName = `${base}_${buffer.sampleRate}.wav`;
      const outUrl = URL.createObjectURL(blob);
      setRows((list) =>
        list.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: "done",
                outUrl,
                outName,
                sampleRate: buffer.sampleRate,
                durationSec: buffer.duration,
              }
            : r
        )
      );
    } catch (e) {
      setRows((list) =>
        list.map((r) =>
          r.id === row.id
            ? { ...r, status: "error", error: (e as Error).message || "Failed" }
            : r
        )
      );
    }
  }

  async function convertAll() {
    const pending = rows.filter((r) => r.status === "ready" || r.status === "error");
    for (const row of pending) await convertOne(row);
    showToast("Conversion finished — download WAV files below");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="media-converter">
      <p className="mb-4 text-[13px] text-white/45">
        Convert masters to 16-bit WAV for delivery. Lossy MP3/AAC encode is not available in the
        browser — we do not fake it.
      </p>

      <label
        className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center hover:border-veil-300/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <RefreshCw className="h-7 w-7 text-veil-300/80" />
        <span className="text-sm text-white/80">Drop media or browse</span>
        <input
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-[12px] text-white/50">
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
        <button
          type="button"
          disabled={!rows.some((r) => r.status === "ready" || r.status === "error")}
          onClick={() => void convertAll()}
          className="btn btn-primary px-4 py-2 text-sm disabled:opacity-40"
        >
          Convert to WAV
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate text-white/85">{r.file.name}</p>
              <p className="text-[11px] text-white/35">
                {r.status === "working" && "Converting…"}
                {r.status === "ready" && "Ready"}
                {r.status === "error" && (r.error || "Error")}
                {r.status === "done" &&
                  `${r.sampleRate} Hz · ${r.durationSec?.toFixed(1)} s · WAV`}
              </p>
            </div>
            {r.status === "working" && <Loader2 className="h-4 w-4 animate-spin text-veil-300" />}
            {r.status === "done" && r.outUrl && (
              <a href={r.outUrl} download={r.outName} className="btn btn-ghost px-3 py-1.5 text-[12px]">
                <Download className="h-3.5 w-3.5" /> WAV
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function resampleBuffer(buffer: AudioBuffer, rate: number): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, Math.ceil(buffer.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start();
  return offline.startRendering();
}
