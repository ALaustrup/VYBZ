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

  useRegisterAppBar({ title: "Make pack", subtitle: "Stage 0 · Upload" }, []);

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
      eyebrow="Stage 0"
      title="Upload assets"
      subtitle="Drop loops, oneshots and phrases. They upload while you stay here. Continue when you are ready — this step does not invent a pack."
      testId="pack-upload-stage"
    >
      <ForgeDropzone
        label="Drop audio here"
        hint="or click to choose · upload starts immediately"
        accept={AUDIO_ACCEPT}
        multiple
        inputTestId="pack-upload-input"
        onFiles={takeFiles}
      />

      {items.length > 0 ? (
        <ul className="space-y-2" data-testid="pack-upload-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="forge-card flex items-center justify-between gap-3 !rounded-xl px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-white/85">{item.name}</p>
                <p className="text-[11px] text-white/40">{itemStatusLabel(item)}</p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-white/35">{item.percent}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-white/40">No files yet. A later stage can also pull from Library.</p>
      )}

      {items.length > 0 ? (
        <div className="space-y-3">
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
      ) : (
        <p className="flex items-center gap-2 text-[12px] text-white/30">
          <AudioLines className="h-4 w-4" />
          Continue skips nothing required — an empty library just means later stages start empty.
        </p>
      )}
    </ToolWorkbench>
  );
}
