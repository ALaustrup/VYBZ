import {
  Download,
  FileAudio,
  Flag,
  Heart,
  Link2,
  ListEnd,
  ListPlus,
  Maximize2,
  Pause,
  Pencil,
  Play,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import type { MenuGroup } from "@/components/menu/ContextMenu";
import type { Drop } from "@/types";

/**
 * Everything the action model needs to decide what a viewer may do with one track.
 * Kept free of React and network access so the rules are unit-testable.
 */
export type TrackActionContext = {
  drop: Drop;
  viewerId: string | null;
  /** True when the viewer owns the drop (RLS still enforces this server-side). */
  isOwner: boolean;
  /** True when this drop is the one loaded in the player. */
  isCurrent: boolean;
  isPlaying: boolean;
  /** Audio URL is a playable http/blob/data URL. */
  isPlayable: boolean;
  /** A downloadable asset row exists for this drop. */
  hasAsset: boolean;
  online: boolean;
  /** True when this drop headlines the owner's profile. */
  isFeatured: boolean;
  /** Viewer has already reacted with a Vyb. */
  hasVybbed: boolean;
};

export type TrackActionHandlers = {
  play: () => void;
  playNext: () => void;
  addToQueue: () => void;
  favourite: () => void;
  rate: () => void;
  openArtist: () => void;
  openTrack: () => void;
  viewDetails: () => void;
  copyArtistLink: () => void;
  download: () => void;
  rename: () => void;
  feature: () => void;
  report: () => void;
  requestDelete: () => void;
};

const OFFLINE = "You are offline.";
const NO_AUDIO = "This drop has no playable audio yet.";
const NO_ASSET = "No downloadable asset was attached to this drop.";
const NO_ARTIST = "This drop has no linked artist account.";

/**
 * Build the contextual menu for a single track.
 *
 * Rules:
 * - Owner-only actions never appear for other viewers.
 * - Report never appears for your own drop.
 * - An action that cannot run right now is disabled with a reason rather than hidden,
 *   except where showing it at all would be misleading.
 */
export function buildTrackActions(
  ctx: TrackActionContext,
  handlers: TrackActionHandlers
): MenuGroup[] {
  const { drop, isOwner, isPlayable, hasAsset, online, isCurrent, isPlaying, isFeatured, hasVybbed } =
    ctx;

  const playback: MenuGroup = {
    id: "playback",
    label: "Listen",
    actions: [
      {
        id: "play",
        label: isCurrent && isPlaying ? "Pause" : isCurrent ? "Resume" : "Play",
        icon: isCurrent && isPlaying ? Pause : Play,
        disabledReason: isPlayable ? undefined : NO_AUDIO,
        onSelect: handlers.play,
      },
      {
        id: "play-next",
        label: "Play next",
        icon: ListEnd,
        disabledReason: isPlayable ? undefined : NO_AUDIO,
        onSelect: handlers.playNext,
      },
      {
        id: "queue",
        label: "Add to queue",
        icon: ListPlus,
        disabledReason: isPlayable ? undefined : NO_AUDIO,
        onSelect: handlers.addToQueue,
      },
    ],
  };

  const engage: MenuGroup = {
    id: "engage",
    label: "Respond",
    actions: [
      {
        id: "favourite",
        label: hasVybbed ? "Remove Vyb" : "Vyb this track",
        icon: Heart,
        disabledReason: online ? undefined : OFFLINE,
        onSelect: handlers.favourite,
      },
      {
        id: "rate",
        label: "Rate this track",
        icon: Star,
        disabledReason: online ? undefined : OFFLINE,
        onSelect: handlers.rate,
      },
    ],
  };

  const details: MenuGroup = {
    id: "details",
    label: "Details",
    actions: [
      {
        id: "open-track",
        label: "Open track",
        icon: Maximize2,
        onSelect: handlers.openTrack,
      },
      {
        // Swaps the surface to a detail panel, so the menu must not close first.
        id: "file-details",
        label: "Quick file details",
        icon: FileAudio,
        keepOpen: true,
        onSelect: handlers.viewDetails,
      },
      {
        id: "open-artist",
        label: isOwner ? "Open your profile" : "Open artist",
        icon: UserRound,
        disabledReason: drop.authorId ? undefined : NO_ARTIST,
        onSelect: handlers.openArtist,
      },
      {
        id: "copy-artist-link",
        label: "Copy artist link",
        icon: Link2,
        disabledReason: drop.authorId ? undefined : NO_ARTIST,
        onSelect: handlers.copyArtistLink,
      },
    ],
  };

  const files: MenuGroup = {
    id: "files",
    label: "File",
    actions: [
      {
        id: "download",
        label: "Download original",
        icon: Download,
        disabledReason: !hasAsset ? NO_ASSET : !online ? OFFLINE : undefined,
        onSelect: handlers.download,
      },
    ],
  };

  const manage: MenuGroup = {
    id: "manage",
    label: "Manage",
    actions: isOwner
      ? [
          {
            id: "rename",
            label: "Rename track",
            icon: Pencil,
            keepOpen: true,
            disabledReason: online ? undefined : OFFLINE,
            onSelect: handlers.rename,
          },
          {
            id: "feature",
            label: isFeatured ? "Featured on your profile" : "Feature on your profile",
            icon: Star,
            disabledReason: isFeatured
              ? "Already featured."
              : online
                ? undefined
                : OFFLINE,
            onSelect: handlers.feature,
          },
        ]
      : [],
  };

  const safety: MenuGroup = {
    id: "safety",
    actions: isOwner
      ? [
          {
            id: "delete",
            label: "Delete track",
            icon: Trash2,
            danger: true,
            keepOpen: true,
            disabledReason: online ? undefined : OFFLINE,
            onSelect: handlers.requestDelete,
          },
        ]
      : [
          {
            // Opens the report dialog in place of the menu, so the surface must stay mounted.
            id: "report",
            label: "Report this track",
            icon: Flag,
            keepOpen: true,
            disabledReason: online ? undefined : OFFLINE,
            onSelect: handlers.report,
          },
        ],
  };

  return [playback, engage, details, files, manage, safety];
}

/** Human-readable technical summary from the fields a Drop actually carries. */
export function trackFileSummary(drop: Drop): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value });
  };

  push("Title", drop.title?.trim() || "Untitled");
  push("Artist", drop.creditedArtist?.trim() || drop.authorUsername || undefined);
  push("Album", drop.album?.trim() || undefined);
  if (drop.durationSec) {
    const m = Math.floor(drop.durationSec / 60);
    const s = Math.floor(drop.durationSec % 60).toString().padStart(2, "0");
    push("Duration", `${m}:${s}`);
  }
  push("Format", drop.audioFormat ?? undefined);
  if (drop.sampleRate) push("Sample rate", `${(drop.sampleRate / 1000).toFixed(1)} kHz`);
  push("Lossless", drop.lossless ? "Yes" : "No");
  if (drop.bpm) push("BPM", String(drop.bpm));
  push("Key", drop.musicalKey ?? undefined);
  push("License", drop.license ?? undefined);
  push("Uploaded", drop.createdAt ? new Date(drop.createdAt).toLocaleString() : undefined);
  return rows;
}
