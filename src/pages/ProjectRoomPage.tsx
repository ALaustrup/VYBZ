import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Plus, X, Upload, GitBranch, CheckCircle2, Check,
  Rocket, PieChart, Users, FileMusic,
} from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { EmptyState } from "@/components/EmptyState";
import { ProjectChat } from "@/components/ProjectChat";
import { ROLES, craftScope } from "@/lib/profileFields";
import { cx } from "@/lib/utils";
import type { ProjectDetail, CollabMatch } from "@/types";

export function ProjectRoomPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { userId, showToast, celebrate } = useSession();
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const d = await api.projectDetail(id);
    setDetail(d); setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  if (!detail) return (
    <div className="flex h-full flex-col">
      <Header title="Studio" onBack={() => navigate("/projects")} />
      <EmptyState icon={FileMusic} title="Not available" body="This Studio project doesn't exist or you're not a member." />
    </div>
  );

  const me = detail.collaborators.find((c) => c.userId === userId);
  const total = detail.collaborators.reduce((s, c) => s + (c.split || 0), 0);
  const allAgreed = detail.collaborators.length > 0 && detail.collaborators.every((c) => c.agreed);
  const released = detail.status === "released";

  return (
    <div className="flex h-full flex-col">
      <Header title={detail.title} onBack={() => navigate("/projects")} status={detail.status} />
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-1">
        {released && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-feel/25 bg-feel/[0.08] px-3.5 py-2.5 text-sm text-feel">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Released — every agreed collaborator earned a verified credit.
          </div>
        )}
        {detail.description && <p className="mb-3 text-sm leading-relaxed text-white/75">{detail.description}</p>}
        <div className="mb-4 flex flex-wrap gap-1.5 text-[11px]">
          {detail.bpm ? <span className="rounded-full bg-white/8 px-2 py-0.5 text-white/70">{detail.bpm} BPM</span> : null}
          {detail.musicalKey ? <span className="rounded-full bg-white/8 px-2 py-0.5 text-white/70">{detail.musicalKey}</span> : null}
          {detail.genres.map((g) => <span key={g} className="rounded-full bg-veil-500/20 px-2 py-0.5 text-veil-100">{g}</span>)}
        </div>

        {/* Split sheet */}
        <SectionTitle icon={<PieChart className="h-3.5 w-3.5" />} label="Split sheet">
          <span className={cx("text-[11px] font-bold", total === 100 ? "text-feel" : "text-amber-300")}>{total}%</span>
        </SectionTitle>
        <SplitSheet detail={detail} isOwner={detail.isOwner} released={released} onChange={load} />

        {me && !me.agreed && !released && (
          <button onClick={async () => { await api.agreeSplit(id); showToast("You agreed to your split."); await load(); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-feel/15 py-2.5 text-sm font-semibold text-feel ring-1 ring-feel/25 active:scale-[0.99]">
            <Check className="h-4 w-4" /> Agree to my {me.split}% split
          </button>
        )}

        {detail.isOwner && !released && (
          <button onClick={() => setAdding(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-semibold text-white/80 active:scale-[0.99]">
            <Plus className="h-4 w-4" /> Add collaborator
          </button>
        )}

        {/* Versions */}
        <div className="mt-5">
          <SectionTitle icon={<GitBranch className="h-3.5 w-3.5" />} label="Versions" />
          {detail.versions.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-white/[0.02] px-3.5 py-3 text-xs text-white/45">No versions yet. Upload the first bundle or bounce.</p>
          ) : (
            <div className="space-y-2">
              {detail.versions.map((v) => (
                <div key={v.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-veil-500/15 font-display text-sm font-bold text-veil-100">v{v.version}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/85">{v.note || (v.format ? `${v.format.toUpperCase()} bundle` : "Version")}</p>
                    <p className="text-[11px] text-white/40">{v.uploader ?? "member"} · {new Date(v.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {me?.canUpload && !released && (
            <UploadVersion projectId={id} busy={uploading} setBusy={setUploading} onDone={load} />
          )}
        </div>

        <ProjectChat projectId={id} />

        {/* Release */}
        {detail.isOwner && !released && (
          <button
            disabled={!allAgreed || total !== 100}
            onClick={async () => { await api.releaseProject(id); celebrate("Released!"); showToast("Released — credits are now verified."); await load(); }}
            className="btn btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-40"
          >
            <Rocket className="h-4 w-4" /> {allAgreed && total === 100 ? "Release project" : "Everyone must agree · splits = 100%"}
          </button>
        )}
      </div>
      {adding && <AddCollaborator projectId={id} existing={detail.collaborators.map((c) => c.userId)} onClose={() => setAdding(false)} onAdded={async () => { setAdding(false); await load(); }} />}
    </div>
  );
}

function Header({ title, onBack, status }: { title: string; onBack: () => void; status?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 pb-1 pt-3">
      <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
      <h1 className="min-w-0 flex-1 truncate font-display text-xl font-bold text-gradient">{title}</h1>
      {status && <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/55">{status}</span>}
    </div>
  );
}

function SectionTitle({ icon, label, children }: { icon: React.ReactNode; label: string; children?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">{icon}{label}</span>
      <span className="ml-auto">{children}</span>
    </div>
  );
}

function SplitSheet({ detail, isOwner, released, onChange }: { detail: ProjectDetail; isOwner: boolean; released: boolean; onChange: () => Promise<void> }) {
  const { showToast } = useSession();
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const value = (userId: string, fallback: number) => edits[userId] ?? fallback;
  const dirty = Object.keys(edits).length > 0;

  async function save() {
    setSaving(true);
    try {
      for (const c of detail.collaborators) {
        const v = edits[c.userId];
        if (v !== undefined && v !== c.split) await api.setSplit(detail.id, c.userId, v, c.role ?? undefined);
      }
      setEdits({}); showToast("Splits updated — collaborators re-agree."); await onChange();
    } catch { showToast("Couldn't update splits."); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-1.5">
      {detail.collaborators.map((c) => (
        <div key={c.userId} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white/90">{c.username ?? "creator"}{c.userId === detail.ownerId && <span className="ml-1.5 text-[10px] font-normal text-veil-200">owner</span>}</p>
            {c.role && <p className="text-[11px] text-white/45">{c.role}</p>}
          </div>
          {c.agreed
            ? <span className="flex items-center gap-1 text-[11px] font-semibold text-feel"><CheckCircle2 className="h-3.5 w-3.5" /> agreed</span>
            : <span className="text-[11px] text-amber-300/80">pending</span>}
          {isOwner && !released ? (
            <div className="flex items-center gap-0.5">
              <input
                type="number" min={0} max={100} value={value(c.userId, c.split)}
                onChange={(e) => setEdits((x) => ({ ...x, [c.userId]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                className="w-14 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-right text-sm text-white focus:border-veil-400/60 focus:outline-none"
              />
              <span className="text-xs text-white/45">%</span>
            </div>
          ) : (
            <span className="w-14 text-right text-sm font-semibold text-white/85">{c.split}%</span>
          )}
        </div>
      ))}
      {isOwner && !released && dirty && (
        <button onClick={save} disabled={saving} className="mt-1 w-full rounded-xl bg-veil-500/20 py-2 text-xs font-semibold text-veil-100 active:scale-[0.99]">{saving ? "Saving…" : "Update splits"}</button>
      )}
    </div>
  );
}

function UploadVersion({ projectId, busy, setBusy, onDone }: { projectId: string; busy: boolean; setBusy: (b: boolean) => void; onDone: () => Promise<void> }) {
  const { showToast } = useSession();
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const ok = await api.addVersion(projectId, file, file.name, note.trim() || undefined);
      if (ok) { setNote(""); showToast("Version uploaded."); await onDone(); }
      else showToast("Upload failed.");
    } catch { showToast("Upload failed."); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))} placeholder="Version note (optional)" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
      <input ref={fileRef} type="file" onChange={onFile} className="hidden" id="version-file" />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-veil-500 px-3.5 py-2 text-sm font-semibold text-white shadow-glow active:scale-95 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
      </button>
    </div>
  );
}

function AddCollaborator({ projectId, existing, onClose, onAdded }: { projectId: string; existing: string[]; onClose: () => void; onAdded: () => Promise<void> }) {
  const navigate = useNavigate();
  const { showToast, profile } = useSession();
  const craft = craftScope(profile?.profile?.profession);
  const [matches, setMatches] = useState<CollabMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [role, setRole] = useState(ROLES[0].id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.collabMatches(40, craft).then((m) => {
      setMatches(m.filter((x) => !existing.includes(x.userId)));
      setLoading(false);
    });
  }, [existing, craft]);

  async function add() {
    if (!picked) return;
    setBusy(true);
    try { await api.addCollaborator(projectId, picked, role); showToast("Collaborator added."); await onAdded(); }
    catch { setBusy(false); showToast("Couldn't add collaborator."); }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-gradient">Add collaborator</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass"><X className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No candidates"
            body="Find complementary musicians first — then add anyone you match with here."
            action={
              <button type="button" onClick={() => navigate("/connect")} className="btn btn-primary mt-1 h-9 px-4 py-0 text-xs">
                Open Find
              </button>
            }
          />
        ) : (
          <>
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {matches.map((m) => (
                <button key={m.userId} onClick={() => setPicked(m.userId)} className={cx("flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition", picked === m.userId ? "border-veil-400/60 bg-veil-500/15" : "border-white/8 bg-white/[0.03]")}>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/90">{m.username ?? "creator"}</span>
                  {m.offersYouSeek.length > 0 && <span className="truncate text-[11px] text-aqua-200">{m.offersYouSeek.slice(0, 2).join(", ")}</span>}
                  {picked === m.userId && <Check className="h-4 w-4 shrink-0 text-veil-200" />}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs font-semibold text-white/60">Role on this project</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white">
              {ROLES.map((r) => <option key={r.id} value={r.id} className="bg-ink-900">{r.label}</option>)}
            </select>
            <button onClick={add} disabled={!picked || busy} className="btn btn-primary mt-3 w-full py-3 disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to project"}</button>
          </>
        )}
      </div>
    </div>
  );
}
