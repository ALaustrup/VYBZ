import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FolderPlus, Loader2, Plus, X } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import { ProjectView, PROJECT_KINDS, isHubKind } from "@/components/projects/ProjectView";
import { PostComposer } from "@/components/projects/PostComposer";
import type { ProfileProject, ProfileProjectDetail, ProjectKind, ProjectLink, ProjectPost } from "@/types";

const ACCENTS = ["#a87cf8", "#00e0a4", "#00a1ff", "#ff5c8a", "#ffb020", "#7c5cff", "#20d0e0", "#ff7043"];
const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none";

/**
 * Projects surface on a profile (DB: profile_projects): a tab per Project —
 * content Projects show a micro-blog post feed; hub Projects show a grid of links
 * to channels/sites or in-platform VYBZ Projects.
 */
export function ProjectsPanel({ userId, editable }: { userId: string; editable: boolean }) {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [projects, setProjects] = useState<ProfileProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProfileProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "project" | "post" | "link">(null);

  const loadProjects = useCallback(async () => {
    const list = await api.listProfileProjects(userId);
    setProjects(list);
    setActiveId((cur) => cur && list.some((p) => p.id === cur) ? cur : (list[0]?.id ?? null));
    setLoading(false);
  }, [userId]);
  useEffect(() => { void loadProjects(); }, [loadProjects]);

  const loadDetail = useCallback(async (id: string) => { setDetail(await api.getProjectDetail(id)); }, []);
  useEffect(() => { if (activeId) void loadDetail(activeId); else setDetail(null); }, [activeId, loadDetail]);

  const active = useMemo(() => projects.find((p) => p.id === activeId) ?? null, [projects, activeId]);

  async function follow(on: boolean) {
    if (!detail) return;
    setDetail({ ...detail, following: on, followers: detail.followers + (on ? 1 : -1) });
    try { await api.followProject(detail.id, on); } catch { showToast("Couldn't update follow"); }
  }
  async function likePost(post: ProjectPost, on: boolean) {
    if (!detail) return;
    setDetail({ ...detail, posts: detail.posts.map((p) => p.id === post.id ? { ...p, liked: on, likes: p.likes + (on ? 1 : -1) } : p) });
    try { await api.likePost(post.id, on); } catch { showToast("Couldn't update like"); }
  }
  async function deletePost(post: ProjectPost) {
    setDetail((d) => d ? { ...d, posts: d.posts.filter((p) => p.id !== post.id) } : d);
    try { await api.deletePost(post.id); showToast("Post deleted"); } catch { showToast("Couldn't delete"); void loadDetail(detail!.id); }
  }
  async function deleteLink(link: ProjectLink) {
    setDetail((d) => d ? { ...d, links: d.links.filter((l) => l.id !== link.id) } : d);
    try { await api.deleteProjectLink(link.id); } catch { showToast("Couldn't delete"); void loadDetail(detail!.id); }
  }
  function openLink(link: ProjectLink) {
    if (link.targetProjectId) navigate(`/p/${link.targetProjectId}`);
    else if (link.url) window.open(link.url, "_blank", "noopener,noreferrer");
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>;

  if (projects.length === 0) {
    return editable ? (
      <>
        <button onClick={() => setModal("project")} className="flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center transition hover:border-veil-400/50 active:scale-[0.99]">
          <FolderPlus className="h-8 w-8 text-veil-300" />
          <div>
            <p className="font-display text-lg font-semibold text-white">Start a Project</p>
            <p className="mt-1 text-sm text-white/50">Your aliases, bands, channels, releases — each becomes its own space you fully control.</p>
          </div>
        </button>
        <ProjectModals modal={modal} setModal={setModal} projects={projects} activeProjectId={activeId}
          onCreatedProject={async (id) => { await loadProjects(); setActiveId(id); }} onChanged={() => { if (activeId) void loadDetail(activeId); }} />
      </>
    ) : <p className="py-8 text-center text-sm text-white/40">No Projects yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        {projects.map((p) => {
          const on = p.id === activeId;
          const ac = p.accent || "#a87cf8";
          return (
            <button key={p.id} onClick={() => setActiveId(p.id)}
              className={cx("relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95", on ? "text-white" : "text-white/55 hover:text-white/85")}
              style={on ? { background: `${ac}30`, boxShadow: `inset 0 0 0 1px ${ac}80` } : undefined}>
              {p.name}
            </button>
          );
        })}
        {editable && (
          <button onClick={() => setModal("project")} className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-white/20 px-3.5 py-2 text-sm font-semibold text-white/60 transition hover:border-veil-400/60 hover:text-white active:scale-95">
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>

      {detail ? (
        <ProjectView detail={detail} editable={editable}
          onFollow={follow} onLikePost={likePost} onDeletePost={deletePost} onDeleteLink={deleteLink} onOpenLink={openLink}
          onAddPost={() => setModal("post")} onAddLink={() => setModal("link")}
          onAddWidget={async (kind, config, title) => { const ok = await api.addSpaceWidget(detail.id, kind, config, title); if (ok) { await loadDetail(detail.id); showToast("Widget added"); } else showToast("Couldn't add widget"); }}
          onRemoveWidget={async (wid) => { const ok = await api.removeSpaceWidget(wid); if (ok) await loadDetail(detail.id); }} />
      ) : <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>}

      {editable && active && (
        <button onClick={async () => { if (confirm(`Remove Project "${active.name}"?`)) { await api.archiveProject(active.id); await loadProjects(); } }}
          className="text-[12px] font-medium text-white/35 hover:text-wild">Remove this Project</button>
      )}

      <ProjectModals modal={modal} setModal={setModal} projects={projects} activeProjectId={activeId}
        onCreatedProject={async (id) => { await loadProjects(); setActiveId(id); }} onChanged={() => { if (activeId) void loadDetail(activeId); }} />

      {modal === "post" && active && (
        <PostComposer project={active} onClose={() => setModal(null)} onPosted={() => { if (activeId) void loadDetail(activeId); }} />
      )}
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────
function ProjectModals({ modal, setModal, projects, activeProjectId, onCreatedProject, onChanged }: {
  modal: null | "project" | "post" | "link";
  setModal: (m: null | "project" | "post" | "link") => void;
  projects: ProfileProject[];
  activeProjectId: string | null;
  onCreatedProject: (id: string) => void | Promise<void>;
  onChanged: () => void | Promise<void>;
}) {
  const { showToast } = useSession();

  // Add project
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProjectKind>("music");
  const [tagline, setTagline] = useState("");
  const [accent, setAccent] = useState(ACCENTS[0]);
  // Add link
  const [lLabel, setLLabel] = useState("");
  const [lMode, setLMode] = useState<"external" | "page">("external");
  const [lUrl, setLUrl] = useState("");
  const [lTarget, setLTarget] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (modal === "project") { setName(""); setKind("music"); setTagline(""); setAccent(ACCENTS[0]); }
    if (modal === "link") { setLLabel(""); setLMode("external"); setLUrl(""); setLTarget(""); }
  }, [modal]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (modal === "project") {
        if (name.trim().length < 1) return;
        const id = await api.createProfileProject({ name: name.trim(), kind, tagline: tagline.trim() || null, accent });
        showToast(`Created “${name.trim()}”`); await onCreatedProject(id);
      } else if (modal === "link" && activeProjectId) {
        if (lLabel.trim().length < 1) return;
        await api.addProjectLink({ projectId: activeProjectId, label: lLabel.trim(),
          url: lMode === "external" ? (lUrl.trim() || null) : null,
          targetProjectId: lMode === "page" ? (lTarget || null) : null });
        showToast("Link added"); await onChanged();
      }
      setModal(null);
    } catch { showToast("Something went wrong"); }
    finally { setBusy(false); }
  }

  return (
    <AnimatePresence>
      {(modal === "project" || modal === "link") && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setModal(null)} />
          <motion.div initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-panel relative z-10 w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="flex-1 font-display text-lg font-bold text-white">
                {modal === "project" ? "New Project" : "Add link"}
              </h2>
              <button onClick={() => setModal(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>

            {modal === "project" && (
              <div className="space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="Project name (alias, band, channel…)" className={inputCls} autoFocus />
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-white/60">Type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROJECT_KINDS.map((k) => (
                      <button key={k.id} onClick={() => setKind(k.id as ProjectKind)}
                        className={cx("rounded-full px-3 py-1.5 text-[12px] font-medium transition active:scale-95", kind === k.id ? "bg-veil-500/30 text-white ring-1 ring-veil-400/50" : "bg-white/[0.05] text-white/60 hover:text-white/90")}>
                        {k.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/40">{isHubKind(kind) ? "A hub of links to your channels/sites (or VYBZ Projects)." : "A micro-blog — post updates, tracks, art, and more."}</p>
                </div>
                <input value={tagline} onChange={(e) => setTagline(e.target.value.slice(0, 100))} placeholder="Tagline (optional)" className={inputCls} />
                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-white/60">Accent</p>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((a) => (
                      <button key={a} onClick={() => setAccent(a)} aria-label={`Accent ${a}`}
                        className={cx("h-7 w-7 rounded-full transition active:scale-90", accent === a && "ring-2 ring-white ring-offset-2 ring-offset-ink-900")} style={{ background: a }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {modal === "link" && (
              <div className="space-y-3">
                <input value={lLabel} onChange={(e) => setLLabel(e.target.value.slice(0, 60))} placeholder="Label (e.g. Main Channel)" className={inputCls} autoFocus />
                <div className="flex gap-1.5">
                  <button onClick={() => setLMode("external")} className={cx("flex-1 rounded-xl py-2 text-[13px] font-semibold transition", lMode === "external" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}>External link</button>
                  <button onClick={() => setLMode("page")} className={cx("flex-1 rounded-xl py-2 text-[13px] font-semibold transition", lMode === "page" ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55")}>VYBZ Project</button>
                </div>
                {lMode === "external" ? (
                  <input value={lUrl} onChange={(e) => setLUrl(e.target.value)} placeholder="https://youtube.com/@yourchannel" className={inputCls} />
                ) : (
                  <div>
                    <select value={lTarget} onChange={(e) => setLTarget(e.target.value)} className={cx(inputCls, "appearance-none")}>
                      <option value="" style={{ background: "#0f1420" }}>Choose one of your Projects…</option>
                      {projects.filter((p) => p.id !== activeProjectId).map((p) => <option key={p.id} value={p.id} style={{ background: "#0f1420" }}>{p.name}</option>)}
                    </select>
                    <p className="mt-1.5 text-[11px] text-white/40">Don't have a Project yet? Create one first, then link it here.</p>
                  </div>
                )}
              </div>
            )}

            <button onClick={submit} disabled={busy} className="btn btn-primary mt-4 h-11 w-full py-0 text-sm disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : modal === "project" ? "Create Project" : "Add link"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
