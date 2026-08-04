import { useEffect, useState } from "react";
import { AudioLines, Play, Star } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { EmptyState } from "@/components/EmptyState";
import type { Drop } from "@/types";

/**
 * The creator's own upload manager (Library). Management actions live in the shared
 * contextual track menu, so this surface shows per-drop stats and delegates rename,
 * feature and delete to `TrackActionMenu` (owner-scoped via RLS and a guarded RPC).
 */
export function UploadsLibrary({
  initialDrops,
  featuredId,
  onFeaturedChange,
}: {
  initialDrops: Drop[];
  featuredId?: string | null;
  onFeaturedChange?: () => void;
}) {
  const [drops, setDrops] = useState<Drop[]>(initialDrops);
  useEffect(() => {
    setDrops(initialDrops);
  }, [initialDrops]);

  function applyChange(change: { kind: "deleted" | "renamed" | "featured"; dropId: string; title?: string }) {
    if (change.kind === "deleted") {
      setDrops((l) => l.filter((x) => x.id !== change.dropId));
      if (change.dropId === featuredId) onFeaturedChange?.();
      return;
    }
    if (change.kind === "renamed") {
      setDrops((l) =>
        l.map((x) => (x.id === change.dropId ? { ...x, title: change.title?.trim() || null } : x)),
      );
      return;
    }
    onFeaturedChange?.();
  }

  if (drops.length === 0) {
    return (
      <EmptyState
        icon={AudioLines}
        title="No drops yet"
        body="Share your first sound from the feed — it'll live here for you to manage."
      />
    );
  }

  const featured = drops.find((d) => d.id === featuredId) ?? drops[0];
  const rest = drops.filter((d) => d.id !== featured.id);

  return (
    <div className="space-y-4">
      <div>
        <TrackCard
          drop={featured}
          queue={drops}
          isFeatured
          onChanged={applyChange}
        />
        <Stats d={featured} isFeatured />
      </div>
      {rest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {rest.map((d) => (
            <div key={d.id}>
              <TrackCard drop={d} queue={drops} compact onChanged={applyChange} />
              <Stats d={d} isFeatured={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stats({ d, isFeatured }: { d: Drop; isFeatured: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="mr-auto flex items-center gap-3 text-[11px] text-white/45">
        <span className="flex items-center gap-1" title="Plays">
          <Play className="h-3 w-3" />
          {d.plays ?? 0}
        </span>
        <span title="Vyb reactions">♥ {d.feels}</span>
        <span title="Fail reactions">✕ {d.wilds}</span>
        {d.ratingCount ? (
          <span className="flex items-center gap-1" title="Rating">
            <Star className="h-3 w-3 text-amber-300" fill="currentColor" />
            {(d.rating ?? 0).toFixed(1)} ({d.ratingCount})
          </span>
        ) : null}
      </span>
      {isFeatured && (
        <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
          <Star className="h-3 w-3" fill="currentColor" /> Featured
        </span>
      )}
    </div>
  );
}
