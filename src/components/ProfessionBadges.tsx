import { PROFESSION_LABEL } from "@/lib/profileFields";
import { cx } from "@/lib/utils";

/** A creator's profession(s): primary highlighted, secondaries subtle. */
export function ProfessionBadges({ primary, all, className }: { primary?: string | null; all?: string[]; className?: string }) {
  const list = all && all.length ? all : primary ? [primary] : [];
  if (list.length === 0) return null;
  // Ensure primary shows first.
  const ordered = primary ? [primary, ...list.filter((x) => x !== primary)] : list;
  return (
    <div className={cx("mt-1 flex flex-wrap gap-1.5", className)}>
      {ordered.map((id) => {
        const isPrimary = id === (primary ?? ordered[0]);
        return (
          <span key={id} className={cx("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            isPrimary ? "bg-veil-500/25 text-veil-100 ring-1 ring-veil-400/40" : "bg-white/8 text-white/60")}>
            {PROFESSION_LABEL[id] ?? id}
          </span>
        );
      })}
    </div>
  );
}
