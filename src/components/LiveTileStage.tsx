import { DropStage } from "@/components/DropStage";
import { cx } from "@/lib/utils";

/**
 * Ambient reactive stage for live discovery tiles (no MediaStream yet).
 * Seeded DropStage keeps Top-3 / Live list visually alive without stealing audio.
 */
export function LiveTileStage({
  seed,
  accent = "#34f5a0",
  className,
}: {
  seed: number;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <DropStage seed={seed} accent={accent} active className="opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent" />
    </div>
  );
}

/** Stable seed from host id for deterministic live tile look. */
export function liveSeedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) || 1;
}
