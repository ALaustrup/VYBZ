import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, Loader2, Pause, Play, Send, Trash2, X } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { Waveform } from "@/components/Waveform";
import {
  AUDIO_ACCEPT, audioMeta, computeWaveform, placeholderWaveform, qualityLabel,
  sha256Hex, acousticSignature,
} from "@/lib/waveform";
import { playTrack, usePlayer, seekFraction } from "@/lib/audioBus";
import { MUSICAL_KEYS } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { AssetKind } from "@/types";

const KINDS: { id: AssetKind; label: string }[] = [
  { id: "track", label: "Track" }, { id: "loop", label: "Loop" }, { id: "sample", label: "Sample" },
  { id: "oneshot", label: "One-shot" }, { id: "stem", label: "Stem" }, { id: "acapella", label: "Acapella" },
  { id: "midi", label: "MIDI" }, { id: "preset", label: "Preset" }, { id: "project", label: "Project" },
];
const PREVIEW_ID = "compose-preview";
// Large lossless masters are welcome; guard against absurd/accidental uploads.
const MAX_AUDIO_BYTES = 1024 * 1024 * 1024; // 1 GB
function prettyBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

interface AudioState {
  file: File; url: string; ext: string; peaks: number[];
  duration: number; format: string; lossless: boolean; sampleRate: number;
}

export function ComposeSheet({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) {
  const { showToast, celebrate } = useSession();
  const [title, setTitle] = useState("");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [audio, setAudio] = useState<AudioState | null>(null);
  const [kind, setKind] = useState<AssetKind>("track");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [license, setLicense] = useState("collab-only");
  const [decoding, setDecoding] = useState(false);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [autoDetected, setAutoDetected] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const player = usePlayer();
  const previewPlaying = player.track?.id === PREVIEW_ID && player.playing;
  const previewProgress = player.track?.id === PREVIEW_ID && (player.duration || audio?.duration)
    ? player.currentTime / (player.duration || audio!.duration) : 0;

  useEffect(() => {
    if (open) {
      setTitle(""); setSeed(Math.floor(Math.random() * 1e6)); setAudio(null);
      setKind("track"); setBpm(""); setMusicalKey(""); setLicense("collab-only"); setDecoding(false); setPosting(false); setProgress(null); setAutoDetected([]);
    }
  }, [open]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      showToast(`That file is ${prettyBytes(file.size)} — max is 1 GB.`);
      return;
    }
    setDecoding(true);
    try {
      const meta = audioMeta(file);
      const url = URL.createObjectURL(file);
      const wf = await computeWaveform(file, 800, true); // analyze → auto BPM/key
      const ext = (file.name.split(".").pop() || "audio").toLowerCase();
      setAudio({ file, url, ext, peaks: wf?.peaks ?? placeholderWaveform(seed),
        duration: wf?.duration ?? 0, format: meta.format, lossless: meta.lossless, sampleRate: wf?.sampleRate ?? 0 });
      // Pre-fill detected tempo/key (user can override); flag what was auto-filled.
      const auto: string[] = [];
      if (wf?.bpm) { setBpm(String(wf.bpm)); auto.push("tempo"); }
      if (wf?.key && MUSICAL_KEYS.includes(wf.key)) { setMusicalKey(wf.key); auto.push("key"); }
      setAutoDetected(auto);
    } catch { showToast("Couldn't read that audio."); }
    finally { setDecoding(false); }
  }

  function preview() {
    if (!audio) return;
    playTrack({ id: PREVIEW_ID, url: audio.url, title: title || "Preview", artist: "You",
      waveform: audio.peaks, durationSec: audio.duration,
      quality: qualityLabel(audio.format, audio.sampleRate, audio.lossless), lossless: audio.lossless, seed });
  }

  async function post() {
    if (!audio || posting) return;
    setPosting(true);
    setProgress(0);
    const path = await api.uploadAudio(audio.file, audio.ext, setProgress);
    setProgress(null);
    if (!path) { setPosting(false); showToast("Upload failed — check your connection."); return; }
    // Provenance: hash the original bytes + a lightweight acoustic signature.
    const [sha256, fingerprint] = await Promise.all([
      sha256Hex(audio.file).catch(() => undefined),
      acousticSignature(audio.peaks).catch(() => undefined),
    ]);
    const drop = await api.createDrop({
      title: title.trim() || undefined, seed, assetKind: kind, audioUrl: path,
      waveform: audio.peaks, durationSec: audio.duration, bpm: bpm ? Number(bpm) : undefined,
      musicalKey: musicalKey || undefined, audioFormat: audio.format, sampleRate: audio.sampleRate || undefined,
      lossless: audio.lossless, license, sha256, fingerprint,
    });
    setPosting(false);
    if (!drop) { showToast("Couldn't post that drop."); return; }
    celebrate("Your drop is live");
    onClose();
    onPosted();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[55] bg-black/75 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900/95 shadow-card backdrop-blur-2xl">
            <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-white/20" />
            <div className="flex shrink-0 items-center justify-between px-5 py-3">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">New drop</h2>
                <p className="text-[12px] text-white/40">Share a sound. Find the musicians seeking it.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>
            <div className="mx-5 h-px bg-[var(--hairline)]" />

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4">
              <div className="relative mb-4 block h-[26dvh] max-h-56 min-h-[10rem] w-full overflow-hidden rounded-2xl border border-[var(--hairline)] bg-ink-950/50">
                {audio ? (
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    <span className="flex items-center gap-1.5 self-start text-[11px] font-medium text-white/55">
                      <AudioLines className="h-3.5 w-3.5 text-veil-300" />{qualityLabel(audio.format, audio.sampleRate, audio.lossless) || "Audio"}
                    </span>
                    <button type="button" onClick={preview} aria-label={previewPlaying ? "Pause" : "Play"}
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition active:scale-90">
                      {previewPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
                    </button>
                    <Waveform peaks={audio.peaks} progress={previewProgress} accent="#a87cf8" height={40}
                      onSeek={player.track?.id === PREVIEW_ID ? (f) => seekFraction(f) : undefined} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AudioLines className="h-10 w-10 text-white/15" />
                  </div>
                )}
              </div>

              <input ref={fileRef} type="file" accept={AUDIO_ACCEPT} onChange={handleFile} className="hidden" />
              {!audio ? (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={decoding}
                  className="btn btn-primary mb-3 w-full py-3.5 disabled:opacity-60">
                  <AudioLines className="h-4 w-4" />{decoding ? "Reading…" : "Upload audio — any format, full quality"}
                </button>
              ) : (
                <div className="mb-3 space-y-3">
                  <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-[var(--hairline)]">
                    {KINDS.map((k) => (
                      <button key={k.id} type="button" onClick={() => setKind(k.id)}
                        className={cx("relative shrink-0 pb-2.5 text-xs font-medium transition",
                          kind === k.id ? "text-white" : "text-white/40 hover:text-white/70")}>
                        {k.label}
                        {kind === k.id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" inputMode="numeric" value={bpm} onChange={(e) => setBpm(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                      placeholder="BPM" className="w-24 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
                    <select value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85 focus:border-veil-400/60 focus:outline-none">
                      <option value="">Key (optional)</option>
                      {MUSICAL_KEYS.map((k) => <option key={k} value={k} className="bg-ink-900">{k}</option>)}
                    </select>
                    <button type="button" onClick={() => { setAudio(null); setAutoDetected([]); }} aria-label="Remove"
                      className="flex w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 transition active:scale-95 hover:text-wild"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {autoDetected.length > 0 && (
                    <p className="flex items-center gap-1 text-[11px] text-veil-200">
                      <AudioLines className="h-3 w-3" /> Auto-detected {autoDetected.join(" & ")} — edit if needed
                    </p>
                  )}
                  <div>
                    <p className="eyebrow mb-2">Exchange license</p>
                    <div className="flex gap-4">
                      {[["collab-only","Collab only"],["credit-required","Credit required"],["free","Free"]].map(([id,label]) => (
                        <button key={id} type="button" onClick={() => setLicense(id)}
                          className={cx("relative pb-1.5 text-[12px] font-medium transition",
                            license === id ? "text-white" : "text-white/40 hover:text-white/70")}>
                          {label}
                          {license === id && <span className="absolute inset-x-0 bottom-0 h-px bg-veil-400/70" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Name your drop…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3.5 text-[15px] text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
            </div>

            <div className="shrink-0 border-t border-[var(--hairline)] bg-ink-900/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              {progress !== null && (
                <div className="mb-2.5">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
                    <span>{progress < 100 ? "Uploading…" : "Finalizing…"}{audio ? ` · ${prettyBytes(audio.file.size)}` : ""}</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-veil-400 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              <button onClick={post} disabled={!audio || posting} className="btn btn-primary w-full py-3.5">
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Release your drop</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
