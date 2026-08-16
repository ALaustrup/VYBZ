import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  MessageSquare,
  MoreVertical,
  Pause,
  Play,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { TrackActionMenu } from "@/components/TrackActionMenu";
import type { MenuAnchor } from "@/components/menu/ContextMenu";
import { StateView } from "@/components/states/StateView";
import { Avatar } from "@/components/Avatar";
import { isPlayableMediaUrl, playTrack, seekFraction, seek, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { trackFileSummary } from "@/lib/trackActions";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx, paletteFor, formatCount } from "@/lib/utils";
import type { Drop } from "@/types";
import { SparkDesk } from "@/features/sparks/SparkDesk";
import { ReceptionPanel } from "@/features/reception/ReceptionPanel";
import { useWorkingTrack } from "@/features/workspace/useWorkingTrack";
import { setWorkingTrackDawFolder } from "@/features/workspace/workingSet";
import {
  dawHintLabel,
  directoryPickerAvailable,
  pickDawProjectFolder,
} from "@/features/workspace/dawFolderLink";

type Tab = "overview" | "reception" | "comments" | "provenance";

/** Reception is what happened to your own work, so only the owner sees it. */
function tabsFor(isOwner: boolean): Tab[] {
  return isOwner
    ? ["overview", "reception", "comments", "provenance"]
    : ["overview", "comments", "provenance"];
}

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

/**
 * Single-track workspace: transport, high-resolution waveform, timestamped
 * comments and the provenance chain.
 *
 * Only surfaces backed by real records appear. Drops are not linked to release
 * projects, per-track credits or storefront packs in the current schema, so this
 * page says so rather than rendering empty panels for them.
 */
export function TrackDetailPage() {
  const { id } = useParams();
  const player = usePlayer();
  const { userId, showToast } = useSession();
  const [drop, setDrop] = useState<Drop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [prov, setProv] = useState<api.AssetProvenance | null>(null);
  const [comments, setComments] = useState<api.WaveComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    if (!id) {
      // A malformed route must resolve, not spin forever.
      setError("No track was specified.");
      setDrop(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [found] = await api.dropsByIds([id]);
      if (!found) {
        setError("This track does not exist, or you do not have access to it.");
        setDrop(null);
        return;
      }
      setDrop(found);
      void api.listWaveComments(id).then(setComments).catch(() => setComments([]));
      if (found.assetId) {
        void api.assetProvenance(found.assetId).then(setProv).catch(() => setProv(null));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this track");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const accent = useMemo(() => (drop ? paletteFor(drop.seed)[0] : "#00c2ff"), [drop]);

  if (loading) return <StateView variant="loading" title="Loading track" />;
  if (error || !drop) {
    return (
      <StateView
        variant={error ? "error" : "empty"}
        title="Track unavailable"
        body={error ?? "Not found."}
        action={
          <Link className="text-suite-cyan underline" to="/library">
            Library
          </Link>
        }
      />
    );
  }

  const isCurrent = player.track?.id === drop.id;
  const playing = isCurrent && player.playing;
  const playable = isPlayableMediaUrl(drop.audioUrl);
  const duration = (isCurrent ? player.duration : 0) || drop.durationSec || 0;
  const progress = isCurrent && duration > 0 ? player.currentTime / duration : 0;
  const peaks = drop.waveform?.length ? drop.waveform : undefined;
  const playhead = isCurrent ? player.currentTime : 0;

  function togglePlay() {
    if (!playable) {
      showToast("This track has no playable audio URL yet");
      return;
    }
    if (!isCurrent) void api.recordPlay(drop!.id);
    playTrack(toPlayerTrack(drop!));
  }

  async function postComment() {
    const body = commentBody.trim();
    if (!body || !id) return;
    setPosting(true);
    const res = await api.addWaveComment(id, body, Math.floor(playhead));
    setPosting(false);
    if (!res.ok) {
      showToast(res.error || "Could not post that comment");
      return;
    }
    setCommentBody("");
    showToast(`Comment added at ${fmtTime(playhead)}`);
    void api.listWaveComments(id).then(setComments).catch(() => undefined);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-12" data-testid="track-detail">
      <div className="flex items-center justify-between gap-2 text-xs">
        <Link to="/library" className="text-fog hover:text-snow">
          ← Library
        </Link>
        <button
          ref={moreRef}
          type="button"
          onClick={() => {
            const r = moreRef.current?.getBoundingClientRect();
            setMenuAnchor(r ? { x: r.right - 248, y: r.bottom + 6 } : { x: 16, y: 16 });
          }}
          aria-label={`Actions for ${drop.title?.trim() || "this track"}`}
          aria-haspopup="menu"
          aria-expanded={menuAnchor !== null}
          data-testid={`track-actions-${drop.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-white/70 hover:text-white active:scale-90"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {menuAnchor !== null && (
        <TrackActionMenu
          drop={drop}
          open
          anchor={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          returnFocusTo={moreRef.current}
          onPlay={togglePlay}
          onChanged={(c) => {
            if (c.kind === "renamed") setDrop((d) => (d ? { ...d, title: c.title || null } : d));
            if (c.kind === "deleted") setError("This track was deleted.");
          }}
        />
      )}

      <section className="forge-card relative overflow-hidden !p-0" data-dark-stage>
        <div className="relative h-44 w-full sm:h-56">
          <div className="absolute inset-0">
            <TrackVisualizer
              seed={drop.seed}
              accent={accent}
              active={playing}
              backdropUrl={drop.playbackCustomization?.backdropUrl ?? null}
              backdropFit={drop.playbackCustomization?.backdropFit}
              backdropDim={drop.playbackCustomization?.backdropDim}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-ink-950/80" />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            data-testid="track-detail-play"
            className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur transition active:scale-90"
            style={{ boxShadow: `0 0 36px -6px ${accent}` }}
          >
            {player.loading && isCurrent ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : playing ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-0.5 h-6 w-6" />
            )}
          </button>
        </div>

        <div className="p-4">
          <h1 className="font-display text-xl font-semibold text-white" data-testid="track-detail-title">
            {drop.title?.trim() || "Untitled"}
          </h1>
          <p className="mt-0.5 text-sm text-white/55">
            {drop.creditedArtist?.trim() || drop.authorUsername || "Unknown artist"}
            {drop.album?.trim() ? ` · ${drop.album.trim()}` : ""}
          </p>

          {peaks ? (
            <div className="relative mt-4">
              <Waveform
                peaks={peaks}
                progress={progress}
                accent={accent}
                height={72}
                onSeek={isCurrent ? (f) => seekFraction(f) : undefined}
              />
              {duration > 0 &&
                comments.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={`${fmtTime(c.timeSec)} — ${c.body}`}
                    onClick={() => {
                      if (isCurrent) seek(c.timeSec);
                      setTab("comments");
                    }}
                    className="absolute top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-suite-cyan ring-2 ring-abyss-950"
                    style={{ left: `${Math.min(100, (c.timeSec / duration) * 100)}%` }}
                    aria-label={`Comment at ${fmtTime(c.timeSec)}`}
                  />
                ))}
            </div>
          ) : (
            <p className="mt-4 text-[12px] text-white/35">
              No waveform was stored for this upload.
            </p>
          )}

          <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-white/40">
            <span>{fmtTime(isCurrent ? player.currentTime : 0)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
      </section>

      <nav className="flex gap-1.5" role="tablist" aria-label="Track sections">
        {tabsFor(drop.authorId === userId).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            data-testid={`track-tab-${t}`}
            className={cx(
              "rounded-full px-3.5 py-1.5 text-[12px] font-semibold capitalize transition",
              tab === t
                ? "bg-[rgb(var(--accent-rgb)/0.14)] text-white ring-1 ring-[rgb(var(--accent-rgb)/0.4)]"
                : "bg-white/[0.04] text-white/50 hover:text-white/80"
            )}
          >
            {t}
            {t === "comments" && comments.length > 0 ? ` (${comments.length})` : ""}
          </button>
        ))}
      </nav>

      {tab === "reception" && drop.authorId === userId && <ReceptionPanel dropId={drop.id} />}

      {tab === "overview" && (
        <>
          <Overview drop={drop} />
          {drop.authorId === userId ? (
            <div className="mt-4">
              <SparkDesk
                dropId={drop.id}
                durationSec={drop.durationSec ?? null}
                peaks={drop.waveform ?? null}
              />
            </div>
          ) : null}
        </>
      )}
      {tab === "comments" && (
        <Comments
          comments={comments}
          canPost={Boolean(userId)}
          playhead={playhead}
          isCurrent={isCurrent}
          body={commentBody}
          onBody={setCommentBody}
          posting={posting}
          onPost={() => void postComment()}
          onSeekTo={(s) => isCurrent && seek(s)}
        />
      )}
      {tab === "provenance" && <Provenance drop={drop} prov={prov} />}
    </div>
  );
}

function Overview({ drop }: { drop: Drop }) {
  const rows = trackFileSummary(drop);
  const track = useWorkingTrack();
  const { showToast } = useSession();
  const focusedHere = track?.dropId === drop.id;

  async function linkDawHere() {
    if (!focusedHere) {
      showToast("Focus this track in the song workspace banner first (drop it or open from Analyzer)");
      return;
    }
    if (!directoryPickerAvailable()) {
      showToast("Folder link needs Chrome/Edge directory access — Not available here");
      return;
    }
    try {
      const link = await pickDawProjectFolder();
      if (!link) return;
      setWorkingTrackDawFolder({ ...link, dropId: drop.id });
      showToast(`Linked “${link.folderName}” locally this session — not synced to cloud`);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      showToast((e as Error).message || "Could not read that folder");
    }
  }

  return (
    <div className="space-y-3" data-testid="track-overview">
      <section className="forge-card">
        <p className="nexus-eyebrow mb-2 flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" /> File
        </p>
        <dl className="divide-y divide-[var(--hairline)]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-[11px] uppercase tracking-wide text-white/35">{r.label}</dt>
              <dd className="min-w-0 truncate text-right text-[13px] text-white/80">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[10px] leading-snug text-white/25">
          Values stored with the upload. Fields VYBZ has not measured are omitted rather than
          estimated.
        </p>
      </section>

      <section className="forge-card" data-testid="track-daw-folder">
        <p className="nexus-eyebrow mb-2">DAW project folder</p>
        <p className="text-[12px] text-white/45">
          Optional local link for this session only. VYBZ does not sync Ableton Live or merge{" "}
          <code className="text-white/55">.als</code> XML. Durable cloud project-folder storage is
          Not available on this track record yet.
        </p>
        {focusedHere && track?.dawFolder ? (
          <p className="mt-2 text-[12px] text-white/70" data-testid="track-daw-folder-linked">
            Linked: {track.dawFolder.folderName} · {dawHintLabel(track.dawFolder.dawHint)} ·{" "}
            {track.dawFolder.fileCount} files — local session
          </p>
        ) : null}
        <button
          type="button"
          data-testid="track-daw-folder-link"
          className="btn btn-ghost mt-3 px-3 py-1.5 text-[12px]"
          onClick={() => void linkDawHere()}
        >
          {focusedHere ? "Link DAW folder (optional)" : "Focus track in workspace to link folder"}
        </button>
      </section>

      <section className="forge-card">
        <p className="nexus-eyebrow mb-2">Engagement</p>
        <ul className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Plays" value={formatCount(drop.plays ?? 0)} />
          <Stat label="Vybs" value={formatCount(drop.feels)} />
          <Stat
            label="Rating"
            value={drop.ratingCount ? `${(drop.rating ?? 0).toFixed(1)} (${drop.ratingCount})` : "—"}
          />
        </ul>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-white/30">
        Tracks are not yet linked to release projects, per-track credits or storefront packs — those
        live in separate systems today, so nothing is shown for them here.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-xl bg-white/[0.03] px-2 py-2.5">
      <span className="block font-display text-base font-semibold text-white">{value}</span>
      <span className="block text-[10px] uppercase tracking-wide text-white/35">{label}</span>
    </li>
  );
}

function Comments({
  comments,
  canPost,
  playhead,
  isCurrent,
  body,
  onBody,
  posting,
  onPost,
  onSeekTo,
}: {
  comments: api.WaveComment[];
  canPost: boolean;
  playhead: number;
  isCurrent: boolean;
  body: string;
  onBody: (v: string) => void;
  posting: boolean;
  onPost: () => void;
  onSeekTo: (s: number) => void;
}) {
  return (
    <div className="space-y-3" data-testid="track-comments">
      {canPost && (
        <div className="forge-card">
          <label htmlFor="wave-comment" className="nexus-eyebrow mb-2 block">
            Comment at {fmtTime(playhead)}
          </label>
          <div className="flex gap-2">
            <input
              id="wave-comment"
              value={body}
              onChange={(e) => onBody(e.target.value.slice(0, 280))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onPost();
              }}
              placeholder={isCurrent ? "Note this moment…" : "Play the track to timestamp a note"}
              data-testid="wave-comment-input"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={onPost}
              disabled={posting || !body.trim()}
              data-testid="wave-comment-post"
              className="btn btn-primary shrink-0 disabled:opacity-40"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </button>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="forge-card flex items-center gap-3 !py-5 text-sm text-white/45">
          <MessageSquare className="h-4 w-4 shrink-0 text-white/30" />
          No timestamped notes on this track yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="forge-card flex gap-3 !py-3">
              <Avatar url={c.avatarUrl} name={c.username} id={c.userId} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[12px]">
                  <span className="truncate font-medium text-white/80">
                    {c.username ? `@${c.username}` : "Listener"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSeekTo(c.timeSec)}
                    className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-suite-cyan hover:bg-white/10"
                  >
                    {fmtTime(c.timeSec)}
                  </button>
                </p>
                <p className="mt-0.5 break-words text-[13px] leading-relaxed text-white/70">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Provenance({ drop, prov }: { drop: Drop; prov: api.AssetProvenance | null }) {
  if (!drop.assetId) {
    return (
      <div className="forge-card text-sm text-white/45" data-testid="track-provenance">
        No downloadable asset is attached to this track, so there is no provenance chain to show.
      </div>
    );
  }
  if (!prov) {
    return (
      <div className="forge-card text-sm text-white/45" data-testid="track-provenance">
        Provenance is not available for this asset.
      </div>
    );
  }
  return (
    <section className="forge-card" data-testid="track-provenance">
      <p className="nexus-eyebrow mb-2 flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Provenance
      </p>
      <dl className="divide-y divide-[var(--hairline)]">
        <Row
          label="First seen on VYBZ"
          value={prov.firstSeen ? new Date(prov.firstSeen).toLocaleString() : "Not recorded"}
        />
        <Row label="Download grants" value={String(prov.downloads)} />
        <Row label="Watermarked deliveries" value={String(prov.watermarks)} />
        <Row label="License events" value={String(prov.licenseEvents)} />
        <Row label="Content hash" value={prov.sha256 ? `${prov.sha256.slice(0, 24)}…` : "Not recorded"} />
      </dl>
      <p className="mt-2 text-[10px] leading-snug text-white/25">
        Aggregate counts from the provenance ledger. Individual recipients are never shown.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[11px] uppercase tracking-wide text-white/35">{label}</dt>
      <dd className="min-w-0 truncate text-right font-mono text-[12px] text-white/80">{value}</dd>
    </div>
  );
}
