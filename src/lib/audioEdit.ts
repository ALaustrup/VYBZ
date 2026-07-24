// ---------------------------------------------------------------------------
// Client-side mini editor for New Drop: trim, WAV convert, video→audio extract.
// Encoding to WAV is native (PCM). MP3 target reuses source bytes only when
// already MP3 and untrimmed; otherwise we fall back to WAV so quality stays.
// ---------------------------------------------------------------------------

export type ExportFormat = "original" | "wav" | "mp3";

export interface TrimRange {
  startSec: number;
  endSec: number;
}

export interface PrepareUploadResult {
  file: File;
  format: string;
  lossless: boolean;
  durationSec: number;
  sampleRate: number;
  peaksHint?: number[];
}

const VIDEO_EXT = new Set(["mp4", "m4v", "webm", "mov", "mkv", "avi"]);

export function isVideoFile(file: File): boolean {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (VIDEO_EXT.has(ext)) return true;
  return (file.type || "").startsWith("video/");
}

function audioContext(): AudioContext {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AC();
}

/** Decode audio (or extract from video) into an AudioBuffer. */
export async function decodeToBuffer(file: File): Promise<AudioBuffer> {
  const ctx = audioContext();
  try {
    const ab = await file.arrayBuffer();
    try {
      return await ctx.decodeAudioData(ab.slice(0));
    } catch {
      if (isVideoFile(file)) return await extractAudioFromVideo(file, ctx);
      throw new Error("Could not decode this file");
    }
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

async function extractAudioFromVideo(file: File, seedCtx: AudioContext): Promise<AudioBuffer> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video"));
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (duration <= 0) throw new Error("Video has no readable duration");

    const anyVideo = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const streamFn = anyVideo.captureStream?.bind(video) ?? anyVideo.mozCaptureStream?.bind(video);
    if (!streamFn) {
      throw new Error("This browser cannot extract audio from video. Export WAV/MP3, or try Chrome/Edge.");
    }

    video.muted = false;
    const stream = streamFn();
    const audioOnly = new MediaStream(stream.getAudioTracks());
    if (audioOnly.getAudioTracks().length === 0) throw new Error("No audio track in video");
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
    if (!mime) throw new Error("Browser cannot record extracted audio");

    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(audioOnly, { mimeType: mime });
    const done = new Promise<Blob>((resolve, reject) => {
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onerror = () => reject(new Error("Audio extract failed"));
      rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });
    rec.start(250);
    await video.play();
    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
      setTimeout(resolve, Math.ceil(duration * 1000) + 800);
    });
    if (rec.state !== "inactive") rec.stop();
    video.pause();
    const blob = await done;
    const ab = await blob.arrayBuffer();
    return await seedCtx.decodeAudioData(ab.slice(0));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function sliceBuffer(buffer: AudioBuffer, range: TrimRange): AudioBuffer {
  const start = Math.max(0, Math.min(range.startSec, buffer.duration));
  const end = Math.max(start + 0.05, Math.min(range.endSec, buffer.duration));
  const rate = buffer.sampleRate;
  const startFrame = Math.floor(start * rate);
  const endFrame = Math.floor(end * rate);
  const frames = Math.max(1, endFrame - startFrame);
  const out = new AudioBuffer({
    length: frames,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: rate,
  });
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c).subarray(startFrame, startFrame + frames);
    out.copyToChannel(src, c);
  }
  return out;
}

/** Encode PCM AudioBuffer as 16-bit WAV. */
export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const header = 44;
  const ab = new ArrayBuffer(header + dataSize);
  const view = new DataView(ab);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const interleaved = new Int16Array(length * channels);
  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) channelData.push(buffer.getChannelData(c));
  let i = 0;
  for (let f = 0; f < length; f++) {
    for (let c = 0; c < channels; c++) {
      const s = Math.max(-1, Math.min(1, channelData[c][f] ?? 0));
      interleaved[i++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }
  new Uint8Array(ab, header).set(new Uint8Array(interleaved.buffer));
  return new Blob([ab], { type: "audio/wav" });
}

function needsReencode(range: TrimRange, duration: number, target: ExportFormat): boolean {
  const trimmed = range.startSec > 0.02 || range.endSec < duration - 0.02;
  if (trimmed) return true;
  return target === "wav" || target === "mp3";
}

/**
 * Build the File that will be uploaded. Trimming always re-encodes to WAV.
 * "mp3" without trim keeps an original .mp3; otherwise WAV (browser has no MP3 encoder).
 */
export async function prepareUploadFile(opts: {
  file: File;
  range: TrimRange;
  targetFormat: ExportFormat;
  baseName?: string;
}): Promise<PrepareUploadResult> {
  const buffer = await decodeToBuffer(opts.file);
  const fullDur = buffer.duration;
  const start = Math.max(0, Math.min(opts.range.startSec, fullDur));
  const end = Math.max(start + 0.05, Math.min(opts.range.endSec || fullDur, fullDur));
  const range = { startSec: start, endSec: end };
  const base = (opts.baseName || opts.file.name.replace(/\.[^.]+$/, "") || "drop").replace(/[^\w.-]+/g, "_").slice(0, 60);

  const sourceExt = (opts.file.name.split(".").pop() || "").toLowerCase();
  const isMp3 = sourceExt === "mp3" || opts.file.type === "audio/mpeg";

  if (!needsReencode(range, fullDur, opts.targetFormat) && !isVideoFile(opts.file)) {
    return {
      file: opts.file,
      format: sourceExt || "audio",
      lossless: ["wav", "aiff", "aif", "flac", "alac"].includes(sourceExt),
      durationSec: fullDur,
      sampleRate: buffer.sampleRate,
    };
  }

  // Prefer keeping original MP3 bytes when user asks for mp3 and no trim.
  if (
    opts.targetFormat === "mp3" &&
    isMp3 &&
    !isVideoFile(opts.file) &&
    range.startSec <= 0.02 &&
    range.endSec >= fullDur - 0.02
  ) {
    return {
      file: opts.file,
      format: "mp3",
      lossless: false,
      durationSec: fullDur,
      sampleRate: buffer.sampleRate,
    };
  }

  const sliced = sliceBuffer(buffer, range);
  const wav = encodeWav(sliced);
  const outName = `${base}.wav`;
  const outFile = new File([wav], outName, { type: "audio/wav" });
  return {
    file: outFile,
    format: "wav",
    lossless: true,
    durationSec: sliced.duration,
    sampleRate: sliced.sampleRate,
  };
}

export function fmtClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
