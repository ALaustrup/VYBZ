import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileAudio, Loader2, Save, Upload } from "lucide-react";
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
import { setWorkingTrack, workingTrackAsFile } from "@/features/workspace/workingSet";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";
import {
  MetadataLibraryRail,
  type LibrarySelection,
} from "@/features/tools/MetadataLibraryRail";
import {
  draftFromDrop,
  loadDropMetadataMany,
  saveDropMetadata,
} from "@/features/tools/dropMetadataApi";

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
  const { showToast, profile } = useSession();
  const [localDraft, setLocalDraft] = useState<MetadataDraft>(emptyMetadataDraft);
  const [busy, setBusy] = useState(false);

  /** Null while drafting against a dropped file; set once a library track is open. */
  const [selection, setSelection] = useState<LibrarySelection | null>(null);
  const [drafts, setDrafts] = useState<Record<string, MetadataDraft>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, true>>({});
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [saving, setSaving] = useState(false);

  const draft = (activeId ? drafts[activeId] : undefined) ?? localDraft;

  useRegisterAppBar({ title: "Metadata", subtitle: "Editor" }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLocalDraft({ ...emptyMetadataDraft(), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  function patch<K extends keyof MetadataDraft>(key: K, value: MetadataDraft[K]) {
    if (activeId) {
      const id = activeId;
      setDrafts((all) => ({ ...all, [id]: { ...all[id], [key]: value } }));
      setDirty((d) => (d[id] ? d : { ...d, [id]: true }));
      return;
    }
    setLocalDraft((d) => ({ ...d, [key]: value }));
  }

  /**
   * Open a whole album at once. Metadata for every track is fetched in one
   * round trip so switching between them is instant rather than a spinner each.
   */
  const openSelection = useCallback(async (next: LibrarySelection) => {
    setSelection(next);
    setLoadingTracks(true);
    setDirty({});
    try {
      const ids = next.drops.map((d) => d.id);
      const saved = await loadDropMetadataMany(ids);
      const built: Record<string, MetadataDraft> = {};
      for (const drop of next.drops) built[drop.id] = draftFromDrop(drop, saved.get(drop.id));
      setDrafts(built);
      setActiveId(next.drops[0]?.id ?? null);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  async function saveTracks(ids: string[]) {
    if (!ids.length || saving) return;
    setSaving(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        const d = drafts[id];
        if (!d) continue;
        const res = await saveDropMetadata(id, d);
        if (res.ok) {
          ok++;
          setDirty((prev) => {
            const { [id]: _drop, ...rest } = prev;
            return rest;
          });
        } else {
          failed++;
        }
      }
    } finally {
      setSaving(false);
    }
    if (failed > 0) {
      showToast(`Saved ${ok} · ${failed} failed`);
    } else {
      showToast(ok === 1 ? "Track saved" : `${ok} tracks saved`);
    }
  }

  /** Route a whole-draft change to the open track, or to the local file draft. */
  function updateDraft(fn: (d: MetadataDraft) => MetadataDraft) {
    if (activeId) {
      const id = activeId;
      setDrafts((all) => ({ ...all, [id]: fn(all[id]) }));
      setDirty((d) => (d[id] ? d : { ...d, [id]: true }));
      return;
    }
    setLocalDraft(fn);
  }

  function backToFileDraft() {
    setSelection(null);
    setActiveId(null);
    setDrafts({});
    setDirty({});
  }

  async function onFile(file: File | undefined, source: "tool-drop" | "workspace" = "tool-drop") {
    if (!file || !isAudioFile(file)) {
      showToast("Choose an audio file");
      return;
    }
    setBusy(true);
    try {
      const tags: Id3Tags = await readId3Tags(file);
      if (tags.artworkUrl) URL.revokeObjectURL(tags.artworkUrl);
      updateDraft((d) => ({
        ...d,
        title: tags.title || titleFromFilename(file.name) || d.title,
        artist: tags.artist || d.artist,
        album: tags.album || d.album,
        genre: tags.genreMatched || tags.genre || d.genre,
        year: tags.year ? String(tags.year) : d.year,
        sourceFileName: file.name,
      }));
      if (source === "tool-drop") {
        setWorkingTrack({
          title: tags.title || titleFromFilename(file.name) || file.name,
          artistName: tags.artist || null,
          fileName: file.name,
          mimeType: file.type || "audio/wav",
          blob: file,
          source: "tool-drop",
        });
      }
      showToast("Tags imported — empty fields stay empty");
    } catch {
      showToast("Couldn't read tags from that file");
    } finally {
      setBusy(false);
    }
  }

  const working = useWorkingTrack();
  const loadedWorkingId = useRef<string | null>(null);
  useEffect(() => {
    if (!working || draft.sourceFileName || loadedWorkingId.current === working.id) return;
    const file = workingTrackAsFile(working);
    if (!file) return;
    loadedWorkingId.current = working.id;
    void onFile(file, "workspace");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from song workspace
  }, [working, draft.sourceFileName]);

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
      updateDraft(() => next);
      if (!activeId) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
      <MetadataLibraryRail
        ownerId={profile?.id}
        selectedKey={selection?.key ?? null}
        onSelect={(next) => void openSelection(next)}
      />

      {selection && (
        <section className="forge-glass relative space-y-3 !rounded-2xl p-4" data-testid="metadata-track-tabs">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[1] flex items-center justify-between gap-3">
            <p className="nexus-eyebrow">
              {selection.label} · {selection.drops.length}{" "}
              {selection.drops.length === 1 ? "track" : "tracks"}
            </p>
            <button
              type="button"
              onClick={backToFileDraft}
              className="text-[11px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
            >
              Close
            </button>
          </div>
          {loadingTracks ? (
            <p className="relative z-[1] flex items-center gap-2 text-[12px] text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tracks…
            </p>
          ) : (
            <div className="no-scrollbar relative z-[1] -mx-1 flex gap-1.5 overflow-x-auto px-1">
              {selection.drops.map((drop, i) => (
                <button
                  key={drop.id}
                  type="button"
                  onClick={() => setActiveId(drop.id)}
                  className={cx(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition",
                    activeId === drop.id
                      ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40"
                      : "bg-white/[0.04] text-white/55 hover:text-white/80",
                  )}
                >
                  <span className="tabular-nums text-white/35">{i + 1}</span>
                  <span className="max-w-[10rem] truncate">
                    {drafts[drop.id]?.title || drop.title || "Untitled"}
                  </span>
                  {dirty[drop.id] && <span className="h-1.5 w-1.5 rounded-full bg-veil-300" />}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <ForgeDropzone
        label={selection ? "Import tags into this track from a file" : "Import tags from audio"}
        hint="or click to choose · empty fields stay empty"
        accept={AUDIO_ACCEPT}
        busy={busy}
        inputTestId="metadata-audio-import"
        onFiles={(list) => void onFile(list?.[0])}
      />

      <div className="flex flex-wrap items-center gap-2">
        {selection ? (
          <>
            <button
              type="button"
              onClick={() => void saveTracks(activeId ? [activeId] : [])}
              disabled={saving || !activeId}
              data-testid="metadata-save-track"
              className="btn btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save this track
            </button>
            <button
              type="button"
              onClick={() => void saveTracks(Object.keys(dirty))}
              disabled={saving || !Object.keys(dirty).length}
              className="btn btn-ghost px-4 py-2.5 text-sm disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save {Object.keys(dirty).length || "all"} edited
            </button>
          </>
        ) : (
          <button type="button" onClick={saveDraft} className="btn btn-ghost px-4 py-2.5 text-sm">
            <Save className="h-4 w-4" /> Save draft
          </button>
        )}
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
        {selection
          ? "Saved to your library. Title, artist and album update the track itself; the rest is release metadata only you can see. Never invent ISRC/UPC."
          : "No track selected, so this draft stays on this device. Pick something from your library above to edit it for real. Never invent ISRC/UPC."}
      </p>
    </ToolWorkbench>
  );
}
