import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cx } from "@/lib/utils";
import { useReduceFx } from "@/lib/display";

/**
 * The signature surface header. Gives every page a distinct, accent-aware
 * identity: a haloed surface icon (glows the current --accent-rgb), a display
 * title that carries the page's colour, a one-line "why this page exists"
 * subtitle, and an accent hairline. Consistent rhythm, distinct colour per
 * surface — the antidote to "every tab feels the same".
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReduceFx();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cx("accent-fade px-5 pt-4", className)}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-veil-500/15 ring-1 ring-veil-400/40">
            <span aria-hidden className="absolute inset-0 rounded-2xl bg-veil-radial" />
            <Icon className="nav-icon-active relative h-5 w-5 text-veil-100" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-bold text-gradient">{title}</h1>
          {subtitle && <p className="truncate text-[13px] text-white/50">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-veil-500/50 via-veil-500/10 to-transparent" />
    </motion.div>
  );
}
