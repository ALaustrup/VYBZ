import { useNavigate } from "react-router-dom";
import { ExternalLink, Heart, Pause, Play } from "lucide-react";
import { playTrack, usePlayer } from "@/lib/audioBus";
import { avatarGradient, cx } from "@/lib/utils";
import type { FeedPost } from "@/types";

/** A single post in the unified home feed — author + project + content + like. */
export function FeedPostCard({ post, onLike }: { post: FeedPost; onLike: (on: boolean) => void }) {
  const navigate = useNavigate();
  const player = usePlayer();
  const accent = post.accent || "#a87cf8";
  const src = post.mediaUrl || post.linkUrl || "";
  const isAudio = post.kind === "audio" && !!src;
  const playing = player.track?.id === post.id && player.playing;
  const [c0, c1] = avatarGradient(post.authorUsername || post.authorId);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <button onClick={() => navigate(`/u/${post.authorId}`)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white" style={{ background: `linear-gradient(150deg, ${c0}, ${c1})` }}>
          {(post.authorUsername || "?").charAt(0).toUpperCase()}
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <button onClick={() => navigate(`/u/${post.authorId}`)} className="block truncate text-sm font-semibold text-white">{post.authorUsername || "Creator"}</button>
          <button onClick={() => navigate(`/p/${post.projectId}`)} className="flex items-center gap-1 truncate text-[12px] text-white/45 hover:text-white/70">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} /> {post.projectName}
          </button>
        </div>
        <span className="shrink-0 text-[11px] text-white/30">{timeAgo(post.createdAt)}</span>
      </div>

      <div className="flex items-start gap-3">
        {isAudio && (
          <button onClick={() => playTrack({ id: post.id, url: src, title: post.title || post.projectName, artist: post.authorUsername || "VYBZ" })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white active:scale-95" style={{ background: accent }}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          {post.title && <p className="font-display font-semibold text-white">{post.title}</p>}
          {post.body && <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-white/75">{post.body}</p>}
          {post.kind === "image" && post.mediaUrl && <img src={post.mediaUrl} alt={post.title ?? ""} className="mt-2 max-h-96 w-full rounded-xl object-cover" loading="lazy" />}
          {post.kind === "link" && post.linkUrl && (
            <a href={post.linkUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-veil-200 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> {hostOf(post.linkUrl)}</a>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => onLike(!post.liked)} className={cx("flex items-center gap-1.5 text-[13px] font-semibold transition active:scale-95", post.liked ? "text-wild" : "text-white/45 hover:text-white/80")}>
          <Heart className={cx("h-4 w-4", post.liked && "fill-current")} /> {post.likes > 0 ? post.likes : "Like"}
        </button>
      </div>
    </div>
  );
}

function hostOf(url: string) { try { return new URL(url).hostname; } catch { return url; } }
function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
