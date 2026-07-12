import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderGit2, Loader2, Plus, X, Users, GitBranch, CheckCircle2 } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { GENRES } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { ProjectSummary, ProjectStatus } from "@/types";

const STATUS_TONE: Record<ProjectStatus, string> = {
  open: "bg-white/8 text-white/60",
  "in-progress": "bg-aqua-400/15 text-aqua-200",
  released: "bg-feel/15 text-feel",
  archived: "bg-white/6 text-white/40",
};

export function ProjectsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  async function load() { setLoading(true); setItems(await api.myProjects()); setLoading(false); }
  useEffect(() => { void load(); }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-1 pt-3 max-lg:pr-14">
        <h1 className="flex-1 font-display text-xl font-bold text-gradient">Studio</h1>
        <button onClick={() => setComposing(true)} className="flex h-9 items-center gap-1.5 rounded-full bg-veil-500 px-3.5 text-sm font-semibold text-white shadow-glow active:scale-95"><Plus className="h-4 w-4" /> New</button>
      </div>
      <p className="px-4 pb-2 text-xs text-white/45">Private rooms for collaboration — versioned handoffs, agreed splits, and verified credits when you release.</p>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-1">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={FolderGit2} title="No projects yet" body="Start a project room, invite a collaborator you matched with, and track the record from first idea to released credit." />
        ) : (
          <div className="space-y-2.5">
            {items.map((p) => (
              <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="w-full rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition active:scale-[0.99] hover:border-white/15">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-display font-semibold text-white">{p.title}</p>
                  <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", STATUS_TONE[p.status])}>{p.status === "released" ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> released</span> : p.status}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-white/45">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.members}</span>
                  <span className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" />{p.versions} {p.versions === 1 ? "version" : "versions"}</span>
                  {p.isOwner && <span className="text-veil-200">owner</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {composing && <CreateForm onClose={() => setComposing(false)} onCreated={(id) => navigate(`/projects/${id}`)} />}
    </div>
  );
}

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { showToast } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggleGenre(g: string) { setGenres((x) => x.includes(g) ? x.filter((y) => y !== g) : [...x, g].slice(0, 4)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      const id = await api.createProject({
        title: title.trim(), description: description.trim() || undefined,
        bpm: bpm ? Number(bpm) : undefined, musicalKey: musicalKey.trim() || undefined, genres,
      });
      if (id) onCreated(id); else { setBusy(false); showToast("Couldn't create the project."); }
    } catch { setBusy(false); showToast("Couldn't create the project."); }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-gradient">New project</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Project title" className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 400))} rows={2} placeholder="What are we making?" className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <div className="flex gap-2">
            <input value={bpm} onChange={(e) => setBpm(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} inputMode="numeric" placeholder="BPM" className="w-24 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
            <input value={musicalKey} onChange={(e) => setMusicalKey(e.target.value.slice(0, 8))} placeholder="Key (e.g. F#m)" className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.slice(0, 12).map((g) => (
              <button type="button" key={g} onClick={() => toggleGenre(g)} className={cx("rounded-full px-2.5 py-1 text-[11px] font-medium transition", genres.includes(g) ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.04] text-white/55")}>{g}</button>
            ))}
          </div>
          <button type="submit" disabled={busy || title.trim().length < 2} className="btn btn-primary mt-1 w-full py-3">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create project"}</button>
        </form>
      </div>
    </div>
  );
}
