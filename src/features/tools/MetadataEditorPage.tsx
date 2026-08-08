import { useEffect, useState } from "react";
import { FileAudio, Loader2, Save } from "lucide-react";
import { readId3Tags, titleFromFilename, type Id3Tags } from "@/lib/id3Tags";
import { AUDIO_ACCEPT, isAudioFile } from "@/lib/waveform";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

const STORAGE_KEY = "vybz.metadataEditor.draft.v1";

export type MetadataDraft = {
  title: string;
  artist: string;
  album: string;
  trackNumber: string;
  year: string;
  genre: string;
  isrc: string;
  upc: string;
  catalogNumber: string;
  copyright: string;
  publisher: string;
  songwriter: string;
  producer: string;
  mixer: string;
  masteringEngineer: string;
  language: string;
  sourceFileName?: string;
};

function emptyDraft(): MetadataDraft {
  return {
    title: "",
    artist: "",
    album: "",
    trackNumber: "",
    year: "",
    genre: "",
    isrc: "",
    upc: "",
    catalogNumber: "",
    copyright: "",
    publisher: "",
    songwriter: "",
    producer: "",
    mixer: "",
    masteringEngineer: "",
    language: "",
  };
}

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
  const [draft, setDraft] = useState<MetadataDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);

  useRegisterAppBar({ title: "Metadata", subtitle: "Editor" }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft({ ...emptyDraft(), ...JSON.parse(raw) });
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 pb-28" data-testid="metadata-editor">
      <p className="mb-4 text-[13px] text-white/45">
        Edit release metadata. Import from a master file when tags exist — never invent ISRC/UPC.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="btn btn-primary cursor-pointer px-4 py-2.5 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileAudio className="h-4 w-4" />}
          Import from audio
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
        <button type="button" onClick={saveDraft} className="btn btn-ghost px-4 py-2.5 text-sm">
          <Save className="h-4 w-4" /> Save draft
        </button>
        {draft.sourceFileName && (
          <span className="text-[11px] text-white/35">Source · {draft.sourceFileName}</span>
        )}
      </div>

      <section className="mb-6 space-y-3">
        <p className="nexus-eyebrow">Core</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" value={draft.title} onChange={(v) => patch("title", v)} />
          <Field label="Artist" value={draft.artist} onChange={(v) => patch("artist", v)} />
          <Field label="Album" value={draft.album} onChange={(v) => patch("album", v)} />
          <Field label="Track #" value={draft.trackNumber} onChange={(v) => patch("trackNumber", v)} />
          <Field label="Year" value={draft.year} onChange={(v) => patch("year", v)} />
          <Field label="Genre" value={draft.genre} onChange={(v) => patch("genre", v)} />
          <Field label="Language" value={draft.language} onChange={(v) => patch("language", v)} placeholder="en" />
        </div>
      </section>

      <section className="mb-6 space-y-3">
        <p className="nexus-eyebrow">Identifiers</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ISRC" value={draft.isrc} onChange={(v) => patch("isrc", v.toUpperCase())} placeholder="Only if you have one" />
          <Field label="UPC / EAN" value={draft.upc} onChange={(v) => patch("upc", v)} />
          <Field label="Catalog #" value={draft.catalogNumber} onChange={(v) => patch("catalogNumber", v)} />
        </div>
      </section>

      <section className="mb-6 space-y-3">
        <p className="nexus-eyebrow">Credits</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Songwriter" value={draft.songwriter} onChange={(v) => patch("songwriter", v)} />
          <Field label="Producer" value={draft.producer} onChange={(v) => patch("producer", v)} />
          <Field label="Mixer" value={draft.mixer} onChange={(v) => patch("mixer", v)} />
          <Field label="Mastering engineer" value={draft.masteringEngineer} onChange={(v) => patch("masteringEngineer", v)} />
        </div>
      </section>

      <section className="space-y-3">
        <p className="nexus-eyebrow">Rights</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Copyright" value={draft.copyright} onChange={(v) => patch("copyright", v)} placeholder="© 2026 …" />
          <Field label="Publisher" value={draft.publisher} onChange={(v) => patch("publisher", v)} />
        </div>
      </section>

      <p className={cx("mt-6 text-[11px] text-white/30")}>
        Drafts stay on this device. Cloud write-back to assets lands when release schema is wired.
      </p>
    </div>
  );
}
