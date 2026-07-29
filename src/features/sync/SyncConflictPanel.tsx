import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  getGlobalSyncOrchestrator,
  type SyncConflict,
} from "@/platform/sync/syncOnReconnect";
import type { ConflictChoice } from "@/platform/sync/fieldMerge";

/** Accept mine / theirs for credits & metadata sync conflicts. */
export function SyncConflictPanel({ projectId }: { projectId?: string }) {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  useEffect(() => {
    const orch = getGlobalSyncOrchestrator();
    if (!orch) return;
    const apply = () => {
      const all = orch.listConflicts();
      setConflicts(projectId ? all.filter((c) => c.projectId === projectId) : all);
    };
    apply();
    return orch.subscribe(apply);
  }, [projectId]);

  if (!conflicts.length) return null;

  async function resolve(id: string, choice: ConflictChoice) {
    await getGlobalSyncOrchestrator()?.resolve(id, choice);
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-suite border border-amber-400/30 bg-amber-400/5 p-4"
      data-testid="sync-conflict"
      role="region"
      aria-label="Sync conflicts"
    >
      <p className="text-sm font-medium text-snow">Sync conflict</p>
      <p className="text-xs text-fog">
        Offline edits disagree on the same field. Choose which version to keep.
      </p>
      {conflicts.map((c) => (
        <div key={c.id} className="flex flex-col gap-2 border-t border-white/10 pt-3" data-testid="sync-conflict-row">
          <p className="text-xs text-fog">
            Field <span className="text-snow">{c.field}</span>
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-suite-md border border-white/10 bg-abyss/40 p-2" data-testid="sync-conflict-mine">
              <p className="text-[10px] uppercase tracking-wide text-fog">Mine</p>
              <p className="truncate text-snow">{formatValue(c.mine)}</p>
            </div>
            <div className="rounded-suite-md border border-white/10 bg-abyss/40 p-2" data-testid="sync-conflict-theirs">
              <p className="text-[10px] uppercase tracking-wide text-fog">Theirs</p>
              <p className="truncate text-snow">{formatValue(c.theirs)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              data-testid="sync-accept-mine"
              onClick={() => void resolve(c.id, "mine")}
            >
              Accept mine
            </Button>
            <Button
              size="sm"
              variant="secondary"
              data-testid="sync-accept-theirs"
              onClick={() => void resolve(c.id, "theirs")}
            >
              Accept theirs
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v && "displayName" in v) {
    return String((v as { displayName: unknown }).displayName);
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
