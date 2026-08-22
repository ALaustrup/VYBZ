import {
  Download,
  FileAudio,
  Flag,
  Heart,
  Languages,
  Layers,
  Link2,
  ListEnd,
  ListPlus,
  Maximize2,
  Pause,
  Pencil,
  Piano,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tags,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { MenuGroup } from "@/components/menu/ContextMenu";
import type { Drop } from "@/types";

export type TrackToolId = "correct" | "translate" | "metadata" | "convert" | "midi" | "stems";

export type TrackToolDef = {
  id: TrackToolId;
  label: string;
  /** Route that renders the desk. Hidden from navigation, still resolvable. */
  path: string;
  icon: LucideIcon;
  /**
   * True when the desk genuinely works on a whole release. Only Metadata does —
   * the audio desks hold one master at a time, so an album action for them has
   * to name the single track it opened.
   */
  wholeAlbum: boolean;
};

/**
 * The desks a track can be sent to from its own menu.
 *
 * Art Check is deliberately absent: it grades cover artwork, and a Drop carries
 * a dock backdrop rather than release art, so there would be nothing honest to
 * hand it.
 */
export const TRACK_TOOLS: readonly TrackToolDef[] = [
  {
    id: "correct",
    label: "Fix",
    path: "/tools/correct",
    icon: SlidersHorizontal,
    wholeAlbum: false,
  },
  {
    id: "translate",
    label: "Listen check",
    path: "/tools/translate",
    icon: Languages,
    wholeAlbum: false,
  },
  { id: "metadata", label: "Names", path: "/tools/metadata", icon: Tags, wholeAlbum: true },
  { id: "convert", label: "Convert", path: "/tools/convert", icon: RefreshCw, wholeAlbum: false },
  { id: "midi", label: "MIDI", path: "/tools/midi", icon: Piano, wholeAlbum: false },
  { id: "stems", label: "Stems", path: "/tools/stems", icon: Layers, wholeAlbum: false },
] as const;

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
  /** True when this drop is placed on the Stage File (or uncomposed legacy). */
  onStage: boolean;
  /** Viewer has already reacted with a Vyb. */
  hasVybbed: boolean;
};

export type TrackActionHandlers = {
  play: () => void;
  playNext: () => void;
  addToQueue: () => void;
  addToVibesRadio: () => void;
  favourite: () => void;
  rate: () => void;
  openArtist: () => void;
  openTrack: () => void;
  viewDetails: () => void;
  copyArtistLink: () => void;
  download: () => void;
  rename: () => void;
  placeOnVybz: () => void;
  report: () => void;
  validateHumanity: () => void;
  requestDelete: () => void;
  /** Fetch this track's master into the working set, then open the desk. */
  openInTool: (tool: TrackToolDef) => void;
};

const OFFLINE = "You're offline.";
const NO_AUDIO = "No audio yet.";
const NO_ASSET = "No file to download.";
const NO_ARTIST = "No artist on this track.";

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
  const { drop, isOwner, isPlayable, hasAsset, online, isCurrent, isPlaying, isFeatured, onStage, hasVybbed } =
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
      {
        id: "vibes-radio",
        label: "Add to Vibes Radio",
        icon: Radio,
        disabledReason: !isPlayable ? NO_AUDIO : !online ? OFFLINE : undefined,
        onSelect: handlers.addToVibesRadio,
      },
    ],
  };

  const engage: MenuGroup = {
    id: "engage",
    label: "Respond",
    actions: [
      {
        id: "favourite",
        label: hasVybbed ? "Remove Vyb" : "Vyb",
        icon: Heart,
        disabledReason: online ? undefined : OFFLINE,
        onSelect: handlers.favourite,
      },
      {
        id: "rate",
        label: "Rate",
        icon: Star,
        disabledReason: online ? undefined : OFFLINE,
        onSelect: handlers.rate,
      },
    ],
  };

  const tools: MenuGroup = {
    id: "tools",
    label: "Tools",
    actions: TRACK_TOOLS.map((tool) => ({
      id: `tool-${tool.id}`,
      label: tool.label,
      icon: tool.icon,
      // The master has to be fetched before the desk has anything to work on,
      // so the menu stays mounted and becomes the progress surface. Closing
      // first would drop the user into an empty tool with no explanation.
      keepOpen: true,
      disabledReason: !isPlayable ? NO_AUDIO : !online ? OFFLINE : undefined,
      onSelect: () => handlers.openInTool(tool),
    })),
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
        label: "File info",
        icon: FileAudio,
        keepOpen: true,
        onSelect: handlers.viewDetails,
      },
      {
        id: "open-artist",
        label: isOwner ? "My VYBZ" : "Creator",
        icon: UserRound,
        disabledReason: drop.authorId ? undefined : NO_ARTIST,
        onSelect: handlers.openArtist,
      },
      {
        id: "copy-artist-link",
        label: "Copy link",
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
        label: "Download",
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
            id: "validate-humanity",
            label: "Validate Humanity",
            icon: ShieldCheck,
            keepOpen: true,
            disabledReason: !hasAsset ? NO_ASSET : !online ? OFFLINE : undefined,
            onSelect: handlers.validateHumanity,
          },
          {
            id: "rename",
            label: "Rename",
            icon: Pencil,
            keepOpen: true,
            disabledReason: online ? undefined : OFFLINE,
            onSelect: handlers.rename,
          },
          {
            id: "place-on-vybz",
            label: isFeatured ? "Featured on your VYBZ" : onStage ? "On your VYBZ" : "Place on your VYBZ",
            icon: Sparkles,
            keepOpen: true,
            disabledReason: online ? undefined : OFFLINE,
            onSelect: handlers.placeOnVybz,
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
            label: "Delete",
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
            label: "Report",
            icon: Flag,
            keepOpen: true,
            disabledReason: online ? undefined : OFFLINE,
            onSelect: handlers.report,
          },
        ],
  };

  return [playback, engage, tools, details, files, manage, safety];
}

/* ------------------------------------------------------------------------- */
/* Albums                                                                     */
/* ------------------------------------------------------------------------- */

export type AlbumActionContext = {
  /** Album name as the library grouped it. */
  label: string;
  drops: Drop[];
  /**
   * The one track an audio desk would act on. Null when no track in the album
   * has playable audio.
   */
  leadTrack: Drop | null;
  online: boolean;
};

export type AlbumActionHandlers = {
  /** Metadata is the only desk that opens every track in a release. */
  openAlbumInMetadata: () => void;
  openLeadTrackInTool: (tool: TrackToolDef) => void;
};

const NO_ALBUM_AUDIO = "No playable audio in this set.";

/**
 * Build the contextual menu for a whole release.
 *
 * The split is the honest one: Metadata acts on every track, and the audio
 * desks act on exactly one, which is named in the group heading so nothing here
 * implies a release-wide render that does not happen.
 */
export function buildAlbumActions(
  ctx: AlbumActionContext,
  handlers: AlbumActionHandlers
): MenuGroup[] {
  const { drops, leadTrack, online } = ctx;
  const count = drops.length;
  const leadName = leadTrack?.title?.trim() || "Untitled";

  const release: MenuGroup = {
    id: "release",
    label: "Whole album",
    actions: [
      {
        id: "album-metadata",
        label: `Names for ${count} ${count === 1 ? "track" : "tracks"}`,
        icon: Tags,
        disabledReason: !count ? "This release has no tracks." : !online ? OFFLINE : undefined,
        onSelect: handlers.openAlbumInMetadata,
      },
    ],
  };

  const single: MenuGroup = {
    id: "album-lead-track",
    label: `One track only · ${leadName}`,
    actions: TRACK_TOOLS.filter((t) => !t.wholeAlbum).map((tool) => ({
      id: `album-tool-${tool.id}`,
      label: tool.label,
      icon: tool.icon,
      hint: "1 track",
      keepOpen: true,
      disabledReason: !leadTrack?.audioUrl ? NO_ALBUM_AUDIO : !online ? OFFLINE : undefined,
      onSelect: () => handlers.openLeadTrackInTool(tool),
    })),
  };

  return [release, single];
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
