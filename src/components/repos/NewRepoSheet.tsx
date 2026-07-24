import { useCallback, useRef, useState } from "react";
import { FolderGit2, Loader2, Upload, X } from "lucide-react";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import {
  DAW_LABEL,
  formatBytes,
  walkDirectoryHandle,
  walkFileList,
  type RepoFileEntry,
  type RepoPackAnalysis,
  type RepoWalkProgress,
} from "@/lib/repoSync";
import { RepoExportHints } from "@/components/repos/RepoExportHints";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

type Step = "meta" | "folder" | "sync";

/**
 * New Music Repo — create repo metadata, then connect a local DAW project folder
 * (directory picker or drag-drop) and commit the first CAS snapshot.
 * Pass `existingProjectId` to commit into an existing repo (skip create).
 */
export function NewRepoSheet({
  onClose,
  onCreated,
  existingProjectId,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  /** When set, skip create and commit into this repo. */
  existingProjectId?: string;
}) {
  const { showToast } = useSession();
  const [step, setStep] = useState<Step>(existingProjectId ? "folder" : "meta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "collab" | "listed">("private");
  const [license, setLicense] = useState("collab-only");
  const [busy, setBusy] = useState(false);
  const [repoId, setRepoId] = useState<string | null>(existingProjectId ?? null);
  const [entries, setEntries] = useState<RepoFileEntry[]>([]);
  const [pack, setPack] = useState<RepoPackAnalysis | null>(null);
  const [daw, setDaw] = useState<string>("other");
  const [walk, setWalk] = useState<RepoWalkProgress | null>(null);
  const [phase, setPhase] = useState("");
  const [detail, setDetail] = useState("");
  const [pct, setPct] = useState<number | undefined>();
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState("Initial commit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onWalkProgress = useCallback((p: RepoWalkProgress) => setWalk(p), []);

  async function createMeta(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      const id = await api.createRepo({
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        license,
      });
      if (!id) {
        showToast("Couldn't create the repo.");
        setBusy(false);
        return;
      }
      setRepoId(id);
      setStep("folder");
      setBusy(false);
    } catch {
      showToast("Couldn't create the repo.");
      setBusy(false);
    }
  }

  async function ingestHandle(handle: FileSystemDirectoryHandle) {
    setBusy(true);
    setWalk(null);
    try {
      const result = await walkDirectoryHandle(handle, onWalkProgress);
      if (!result.entries.length) {
        showToast("No usable files found in that folder.");
        setBusy(false);
        return;
      }
      setEntries(result.entries);
      setPack(result.pack);
      setDaw(result.daw);
      if (!title.trim()) setTitle(handle.name.replace(/\s+Project$/i, "").slice(0, 80));
      setMessage(`Import · ${DAW_LABEL[result.daw]} · ${result.entries.length} files`);
      setStep("sync");
    } catch {
      showToast("Couldn't read that folder. Try Chrome/Edge desktop.");
    }
    setBusy(false);
  }

  async function pickFolder() {
    const w = window as Window & {
      showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
    };
    if (!w.showDirectoryPicker) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const handle = await w.showDirectoryPicker({ mode: "read" });
      await ingestHandle(handle);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      showToast("Folder picker cancelled or unavailable.");
    }
  }

  async function onFileInput(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const result = await walkFileList(list, onWalkProgress);
      if (!result.entries.length) {
        showToast("No usable files found.");
        setBusy(false);
        return;
      }
      setEntries(result.entries);
      setPack(result.pack);
      setDaw(result.daw);
      setMessage(`Import · ${DAW_LABEL[result.daw]} · ${result.entries.length} files`);
      setStep("sync");
    } catch {
      showToast("Couldn't read those files.");
    }
    setBusy(false);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length) await onFileInput(files);
  }

  async function runSync() {
    if (!repoId || !entries.length) return;
    setBusy(true);
    setPhase("start");
    try {
      // If meta was created without daw, we still commit; daw lives in meta jsonb
      const commitId = await api.syncRepoFolder({
        projectId: repoId,
        entries,
        message: message.trim() || "Initial commit",
        daw,
        onProgress: (ph, d, p) => {
          setPhase(ph);
          setDetail(d);
          setPct(p);
        },
      });
      if (!commitId) {
        showToast("Commit failed — check uploads and try again.");
        setBusy(false);
        return;
      }
      showToast("Repo synced.");
      onCreated(repoId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Sync failed.");
      setBusy(false);
    }
  }

  if (!FLAGS.repos) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow text-veil-200/80">Music Repos</p>
            <h2 className="font-display text-xl font-semibold text-white">
              {existingProjectId
                ? (step === "sync" ? "Commit" : "Connect folder")
                : step === "meta" ? "New Repo" : step === "folder" ? "Connect folder" : "Commit"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "meta" && (
          <form onSubmit={createMeta} className="flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Repo name"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 400))}
              rows={2}
              placeholder="What is this project?"
              className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {(["private", "collab", "listed"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cx(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition",
                    visibility === v ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:border-veil-400/60 focus:outline-none"
            >
              <option value="collab-only">License: collab only</option>
              <option value="credit-required">Credit required</option>
              <option value="free">Free to use</option>
              <option value="paid-fork">Paid fork (credits)</option>
            </select>
            <button type="submit" disabled={busy || title.trim().length < 2} className="btn btn-primary mt-1 w-full py-3">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
            </button>
          </form>
        )}

        {step === "folder" && (
          <div className="space-y-4">
            <p className="text-sm text-white/55">
              Drop your Ableton / FL / Logic project folder — we version the sound with content-addressed commits, not a blind zip.
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cx(
                "flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition",
                dragOver ? "border-veil-400/70 bg-veil-500/10" : "border-white/15 bg-white/[0.02]",
              )}
            >
              <FolderGit2 className="h-10 w-10 text-veil-200/80" />
              <p className="text-sm font-medium text-white/85">Drag project folder here</p>
              <p className="text-[12px] text-white/40">Or pick a directory on desktop Chrome / Edge</p>
              <button type="button" disabled={busy} onClick={() => void pickFolder()} className="btn btn-primary mt-2 px-5 py-2.5 text-sm">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Choose folder</>}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                // @ts-expect-error webkitdirectory is non-standard but widely supported
                webkitdirectory=""
                multiple
                onChange={(e) => void onFileInput(e.target.files)}
              />
            </div>
            {walk && (
              <p className="text-center text-[12px] text-white/45">
                Scanned {walk.scanned} · kept {walk.kept} · skipped {walk.skipped} · {formatBytes(walk.bytes)}
              </p>
            )}
            <button type="button" onClick={() => repoId && onCreated(repoId)} className="w-full text-center text-[12px] text-white/40 hover:text-white/70">
              Skip for now — open empty repo
            </button>
          </div>
        )}

        {step === "sync" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-sm font-medium text-white">
                {DAW_LABEL[(daw as keyof typeof DAW_LABEL) ?? "other"] ?? daw}
              </p>
              <p className="mt-1 text-[12px] text-white/45">
                {entries.length} files · {formatBytes(entries.reduce((s, e) => s + e.size, 0))}
              </p>
            </div>
            {pack && <RepoExportHints pack={pack} />}
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="Commit message"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
            {busy && (
              <div className="space-y-1.5">
                <p className="text-[12px] text-white/55">{detail || phase}</p>
                {pct != null && (
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-veil-400/80 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )}
            <button type="button" disabled={busy} onClick={() => void runSync()} className="btn btn-primary w-full py-3">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commit to main"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
