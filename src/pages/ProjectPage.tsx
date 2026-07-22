import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { ProjectView } from "@/components/projects/ProjectView";
import type { ProfileProjectDetail, ProjectLink, ProjectPost } from "@/types";

/** Full-page view of a single Project (profile_projects) — deep links + hub targets. */
export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [detail, setDetail] = useState<ProfileProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setDetail(await api.getProjectDetail(id));
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

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
  function openLink(link: ProjectLink) {
    if (link.targetProjectId) navigate(`/p/${link.targetProjectId}`);
    else if (link.url) window.open(link.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-1 pt-4">
        <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="flex-1 truncate font-display text-xl font-bold text-gradient">{detail?.name ?? "Project"}</h1>
        {detail && <button onClick={() => navigate(`/u/${detail.userId}`)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/75 active:scale-95">Creator</button>}
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : !detail ? (
          <p className="py-16 text-center text-sm text-white/45">This project isn't available.</p>
        ) : (
          <div className="mx-auto max-w-xl">
            <ProjectView detail={detail} editable={false}
              onFollow={follow} onLikePost={likePost} onOpenLink={openLink}
              onAddPost={() => {}} onDeletePost={() => {}} onAddLink={() => {}} onDeleteLink={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}
