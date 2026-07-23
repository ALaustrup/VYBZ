import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { ProjectView } from "@/components/projects/ProjectView";
import { useRegisterAppBar } from "@/lib/appBarBridge";
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

  useRegisterAppBar({
    title: detail?.name ?? (loading ? "Project" : "Unavailable"),
    actions: detail ? (
      <button type="button" onClick={() => navigate(`/u/${detail.userId}`)}
        className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/75 active:scale-95">
        Creator
      </button>
    ) : null,
  }, [detail?.name, detail?.userId, loading, navigate]);

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
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-8 pt-2">
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
  );
}
