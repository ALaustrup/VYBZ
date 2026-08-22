import type { Drop, ProfileProject, ProjectLink, ProjectPost } from "@/types";

/**
 * Living-portfolio kinds. Renderers register in WorkCard.MODULE_RENDERERS —
 * add a kind here first, then a renderer. Unknown kinds fall back; they do not
 * fork the Stage File. 3D and games are later (Phase 9).
 */
export const WORK_KINDS = [
  "audio",
  "image",
  "video",
  "file",
  "project",
  "link",
  "text",
  "collection",
] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

export type ConnectedPlaylist = {
  id: string;
  provider: string;
  externalUrl: string;
  title: string;
  trackCount: number;
};

export type StageWork = {
  id: string;
  kind: WorkKind;
  title: string;
  href?: string;
  mediaUrl?: string;
  body?: string;
  items?: StageWork[];
  /** Measured member count when items are inlined or a stored playlist count exists. */
  itemCount?: number;
  collectionLabel?: string;
  drop?: Drop;
  project?: ProfileProject;
};

export function isWorkKind(value: string): value is WorkKind {
  return (WORK_KINDS as readonly string[]).includes(value);
}

export function classifyUrl(url: string, declared?: string | null): WorkKind {
  const k = (declared ?? "").toLowerCase();
  if (isWorkKind(k)) return k;
  const u = url.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u)) return "image";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return "video";
  if (/\.(mp3|wav|flac|aac|ogg|m4a)(\?|$)/i.test(u)) return "audio";
  if (/\.(zip|pdf|epub|gz|tgz)(\?|$)/i.test(u)) return "file";
  if (/^https?:\/\//i.test(u)) return "link";
  return "file";
}

function dropToAudioWork(drop: Drop): StageWork {
  return {
    id: `drop:${drop.id}`,
    kind: "audio",
    title: drop.title || "Untitled",
    mediaUrl: drop.audioUrl,
    drop,
  };
}

function albumKey(drop: Drop): string {
  return drop.album?.trim().toLowerCase() ?? "";
}

function postToWork(post: ProjectPost): StageWork | null {
  if (post.kind === "text" && (post.body || post.title)) {
    return {
      id: `post:${post.id}`,
      kind: "text",
      title: post.title || "Note",
      body: post.body ?? undefined,
    };
  }
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
  playlists?: ConnectedPlaylist[];
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

  for (const playlist of input.playlists ?? []) {
    const title = playlist.title?.trim();
    if (!title) continue;
    add({
      id: `playlist:${playlist.id}`,
      kind: "collection",
      title,
      href: playlist.externalUrl,
      collectionLabel: playlist.provider || "Playlist",
      itemCount: playlist.trackCount > 0 ? playlist.trackCount : undefined,
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

  const drops = input.drops ?? [];
  const albumCounts = new Map<string, number>();
  for (const drop of drops) {
    if (!drop.audioUrl) continue;
    const key = albumKey(drop);
    if (key) albumCounts.set(key, (albumCounts.get(key) ?? 0) + 1);
  }
  const emittedAlbums = new Set<string>();

  for (const drop of drops) {
    if (drop.audioUrl) {
      const key = albumKey(drop);
      if (key && (albumCounts.get(key) ?? 0) >= 2) {
        if (!emittedAlbums.has(key)) {
          emittedAlbums.add(key);
          const members = drops.filter((d) => d.audioUrl && albumKey(d) === key).map(dropToAudioWork);
          add({
            id: `album:${key}`,
            kind: "collection",
            title: drop.album!.trim(),
            collectionLabel: "Album",
            items: members,
            itemCount: members.length,
          });
        }
        continue;
      }
      add(dropToAudioWork(drop));
    } else if (drop.body) {
      add({
        id: `drop:${drop.id}`,
        kind: "text",
        title: drop.title || "Note",
        body: drop.body,
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
