import { useState } from "react";
import { AudioLines, Loader2, Send } from "lucide-react";
import { OriginalityClaim } from "@/components/OriginalityClaim";
import { ForgeDropzone, ToolWorkbench } from "@/components/ToolWorkbench";
import {
  buildDropInput,
  canReleaseItem,
  clearReleasedUploads,
  enqueueUploads,
  itemStatusLabel,
  markUploadFailed,
  markUploadReleased,
  summarizeQueue,
  useUploadQueue,
} from "@/features/upload/uploadQueue";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import * as api from "@/lib/api";
import { AUDIO_ACCEPT, acousticSignature } from "@/lib/waveform";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";
import type { PostAudience } from "@/types";

/**
 * Stage 0 — upload. Same queue as ComposeSheet. The sheet stays in the tree;
 * this page is the guided front door.
 */
export function PackUploadStage() {
  const { showToast } = useSession();
  const items = useUploadQueue();
  const summary = summarizeQueue(items);
  const [ownershipClaim, setOwnershipClaim] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [audience] = useState<PostAudience>("private");

  useRegisterAppBar({ title: "Make pack", subtitle: "Upload" }, []);

  const releasable = items.filter(canReleaseItem);

  function takeFiles(list: FileList | File[] | null) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    enqueueUploads(files);
  }

  async function releaseAll() {
    if (!releasable.length || releasing) return;
    if (!ownershipClaim) {
      showToast("Check the originality box — VYBZ is for your own music.");
      return;
    }
    setReleasing(true);
    let ok = 0;
    try {
      for (const item of releasable) {
        const fingerprint = await acousticSignature(item.meta.peaks).catch(() => undefined);
        const drop = await api.createDrop(
          buildDropInput(item, { audience, releaseType: "original", fingerprint }),
        );
        if (drop) {
          markUploadReleased(item.id, drop.id);
          ok++;
        } else {
          markUploadFailed(item.id, "Couldn't create the drop. Retry.");
        }
      }
    } finally {
      setReleasing(false);
    }
    if (ok > 0) {
      showToast(ok === 1 ? "1 file in your library" : `${ok} files in your library`);
      clearReleasedUploads();
    }
  }

  return (
    <ToolWorkbench
      eyebrow="Session"
      title="Drop the session"
      subtitle="Loops, oneshots, phrases. Bytes move the moment they land. Continue when you are ready."
      testId="pack-upload-stage"
      className="max-w-4xl"
    >
      <ForgeDropzone
        label="Drop audio here"
        hint="WAV, AIFF, FLAC, MP3 · upload starts immediately"
        accept={AUDIO_ACCEPT}
        multiple
        inputTestId="pack-upload-input"
        className="!py-16"
        onFiles={takeFiles}
      />

      {items.length > 0 ? (
        <ul className="space-y-2" data-testid="pack-upload-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-white/90">{item.name}</p>
                  <p className="text-[11px] text-white/40">{itemStatusLabel(item)}</p>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-white/40">{item.percent}%</span>
              </div>
              <div className="h-0.5 bg-white/[0.06]">
                <div
                  className="h-full bg-[rgb(var(--app-accent-rgb))] transition-[width]"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-[13px] text-white/35">
          <AudioLines className="h-4 w-4" />
          Nothing in the tray yet. You can still Continue — later stages just start empty.
        </p>
      )}

      {items.length > 0 ? (
        <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
          <OriginalityClaim checked={ownershipClaim} onChange={setOwnershipClaim} />
          <button
            type="button"
            disabled={!releasable.length || releasing || !ownershipClaim}
            data-testid="pack-upload-release"
            onClick={() => void releaseAll()}
            className={cx("btn btn-primary w-full py-3 disabled:opacity-40")}
          >
            {releasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {releasable.length > 1 ? `Save ${releasable.length} to Library` : "Save to Library"}
          </button>
          {summary.inFlight > 0 ? (
            <p className="text-center text-[11px] text-white/35">
              {summary.inFlight} still uploading · {summary.percent}%
            </p>
          ) : null}
        </div>
      ) : null}
    </ToolWorkbench>
  );
}
