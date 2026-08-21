import type { Drop, ProfileProject, ProjectLink, ProjectPost } from "@/types";

/** Minimum living-portfolio kinds. Renderers live in WorkCard — add here first. */
export const WORK_KINDS = ["audio", "image", "video", "file", "project", "link"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

export type StageWork = {
  id: string;
  kind: WorkKind;
  title: string;
  href?: string;
  mediaUrl?: string;
  drop?: Drop;
  project?: ProfileProject;
};

export function classifyUrl(url: string, declared?: string | null): WorkKind {
  const k = (declared ?? "").toLowerCase();
  if ((WORK_KINDS as readonly string[]).includes(k)) return k as WorkKind;
  const u = url.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u)) return "image";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return "video";
  if (/\.(mp3|wav|flac|aac|ogg|m4a)(\?|$)/i.test(u)) return "audio";
  if (/^https?:\/\//i.test(u)) return "link";
  return "file";
}

function postToWork(post: ProjectPost): StageWork | null {
  if (post.kind === "image" && post.mediaUrl) {
    return { id: `post:${post.id}`, kind: "image", title: post.title || "Image", mediaUrl: post.mediaUrl };
  }
  if (post.kind === "video" && post.mediaUrl) {
    return { id: `post:${post.id}`, kind: "video", title: post.title || "Video", mediaUrl: post.mediaUrl };
  }
  if (post.kind === "audio" && post.mediaUrl) {
    return { id: `post:${post.id}`, kind: "audio", title: post.title || "Audio", mediaUrl: post.mediaUrl };
  }
  if (post.kind === "link" && post.linkUrl) {
    return { id: `post:${post.id}`, kind: "link", title: post.title || post.linkUrl, href: post.linkUrl };
  }
  if (post.mediaUrl) {
    return {
      id: `post:${post.id}`,
      kind: classifyUrl(post.mediaUrl, post.kind),
      title: post.title || "File",
      mediaUrl: post.mediaUrl,
      href: post.mediaUrl,
    };
  }
  return null;
}

/** Assemble Stage File works. Live nights stay a separate lead surface. */
export function collectStageWorks(input: {
  drops?: Drop[];
  projects?: ProfileProject[];
  posts?: ProjectPost[];
  projectLinks?: ProjectLink[];
  demoUrl?: string | null;
}): StageWork[] {
  const out: StageWork[] = [];
  const seen = new Set<string>();
  function add(work: StageWork | null) {
    if (!work || seen.has(work.id)) return;
    seen.add(work.id);
    out.push(work);
  }

  for (const project of input.projects ?? []) {
    add({
      id: `project:${project.id}`,
      kind: "project",
      title: project.name,
      href: `/p/${project.id}`,
      mediaUrl: project.coverUrl ?? undefined,
      project,
    });
  }

  for (const post of input.posts ?? []) add(postToWork(post));

  for (const link of input.projectLinks ?? []) {
    if (link.targetProjectId) {
      add({
        id: `plink:${link.id}`,
        kind: "project",
        title: link.label,
        href: `/p/${link.targetProjectId}`,
        mediaUrl: link.thumbUrl ?? undefined,
      });
    } else if (link.url) {
      add({
        id: `plink:${link.id}`,
        kind: classifyUrl(link.url),
        title: link.label,
        href: link.url,
        mediaUrl: link.thumbUrl ?? undefined,
      });
    }
  }

  for (const drop of input.drops ?? []) {
    if (drop.audioUrl) {
      add({
        id: `drop:${drop.id}`,
        kind: "audio",
        title: drop.title || "Untitled",
        mediaUrl: drop.audioUrl,
        drop,
      });
    } else if (drop.body) {
      add({
        id: `drop:${drop.id}`,
        kind: "file",
        title: drop.title || "Note",
      });
    }
  }

  if (input.demoUrl) {
    add({
      id: "demo",
      kind: classifyUrl(input.demoUrl, "link"),
      title: "Demo",
      href: input.demoUrl,
    });
  }

  return out.slice(0, 48);
}
