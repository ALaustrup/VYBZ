import { useEffect, useState } from "react";
import type { MergeResult } from "@vybz/domain/collab";
import {
  getClientBaseVersion,
  getLocalReleaseDoc,
  mergeReleaseMetadataLocalStore,
  setClientBaseVersion,
  setLocalReleaseDoc,
} from "@/platform/collab";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { applyConflictChoice } from "@/platform/sync/fieldMerge";

/** Demo / e2e surface for conflict-safe server merge (local store). */
export function CollabMergePanel(props: {
  releaseId: string;
  /** When true, attempt merge on mount so e2e can assert conflict UI without click races. */
  seedConflict?: boolean;
}) {
  const { releaseId } = props;
  const [title, setTitle] = useState(() => getLocalReleaseDoc(releaseId).title);
  const [version, setVersion] = useState(() => getClientBaseVersion(releaseId));
  const [conflict, setConflict] = useState<Extract<MergeResult, { status: "conflict" }> | null>(
    null
  );
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!props.seedConflict) return;
    const expected = getClientBaseVersion(releaseId);
    const result = mergeReleaseMetadataLocalStore(releaseId, expected, { title });
    if (result.status === "conflict") {
      setConflict(result);
      setStatus("Conflict");
    }
    // Mount-only seed for Playwright.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.seedConflict, releaseId]);

  function save() {
    const expected = getClientBaseVersion(releaseId);
    const result = mergeReleaseMetadataLocalStore(releaseId, expected, { title });
    if (result.status === "applied") {
      setClientBaseVersion(releaseId, result.rowVersion);
      setVersion(result.rowVersion);
      setConflict(null);
      setStatus(`Applied · v${result.rowVersion}`);
      return;
    }
    setConflict(result);
    setStatus("Conflict");
  }

  function simulateTheirs() {
    const cur = getLocalReleaseDoc(releaseId);
    // Bump server doc only — client base stays stale for the next save.
    setLocalReleaseDoc(releaseId, {
      ...cur,
      title: "Server Title",
      rowVersion: cur.rowVersion + 1,
    });
    setStatus(`Server bumped to v${cur.rowVersion + 1}`);
  }

  function resolve(choice: "mine" | "theirs") {
    if (!conflict) return;
    const merged = applyConflictChoice(
      choice,
      { title: conflict.patch.title ?? title },
      { title: conflict.current.title ?? "Untitled" },
      ["title"]
    );
    const doc = getLocalReleaseDoc(releaseId);
    const applied = mergeReleaseMetadataLocalStore(releaseId, doc.rowVersion, {
      title: String(merged.title ?? ""),
    });
    if (applied.status === "applied") {
      setClientBaseVersion(releaseId, applied.rowVersion);
      setTitle(String(merged.title ?? ""));
      setVersion(applied.rowVersion);
      setConflict(null);
      setStatus(`Resolved (${choice}) · v${applied.rowVersion}`);
    }
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-suite border border-white/10 bg-white/[0.03] p-4"
      data-testid="collab-merge-panel"
      aria-label="Conflict-safe merge"
    >
      <h2 className="text-sm font-semibold text-snow">Metadata merge</h2>
      <p className="text-xs text-fog">
        Optimistic concurrency · local row version{" "}
        <span data-testid="collab-row-version">{version}</span>
      </p>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="collab-merge-title"
        data-collab-field="title"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" data-testid="collab-merge-save" onClick={save}>
          Save merge
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-testid="collab-merge-simulate-theirs"
          onClick={simulateTheirs}
        >
          Simulate theirs
        </Button>
      </div>
      {status && (
        <p className="text-xs text-fog" data-testid="collab-merge-status">
          {status}
        </p>
      )}
      {conflict && (
        <div
          className="rounded-suite border border-amber-400/30 bg-amber-400/5 p-3"
          data-testid="collab-merge-conflict"
          role="alert"
        >
          <p className="text-xs text-snow">Version conflict on title</p>
          <p className="mt-1 text-xs text-fog">
            Mine: {String(conflict.patch.title)} · Theirs: {String(conflict.current.title)}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" data-testid="collab-merge-accept-mine" onClick={() => resolve("mine")}>
              Accept mine
            </Button>
            <Button
              size="sm"
              variant="secondary"
              data-testid="collab-merge-accept-theirs"
              onClick={() => resolve("theirs")}
            >
              Accept theirs
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
