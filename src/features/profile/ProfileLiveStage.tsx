import { forwardRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle, Radio, Settings2 } from "lucide-react";
import { LiveVisualizer } from "@/components/LiveVisualizer";
import { Avatar } from "@/components/Avatar";
import { CosmeticAvatarShell, Flair, type ResolvedCosmetics } from "@/lib/cosmetics";
import { cx } from "@/lib/utils";
import type { StageNight } from "./stageNights";
import { useProfileLivePlayback } from "./useProfileLivePlayback";

function streamStatusLabel(kind: ReturnType<typeof useProfileLivePlayback>["streamKind"]) {
  if (kind === "video") return "Live video stream";
  if (kind === "audio") return "Live audio stream";
  if (kind === "connecting") return "Connecting to live session";
  return "Live session ended";
}

export const ProfileLiveStage = forwardRef<
  HTMLElement,
  {
    night: StageNight;
    hostId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null | undefined;
    cosmetics: ResolvedCosmetics;
    isOwner: boolean;
    children?: ReactNode;
  }
>(function ProfileLiveStage(
  { night, hostId, displayName, username, avatarUrl, cosmetics, isOwner, children },
  ref,
) {
  const name = displayName || username || "Host";
  const {
    session,
    loading,
    videoRef,
    vizStream,
    hasVideo,
    audioOnly,
    playing,
    streamKind,
  } = useProfileLivePlayback({
    sessionId: night.id,
    isHost: isOwner,
    enabled: night.status === "live",
  });

  const liveLabel = isOwner ? "Your VYBZ is live" : `${name} is live`;
  const mediaLabel = streamStatusLabel(streamKind);

  return (
    <section
      ref={ref}
      id="profile-live-stage"
      data-testid="profile-live-stage"
      aria-label={liveLabel}
      className="relative isolate min-h-[24rem] max-h-[36rem] h-[52vh] overflow-hidden sm:min-h-[26rem]"
    >
      <div className="absolute inset-0 bg-black">
        <video
          ref={videoRef}
          className={cx(
            "h-full w-full object-cover",
            (!hasVideo || streamKind === "ended") && "pointer-events-none absolute inset-0 opacity-0",
          )}
          playsInline
          controls={false}
          autoPlay
          muted={isOwner}
          aria-label={mediaLabel}
        />
        {audioOnly && (
          <LiveVisualizer
            stream={vizStream}
            mode="stage"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/80">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-200/80" aria-hidden />
            <span className="sr-only">Loading live session</span>
          </div>
        )}
        {!loading && streamKind === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-cyan-950 via-ink-950 to-black px-6 text-center">
            <Radio className="h-10 w-10 animate-pulse text-cyan-300" aria-hidden />
            <p className="font-display text-lg font-semibold text-white">{liveLabel}</p>
            <p className="text-[13px] text-white/50">{mediaLabel}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-black/25" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-3 px-4 pt-4 sm:px-8">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-wild px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-glow"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" aria-hidden />
            Live now
          </span>
          {playing ? (
            <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] text-white/75 backdrop-blur-md">
              {mediaLabel}
            </span>
          ) : null}
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {isOwner ? (
            <Link
              to={`/live/${night.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300/70"
              aria-label="Manage live session"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Manage live
            </Link>
          ) : (
            <Link
              to={`/live/${night.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 text-[12px] font-medium text-white backdrop-blur-md transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300/70"
              aria-label={`Open chat for ${name}'s live session`}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Chat
            </Link>
          )}
        </div>
      </div>

      <div className="relative z-[2] flex h-full flex-col justify-end px-4 pb-6 sm:px-8">
        <div className="flex items-end gap-4">
          <span className={cx("relative shrink-0", "stage-live-ring")}>
            <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
              <Avatar url={avatarUrl} name={username} id={hostId} size="xl" square />
            </CosmeticAvatarShell>
          </span>
          <div className="min-w-0 flex-1 pb-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <Flair data={cosmetics.flair} />
            </div>
            <h1 className="mt-1 font-display text-[2.25rem] font-semibold leading-[0.95] tracking-tight text-white sm:text-5xl">
              {name}
            </h1>
            <p className="mt-2 text-[13px] text-cyan-100/85">
              {session?.title || night.title || night.intent || liveLabel}
              {session && session.viewerCount > 0 ? ` · ${session.viewerCount} watching` : null}
            </p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
});
