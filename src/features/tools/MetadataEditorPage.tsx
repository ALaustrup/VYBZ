import { useEffect, useState } from "react";
import { Download, FileAudio, Loader2, Save, Upload } from "lucide-react";
import { ForgeDropzone, ToolWorkbench } from "@/components/ToolWorkbench";
import { readId3Tags, titleFromFilename, type Id3Tags } from "@/lib/id3Tags";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import {
  emptyMetadataDraft,
  parseMetadataDraftJson,
  serializeMetadataDraft,
  type MetadataDraft,
} from "@/features/tools/metadataDraft";

const STORAGE_KEY = "vybz.metadataEditor.draft.v1";

export type { MetadataDraft };

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wide text-white/35">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-veil-400/50 focus:outline-none"
      />
    </label>
  );
}

/**
 * Metadata Editor — release-grade fields; import tags from a file; local draft save.
 * Does not fabricate values (Law 1).
 */
export function MetadataEditorPage() {
  const { showToast } = useSession();
  const [draft, setDraft] = useState<MetadataDraft>(emptyMetadataDraft);
  const [busy, setBusy] = useState(false);

  useRegisterAppBar({ title: "Metadata", subtitle: "Editor" }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft({ ...emptyMetadataDraft(), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  function patch<K extends keyof MetadataDraft>(key: K, value: MetadataDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function onFile(file: File | undefined) {
    if (!file || !isAudioFile(file)) {
      showToast("Choose an audio file");
      return;
    }
    setBusy(true);
    try {
      const tags: Id3Tags = await readId3Tags(file);
      if (tags.artworkUrl) URL.revokeObjectURL(tags.artworkUrl);
      setDraft((d) => ({
        ...d,
        title: tags.title || titleFromFilename(file.name) || d.title,
        artist: tags.artist || d.artist,
        album: tags.album || d.album,
        genre: tags.genreMatched || tags.genre || d.genre,
        year: tags.year ? String(tags.year) : d.year,
        sourceFileName: file.name,
      }));
      showToast("Tags imported — empty fields stay empty");
    } catch {
      showToast("Couldn't read tags from that file");
    } finally {
      setBusy(false);
    }
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    showToast("Draft saved on this device");
  }

  function downloadJson() {
    const blob = new Blob([serializeMetadataDraft(draft)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(draft.title || "vybz-metadata").replace(/[^\w.-]+/g, "_").slice(0, 40)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Draft JSON downloaded");
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const next = parseMetadataDraftJson(text);
      setDraft(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      showToast("Draft loaded from JSON");
    } catch {
      showToast("Not a valid VYBZ metadata draft");
    }
  }

  return (
    <ToolWorkbench
      eyebrow="Metadata"
      title="Release fields"
      subtitle="Import tags from a master when they exist — never invent ISRC/UPC."
      testId="metadata-editor"
    >
      <ForgeDropzone
        label="Import tags from audio"
        hint="or click to choose · empty fields stay empty"
        accept={AUDIO_ACCEPT}
        busy={busy}
        inputTestId="metadata-audio-import"
        onFiles={(list) => void onFile(list?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={saveDraft} className="btn btn-ghost px-4 py-2.5 text-sm">
          <Save className="h-4 w-4" /> Save draft
        </button>
        <button
          type="button"
          data-testid="metadata-json-download"
          onClick={downloadJson}
          className="btn btn-ghost px-4 py-2.5 text-sm"
        >
          <Download className="h-4 w-4" /> Export JSON
        </button>
        <label className="btn btn-ghost cursor-pointer px-4 py-2.5 text-sm" data-testid="metadata-json-upload">
          <Upload className="h-4 w-4" /> Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              void importJson(f);
            }}
          />
        </label>
        {draft.sourceFileName && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/35">
            <FileAudio className="h-3.5 w-3.5" />
            Source · {draft.sourceFileName}
          </span>
        )}
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-white/40" /> : null}
      </div>

      <section className="forge-glass relative space-y-3 !rounded-2xl p-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <p className="relative z-[1] nexus-eyebrow">Core</p>
        <div className="relative z-[1] grid gap-3 sm:grid-cols-2">
          <Field label="Title" value={draft.title} onChange={(v) => patch("title", v)} />
          <Field label="Artist" value={draft.artist} onChange={(v) => patch("artist", v)} />
          <Field label="Album" value={draft.album} onChange={(v) => patch("album", v)} />
          <Field label="Track #" value={draft.trackNumber} onChange={(v) => patch("trackNumber", v)} />
          <Field label="Year" value={draft.year} onChange={(v) => patch("year", v)} />
          <Field label="Genre" value={draft.genre} onChange={(v) => patch("genre", v)} />
          <Field label="Language" value={draft.language} onChange={(v) => patch("language", v)} placeholder="en" />
        </div>
      </section>

      <section className="forge-glass relative space-y-3 !rounded-2xl p-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <p className="relative z-[1] nexus-eyebrow">Identifiers</p>
        <div className="relative z-[1] grid gap-3 sm:grid-cols-2">
          <Field label="ISRC" value={draft.isrc} onChange={(v) => patch("isrc", v.toUpperCase())} placeholder="Only if you have one" />
          <Field label="UPC / EAN" value={draft.upc} onChange={(v) => patch("upc", v)} />
          <Field label="Catalog #" value={draft.catalogNumber} onChange={(v) => patch("catalogNumber", v)} />
        </div>
      </section>

      <section className="forge-glass relative space-y-3 !rounded-2xl p-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <p className="relative z-[1] nexus-eyebrow">Credits</p>
        <div className="relative z-[1] grid gap-3 sm:grid-cols-2">
          <Field label="Songwriter" value={draft.songwriter} onChange={(v) => patch("songwriter", v)} />
          <Field label="Producer" value={draft.producer} onChange={(v) => patch("producer", v)} />
          <Field label="Mixer" value={draft.mixer} onChange={(v) => patch("mixer", v)} />
          <Field label="Mastering engineer" value={draft.masteringEngineer} onChange={(v) => patch("masteringEngineer", v)} />
        </div>
      </section>

      <section className="forge-glass relative space-y-3 !rounded-2xl p-4">
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <p className="relative z-[1] nexus-eyebrow">Rights</p>
        <div className="relative z-[1] grid gap-3 sm:grid-cols-2">
          <Field label="Copyright" value={draft.copyright} onChange={(v) => patch("copyright", v)} placeholder="© 2026 …" />
          <Field label="Publisher" value={draft.publisher} onChange={(v) => patch("publisher", v)} />
        </div>
      </section>

      <p className={cx("text-[11px] text-white/30")}>
        Drafts stay on this device. JSON export/import is for handoff — cloud write-back lands when
        release schema is wired. Never invent ISRC/UPC.
      </p>
    </ToolWorkbench>
  );
}
