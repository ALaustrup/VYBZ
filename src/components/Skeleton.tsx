import { cx } from "@/lib/utils";

/**
 * A shimmering placeholder block. Used instead of generic spinners so loading
 * states preview the shape of the content that's coming — a more premium,
 * less "is it broken?" feel.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("shimmer rounded-lg", className)} aria-hidden />;
}

/** A list-row skeleton (avatar + two lines), matching CircleRow / message rows. */
export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-2.5 w-3/4" />
      </div>
    </div>
  );
}

/** A vertical stack of row skeletons. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}
