import { useEffect, useRef, useState } from "react";
import { Piano, Loader2, Download } from "lucide-react";
import { audioToMidi } from "@/lib/audioToMidi";
import { cx } from "@/lib/utils";

type Status = "idle" | "running" | "done" | "error";

/** Convert an audio source (URL or Blob) to a downloadable MIDI file, client-side. */
export function ExtractMidiButton({ source, title = "clip", className }: { source: string | Blob | null; title?: string; className?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [pct, setPct] = useState(0);
  const [notes, setNotes] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  async function run() {
    if (!source || status === "running") return;
    setStatus("running"); setPct(0);
    try {
      const res = await audioToMidi(source, (p) => setPct(p));
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const u = URL.createObjectURL(res.blob);
      urlRef.current = u;
      setUrl(u); setNotes(res.noteCount); setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const safe = title.replace(/[^\w.-]+/g, "_").slice(0, 40) || "clip";

  if (status === "done" && url) {
    return (
      <a href={url} download={`vybz-${safe}.mid`} className={cx("flex items-center gap-1.5 rounded-full bg-feel/20 px-3 py-1.5 text-xs font-semibold text-feel active:scale-95", className)}>
        <Download className="h-3.5 w-3.5" /> Save MIDI · {notes} notes
      </a>
    );
  }
  return (
    <button onClick={run} disabled={!source || status === "running"} title="Convert this audio to a MIDI file"
      className={cx("flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/85 active:scale-95 disabled:opacity-40", className)}>
      {status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Piano className="h-3.5 w-3.5" />}
      {status === "running" ? `Extracting… ${Math.round(pct * 100)}%` : status === "error" ? "Retry MIDI" : "Extract MIDI"}
    </button>
  );
}
