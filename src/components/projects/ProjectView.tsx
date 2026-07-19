import { useState } from "react";
import { ExternalLink, Heart, Link2, Music2, Pause, Play, Plus, Puzzle, Trash2, UserPlus, UserCheck, X } from "lucide-react";
import { playTrack, usePlayer } from "@/lib/audioBus";
import { ProjectWidgets } from "@/components/ProjectWidgets";
import { ReportButton } from "@/components/ReportButton";
import { cx } from "@/lib/utils";
import type { ProfileProjectDetail, ProjectLink, ProjectPost } from "@/types";

export const PROJECT_KINDS: { id: string; label: string; hub: boolean }[] = [
  { id: "music", label: "Music", hub: false },
  { id: "art", label: "Art", hub: false },
  { id: "writing", label: "Writing", hub: false },
  { id: "general", label: "Updates", hub: false },
  { id: "video", label: "Video / YouTube", hub: true },
  { id: "links", label: "Link hub", hub: true },
];
export const isHubKind = (k: string) => k === "video" || k === "links";

/** Renders a single project: a link hub (channels) or a micro-blog post feed. */
export function ProjectView({
  detail, editable, onFollow, onLikePost, onAddPost, onDeletePost, onAddLink, onDeleteLink, onOpenLink,
  onAddWidget, onRemoveWidget,
}: {
  detail: ProfileProjectDetail;
  editable: boolean;
  onFollow: (on: boolean) => void;
  onLikePost: (post: ProjectPost, on: boolean) => void;
  onAddPost: () => void;
  onDeletePost: (post: ProjectPost) => void;
  onAddLink: () => void;
  onDeleteLink: (link: ProjectLink) => void;
  onOpenLink: (link: ProjectLink) => void;
  onAddWidget?: (kind: string, config: Record<string, unknown>, title?: string) => Promise<void>;
  onRemoveWidget?: (id: string) => void;
}) {
  const accent = detail.accent || "#a87cf8";
  const hub = isHubKind(detail.kind);
  const isGallery = detail.kind === "art";
  const [lightbox, setLightbox] = useState<string | null>(null);
  const imagePosts = isGallery ? detail.posts.filter((p) => p.kind === "image" && p.mediaUrl) : [];
  const otherPosts = isGallery ? detail.posts.filter((p) => !(p.kind === "image" && p.mediaUrl)) : detail.posts;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/8 p-4" style={{ background: `linear-gradient(135deg, ${accent}22, transparent 70%)` }}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-8 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-xl font-bold text-white">{detail.name}</h2>
            {detail.tagline && <p className="mt-0.5 text-sm text-white/60">{detail.tagline}</p>}
            <p className="mt-1 text-[12px] text-white/40">{detail.followers} {detail.followers === 1 ? "follower" : "followers"}</p>
          </div>
          {!editable && (
            <button onClick={() => onFollow(!detail.following)}
              className={cx("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition active:scale-95",
                detail.following ? "bg-white/10 text-white" : "text-white")}
              style={detail.following ? undefined : { background: accent }}>
              {detail.following ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
            </button>
          )}
        </div>
      </div>

      {(editable || (detail.widgets?.length ?? 0) > 0) && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40"><Puzzle className="h-3.5 w-3.5 text-veil-200" /> Widgets</p>
          <ProjectWidgets
            widgets={detail.widgets ?? []}
            editable={editable}
            projectId={detail.id}
            onAdd={onAddWidget}
            onRemove={onRemoveWidget}
          />
        </div>
      )}

      {hub ? (
        <div className="space-y-2.5">
          {detail.links.length === 0 && !editable && <Empty text="No links yet." />}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {detail.links.map((l) => (
              <div key={l.id} className="group relative flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 transition hover:border-white/20">
                <button onClick={() => onOpenLink(l)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}30` }}>
                    {l.targetProjectId ? <Link2 className="h-5 w-5" style={{ color: accent }} /> : <ExternalLink className="h-5 w-5" style={{ color: accent }} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{l.label}</span>
                    <span className="block truncate text-[11px] text-white/45">{l.targetProjectId ? "VYBZ Project" : (l.url || "")}</span>
                  </span>
                </button>
                {editable && (
                  <button onClick={() => onDeleteLink(l)} aria-label="Remove link" className="shrink-0 rounded-full p-1.5 text-white/40 hover:text-wild"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
          {editable && (
            <button onClick={onAddLink} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/20 py-3 text-sm font-semibold text-white/60 transition hover:border-white/40 hover:text-white active:scale-[0.99]">
              <Plus className="h-4 w-4" /> Add link
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {editable && (
            <button onClick={onAddPost} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/20 py-3 text-sm font-semibold text-white/60 transition hover:border-white/40 hover:text-white active:scale-[0.99]">
              <Plus className="h-4 w-4" /> {isGallery ? "Add artwork" : "New post"}
            </button>
          )}
          {detail.posts.length === 0 && !editable && <Empty text={isGallery ? "No artwork yet." : "No posts yet."} />}

          {/* Visual Artists: image posts render as a gallery grid with a lightbox. */}
          {isGallery && imagePosts.length > 0 && (
            <div className="columns-2 gap-2.5 [column-fill:_balance] sm:columns-3">
              {imagePosts.map((p) => (
                <div key={p.id} className="group relative mb-2.5 break-inside-avoid overflow-hidden rounded-xl border border-white/8">
                  <img src={p.mediaUrl!} alt={p.title ?? ""} loading="lazy"
                    onClick={() => setLightbox(p.mediaUrl!)}
                    className="w-full cursor-zoom-in object-cover transition group-hover:opacity-90" />
                  {(p.title || editable) && (
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      {p.title && <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">{p.title}</span>}
                      <button onClick={() => onLikePost(p, !p.liked)} className={cx("flex items-center gap-0.5 text-[11px]", p.liked ? "text-wild" : "text-white/45")}><Heart className={cx("h-3 w-3", p.liked && "fill-current")} />{p.likes > 0 ? p.likes : ""}</button>
                      {editable
                        ? <button onClick={() => onDeletePost(p)} aria-label="Delete" className="text-white/35 hover:text-wild"><Trash2 className="h-3 w-3" /></button>
                        : <ReportButton kind="post" targetId={p.id} label={p.title ?? "artwork"} iconClassName="h-3 w-3" />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {otherPosts.map((p) => (
            <PostCard key={p.id} post={p} accent={accent} projectName={detail.name} editable={editable}
              onLike={(on) => onLikePost(p, on)} onDelete={() => onDeletePost(p)} />
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full glass"><X className="h-4 w-4" /></button>
          <img src={lightbox} alt="" className="max-h-[92dvh] max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

function PostCard({ post, accent, projectName, editable, onLike, onDelete }: {
  post: ProjectPost; accent: string; projectName: string; editable: boolean; onLike: (on: boolean) => void; onDelete: () => void;
}) {
  const player = usePlayer();
  const src = post.mediaUrl || post.linkUrl || "";
  const isAudio = post.kind === "audio" && !!src;
  const isVideo = post.kind === "video" && !!src;
  const playing = player.track?.id === post.id && player.playing;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5">
      <div className="flex items-start gap-3">
        {isAudio && (
          <button onClick={() => playTrack({ id: post.id, url: src, title: post.title || "Untitled", artist: projectName, accent, fx: post.fx ?? "glow" })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white active:scale-95" style={{ background: accent }}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          {post.title && <p className="font-display font-semibold text-white">{post.title}</p>}
          {post.body && <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{post.body}</p>}
          {post.kind === "image" && post.mediaUrl && (
            <img src={post.mediaUrl} alt={post.title ?? ""} className="mt-2 max-h-80 w-full rounded-xl object-cover" loading="lazy" />
          )}
          {isVideo && (
            <video
              src={src}
              controls
              playsInline
              preload="metadata"
              className="mt-2 max-h-96 w-full rounded-xl bg-black/40 object-contain"
            />
          )}
          {post.kind === "link" && post.linkUrl && (
            <a href={post.linkUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-veil-200 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> {new URL(post.linkUrl).hostname}
            </a>
          )}
          {post.kind === "audio" && !isAudio && <p className="mt-1 flex items-center gap-1.5 text-[12px] text-white/40"><Music2 className="h-3.5 w-3.5" /> audio</p>}
          <div className="mt-2.5 flex items-center gap-3">
            <button onClick={() => onLike(!post.liked)} className={cx("flex items-center gap-1.5 text-[13px] font-semibold transition active:scale-95", post.liked ? "text-wild" : "text-white/45 hover:text-white/80")}>
              <Heart className={cx("h-4 w-4", post.liked && "fill-current")} /> {post.likes > 0 ? post.likes : "Like"}
            </button>
            <span className="text-[11px] text-white/30">{new Date(post.createdAt).toLocaleDateString()}</span>
            {editable
              ? <button onClick={onDelete} aria-label="Delete post" className="ml-auto rounded-full p-1 text-white/35 hover:text-wild"><Trash2 className="h-4 w-4" /></button>
              : <ReportButton kind="post" targetId={post.id} label={post.title || post.body || projectName} className="ml-auto rounded-full p-1" iconClassName="h-4 w-4" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-white/40">{text}</p>;
}
