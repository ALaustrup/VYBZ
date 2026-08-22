import type { ComponentType, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ExternalLink, FileText, Folder, ListMusic, Play } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { playTrack } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import type { Drop } from "@/types";
import { type StageWork, type WorkKind } from "./workKind";
import { linksForAsset, linksForProject, type WorkSessionLink } from "@/features/provenance/workAttestation";
import { WorkSessionMark } from "@/features/provenance/WorkSessionMark";

export type WorkCardProps = {
  work: StageWork;
  audioQueue: Drop[];
  onOpenAuthor?: () => void;
  sessionLinks?: WorkSessionLink[];
};

export type WorkModuleRenderer = ComponentType<WorkCardProps>;

function shell(kind: string, children: ReactNode, mark?: ReactNode) {
  return (
    <article data-testid="stage-work" data-kind={kind} className="min-w-0">
      {children}
      {mark}
    </article>
  );
}

function markFor(work: StageWork, sessionLinks: WorkSessionLink[] | undefined) {
  if (!sessionLinks?.length) return null;
  const links =
    work.kind === "project"
      ? linksForProject(sessionLinks, work.project?.id)
      : linksForAsset(sessionLinks, work.drop?.assetId);
  return <WorkSessionMark links={links} />;
}

function AudioWork({ work, audioQueue, onOpenAuthor, sessionLinks }: WorkCardProps) {
  const mark = markFor(work, sessionLinks);
  if (work.drop) {
    return shell(
      "audio",
      <TrackCard compact drop={{ ...work.drop }} queue={audioQueue} onOpenAuthor={onOpenAuthor} />,
      mark,
    );
  }
  if (!work.mediaUrl) return null;
  return shell(
    "audio",
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="truncate text-sm font-semibold">{work.title}</p>
      <audio className="mt-2 w-full" controls preload="none" src={work.mediaUrl} />
    </div>,
    mark,
  );
}

function ImageWork({ work, sessionLinks }: WorkCardProps) {
  if (!work.mediaUrl) return null;
  return shell(
    "image",
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <img src={work.mediaUrl} alt="" className="aspect-square w-full object-cover" />
      <figcaption className="truncate px-3 py-2 text-sm font-semibold">{work.title}</figcaption>
    </figure>,
    markFor(work, sessionLinks),
  );
}

function VideoWork({ work, sessionLinks }: WorkCardProps) {
  if (!work.mediaUrl) return null;
  return shell(
    "video",
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <video className="aspect-video w-full bg-black" controls preload="metadata" src={work.mediaUrl} />
      <p className="truncate px-3 py-2 text-sm font-semibold">{work.title}</p>
    </div>,
    markFor(work, sessionLinks),
  );
}

function FileWork({ work, sessionLinks }: WorkCardProps) {
  return shell(
    "file",
    work.href ? (
      <a
        href={work.href}
        download
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm hover:border-white/20"
      >
        <Download className="h-4 w-4 shrink-0 text-white/45" />
        <span className="truncate font-semibold">{work.title}</span>
      </a>
    ) : (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
        <p className="truncate font-semibold">{work.title}</p>
      </div>
    ),
    markFor(work, sessionLinks),
  );
}

function ProjectWork({ work, sessionLinks }: WorkCardProps) {
  const navigate = useNavigate();
  return shell(
    "project",
    <button
      type="button"
      onClick={() => work.href && navigate(work.href)}
      className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left hover:border-white/20"
    >
      {work.mediaUrl ? (
        <img src={work.mediaUrl} alt="" className="aspect-video w-full object-cover opacity-80" />
      ) : (
        <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-white/[0.06] to-black">
          <Folder className="h-8 w-8 text-white/35" />
        </div>
      )}
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-semibold">{work.title}</p>
        <p className="text-[11px] text-white/40">{work.project?.kind || "Project"}</p>
      </div>
    </button>,
    markFor(work, sessionLinks),
  );
}

function LinkWork({ work, sessionLinks }: WorkCardProps) {
  if (!work.href) return null;
  return shell(
    "link",
    <a
      href={work.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm hover:border-white/20"
    >
      <ExternalLink className="h-4 w-4 shrink-0 text-white/45" />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{work.title}</span>
        <span className="block truncate text-[11px] text-white/40">{work.href}</span>
      </span>
    </a>,
    markFor(work, sessionLinks),
  );
}

function TextWork({ work, sessionLinks }: WorkCardProps) {
  const body = (work.body ?? "").trim();
  return shell(
    "text",
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-white/45" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{work.title}</p>
          {body ? (
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-white/65">{body}</p>
          ) : null}
        </div>
      </div>
    </div>,
    markFor(work, sessionLinks),
  );
}

function CollectionWork({ work, sessionLinks }: WorkCardProps) {
  const items = work.items ?? [];
  const playable = items.map((item) => item.drop).filter((d): d is Drop => Boolean(d?.audioUrl));
  const shown = items.slice(0, 8);
  const extra = items.length > shown.length ? items.length - shown.length : 0;
  const count = work.itemCount ?? (items.length > 0 ? items.length : undefined);

  function play() {
    if (!playable.length) return;
    playTrack(
      toPlayerTrack(playable[0]),
      playable.map(toPlayerTrack),
    );
  }

  return shell(
    "collection",
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-start gap-2">
        <ListMusic className="mt-0.5 h-4 w-4 shrink-0 text-white/45" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{work.title}</p>
          <p className="text-[11px] text-white/40">
            {work.collectionLabel || "Collection"}
            {count != null ? ` · ${count}` : ""}
          </p>
        </div>
        {playable.length > 0 ? (
          <button
            type="button"
            onClick={play}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80 hover:border-white/30"
            aria-label={`Play ${work.title}`}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {shown.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {shown.map((item) => (
            <li key={item.id} className="truncate text-[12px] text-white/55">
              {item.title}
            </li>
          ))}
          {extra > 0 ? <li className="text-[11px] text-white/35">+{extra} more</li> : null}
        </ul>
      ) : null}
      {work.href ? (
        <a
          href={work.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-200/80 hover:text-cyan-100"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>
      ) : null}
    </div>,
    markFor(work, sessionLinks),
  );
}

/** Fallback when a kind is missing from the registry. Does not crash the Stage File. */
export function UnknownWork({ work, sessionLinks }: WorkCardProps) {
  return shell(
    work.kind || "unknown",
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
      <p className="truncate font-semibold">{work.title}</p>
      <p className="mt-0.5 text-[11px] text-white/40">Can't display this yet</p>
    </div>,
    markFor(work, sessionLinks),
  );
}

/**
 * Kind → renderer. New media registers here. It does not fork ArtistStageProfile.
 * 3D and games stay out until Phase 9.
 */
export const MODULE_RENDERERS: Record<WorkKind, WorkModuleRenderer> = {
  audio: AudioWork,
  image: ImageWork,
  video: VideoWork,
  file: FileWork,
  project: ProjectWork,
  link: LinkWork,
  text: TextWork,
  collection: CollectionWork,
};

export const WORK_RENDERERS: Record<WorkKind, true> = {
  audio: true,
  image: true,
  video: true,
  file: true,
  project: true,
  link: true,
  text: true,
  collection: true,
};

export function rendererFor(kind: string): WorkModuleRenderer {
  return MODULE_RENDERERS[kind as WorkKind] ?? UnknownWork;
}

export function WorkCard(props: WorkCardProps) {
  const Renderer = rendererFor(props.work.kind);
  return <Renderer {...props} />;
}
