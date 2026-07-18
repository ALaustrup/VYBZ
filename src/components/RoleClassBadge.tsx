import { Briefcase, Compass, GraduationCap, Heart, Megaphone } from "lucide-react";
import { ROLE_CLASS_LABEL, isAdjacentClass } from "@/lib/profileFields";
import { cx } from "@/lib/utils";

const ICON: Record<string, typeof Heart> = {
  supporter: Heart, booker: Briefcase, curator: Compass, brand: Megaphone, educator: GraduationCap,
};

/**
 * Identity badge for creator-adjacent Role Classes (Phase O1). Renders nothing
 * for `creator` (the default) — creators are identified by their profession.
 */
export function RoleClassBadge({ roleClass, className }: { roleClass?: string | null; className?: string }) {
  if (!isAdjacentClass(roleClass)) return null;
  const Icon = ICON[roleClass as string] ?? Heart;
  return (
    <span className={cx("mt-1 inline-flex items-center gap-1 rounded-full bg-aqua-400/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aqua-100 ring-1 ring-aqua-400/30", className)}>
      <Icon className="h-3 w-3" />
      {ROLE_CLASS_LABEL[roleClass as string] ?? roleClass}
    </span>
  );
}
