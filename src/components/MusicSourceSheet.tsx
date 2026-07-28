import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, Loader2, Music2, Upload, Library, X, Disc3, Sparkles } from "lucide-react";
import { useSession } from "@/store/session";
import { FLAGS } from "@/lib/flags";
import {
  connectSpotifyPlaylist,
  loadCachedPlaylistMeta,
  parseSpotifyPlaylistUrl,
  type ConnectedPlaylist,
} from "@/lib/playlistConnect";
import {
  loadForYouIntoPlayer,
  loadMyDropsIntoPlayer,
  loadOwnDropsIntoPlayer,
  uploadLocalFilesToPlayer,
} from "@/lib/playerMusic";
import { AUDIO_ACCEPT } from "@/lib/waveform";
import { OverlayPortal } from "@/lib/overlayPortal";
import { cx } from "@/lib/utils";

type Tab = "upload" | "connect" | "library";

/**
 * Floating popout window — upload / connect / library / For You into the player queue.
 */
export function MusicSourceSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { userId, profile, showToast } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("upload");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState<ConnectedPlaylist | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setConnected(loadCachedPlaylistMeta(userId));
    setUrl("");
    setBusy(false);
    setTab("upload");
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function onFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true);
    try {
      const n = await uploadLocalFilesToPlayer(files, { replace: false });
      if (!n) showToast("Pick audio files (mp3, wav, flac…)");
      else {
        showToast(n === 1 ? "Added to player" : `Added ${n} tracks`);
        onClose();
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submitPlaylist() {
    if (!userId || busy) return;
    if (!parseSpotifyPlaylistUrl(url)) {
      showToast("Paste a Spotify playlist URL");
      return;
    }
    setBusy(true);
    const res = await connectSpotifyPlaylist(userId, url);
    setBusy(false);
    if (!res) {
      showToast("Couldn't import that playlist");
      return;
    }
    setConnected(res.playlist);
    showToast(`Playing · ${res.playlist.title}`);
    onClose();
  }

  async function loadMine() {
    if (!userId || busy) return;
    setBusy(true);
    const n = await loadOwnDropsIntoPlayer(userId);
    setBusy(false);
    if (!n) showToast("No playable drops on your profile yet");
    else {
      showToast(`Playing ${n} of your drops`);
      onClose();
    }
  }

  async function loadNetwork() {
    if (busy) return;
    setBusy(true);
    const n = await loadMyDropsIntoPlayer();
    setBusy(false);
    if (!n) showToast("No playable drops in the network feed");
    else {
      showToast(`Playing ${n} drops`);
      onClose();
    }
  }

  async function loadForYou() {
    if (busy) return;
    setBusy(true);
    const n = await loadForYouIntoPlayer();
    setBusy(false);
    if (!n) showToast("For You is empty — listen & rate to sharpen taste");
    else {
      showToast(`For You · ${n} tracks`);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <OverlayPortal>
          <motion.button
            type="button"
            aria-label="Dismiss"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] cursor-default bg-[#071018]/55 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Add music"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[91] flex w-[min(100%-1.5rem,24rem)] -translate-x-1/2 flex-col overflow-hidden rounded-[1.75rem] border border-white/20 shadow-[0_28px_80px_-24px_rgba(8,40,80,0.55)] sm:top-[10vh]"
            style={{
              background: "linear-gradient(165deg, rgba(255,255,255,0.16), rgba(180,220,255,0.08) 42%, rgba(12,24,48,0.72))",
              backdropFilter: "blur(28px) saturate(1.55)",
              WebkitBackdropFilter: "blur(28px) saturate(1.55)",
              maxHeight: "min(78dvh, calc(100dvh - var(--dock-reserve, 6.25rem) - 2rem))",
            }}
            data-dark-stage
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
              <Music2 className="h-4 w-4 text-[rgb(var(--neon-cyan))]" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-semibold text-white">Add music</p>
                <p className="text-[11px] text-white/40">Upload · connect · library</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-white/70 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex shrink-0 gap-1 border-b border-white/8 px-3 pt-2">
              {([
                { id: "upload" as const, label: "Upload", icon: Upload },
                { id: "connect" as const, label: "Connect", icon: Link2 },
                { id: "library" as const, label: "Library", icon: Library },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cx(
                    "relative flex flex-1 items-center justify-center gap-1 pb-2.5 text-[12px] font-medium transition",
                    tab === id ? "text-white" : "text-white/40 hover:text-white/70",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                  {tab === id && <span className="absolute inset-x-2 bottom-0 h-px bg-[rgb(var(--neon-cyan)/0.7)]" />}
                </button>
              ))}
            </div>

            <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {tab === "upload" && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={AUDIO_ACCEPT}
                    multiple
                    className="hidden"
                    onChange={(e) => void onFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-8 text-center transition hover:border-[rgb(var(--neon-cyan)/0.45)] hover:bg-[rgb(var(--neon-cyan)/0.06)] active:scale-[0.99] disabled:opacity-40"
                  >
                    {busy ? (
                      <Loader2 className="h-7 w-7 animate-spin text-[rgb(var(--neon-cyan))]" />
                    ) : (
                      <Upload className="h-7 w-7 text-[rgb(var(--neon-cyan))]" />
                    )}
                    <span className="font-display text-sm font-semibold text-white">Upload audio</span>
                    <span className="text-[11px] text-white/45">MP3, WAV, FLAC, M4A · multi-select OK</span>
                  </button>
                  <p className="text-[11px] leading-relaxed text-white/35">
                    Local files play in this session. Post a Drop to share with the network.
                  </p>
                </>
              )}

              {tab === "connect" && (
                <>
                  {connected && (
                    <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--neon-mint)/0.25)] bg-[rgb(var(--neon-mint)/0.08)] px-3 py-2 text-sm text-white/85">
                      <Music2 className="h-4 w-4 shrink-0 text-[rgb(var(--neon-mint))]" />
                      <span className="min-w-0 flex-1 truncate">{connected.title}</span>
                    </div>
                  )}
                  {FLAGS.oauthSpotify && (
                    <button
                      type="button"
                      className="btn btn-ghost w-full justify-center gap-2 py-2.5 text-sm"
                      onClick={() => showToast("Spotify OAuth — enable edge secrets to finish")}
                    >
                      <Link2 className="h-4 w-4" /> Connect Spotify account
                    </button>
                  )}
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/…"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy || !url.trim()}
                    onClick={() => void submitPlaylist()}
                    className="btn btn-primary w-full py-3 disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import playlist"}
                  </button>
                </>
              )}

              {tab === "library" && (
                <>
                  <button
                    type="button"
                    disabled={busy || !userId}
                    onClick={() => void loadForYou()}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-[rgb(var(--neon-cyan)/0.45)] active:scale-[0.99] disabled:opacity-40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--neon-cyan)/0.15)] text-[rgb(var(--neon-cyan))]">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-semibold text-white">For You</span>
                      <span className="block text-[11px] text-white/45">Taste + discovery radio into VDock</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy || !userId}
                    onClick={() => void loadMine()}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-[rgb(var(--neon-mint)/0.4)] active:scale-[0.99] disabled:opacity-40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--neon-mint)/0.15)] text-[rgb(var(--neon-mint))]">
                      <Disc3 className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-semibold text-white">My drops</span>
                      <span className="block text-[11px] text-white/45">
                        {profile?.username ? `@${profile.username}` : "Your uploaded tracks"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void loadNetwork()}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-[rgb(var(--neon-cyan)/0.4)] active:scale-[0.99] disabled:opacity-40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--neon-cyan)/0.15)] text-[rgb(var(--neon-cyan))]">
                      <Library className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-sm font-semibold text-white">Network drops</span>
                      <span className="block text-[11px] text-white/45">Playable tracks from the feed</span>
                    </span>
                  </button>
                  {busy && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-veil-300" />
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  );
}

/** @deprecated Prefer MusicSourceSheet */
export { MusicSourceSheet as PlaylistConnectSheet };
