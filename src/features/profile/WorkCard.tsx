import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ExternalLink, Folder } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import type { Drop } from "@/types";
import { type StageWork, type WorkKind } from "./workKind";
import { linksForAsset, linksForProject, type WorkSessionLink } from "@/features/provenance/workAttestation";
import { WorkSessionMark } from "@/features/provenance/WorkSessionMark";

export const WORK_RENDERERS: Record<WorkKind, true> = {
  audio: true,
  image: true,
  video: true,
  file: true,
  project: true,
  link: true,
};

function shell(kind: WorkKind, children: ReactNode, mark?: ReactNode) {
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

function AudioWork({
  work,
  queue,
  onOpenAuthor,
  sessionLinks,
}: {
  work: StageWork;
  queue: Drop[];
  onOpenAuthor?: () => void;
  sessionLinks?: WorkSessionLink[];
}) {
  const mark = markFor(work, sessionLinks);
  if (work.drop) {
    return shell(
      "audio",
      <TrackCard compact drop={{ ...work.drop }} queue={queue} onOpenAuthor={onOpenAuthor} />,
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

export function WorkCard({
  work,
  audioQueue,
  onOpenAuthor,
  sessionLinks,
}: {
  work: StageWork;
  audioQueue: Drop[];
  onOpenAuthor?: () => void;
  sessionLinks?: WorkSessionLink[];
}) {
  const navigate = useNavigate();
  const mark = markFor(work, sessionLinks);

  if (work.kind === "audio") {
    return (
      <AudioWork
        work={work}
        queue={audioQueue}
        onOpenAuthor={onOpenAuthor}
        sessionLinks={sessionLinks}
      />
    );
  }

  if (work.kind === "image" && work.mediaUrl) {
    return shell(
      "image",
      <figure className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <img src={work.mediaUrl} alt="" className="aspect-square w-full object-cover" />
        <figcaption className="truncate px-3 py-2 text-sm font-semibold">{work.title}</figcaption>
      </figure>,
      mark,
    );
  }

  if (work.kind === "video" && work.mediaUrl) {
    return shell(
      "video",
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <video className="aspect-video w-full bg-black" controls preload="metadata" src={work.mediaUrl} />
        <p className="truncate px-3 py-2 text-sm font-semibold">{work.title}</p>
      </div>,
      mark,
    );
  }

  if (work.kind === "file") {
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
      mark,
    );
  }

  if (work.kind === "project") {
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
      mark,
    );
  }

  if (work.kind === "link" && work.href) {
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
      mark,
    );
  }

  return null;
}
