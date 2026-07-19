import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cx } from "@/lib/utils";
import { useReduceFx } from "@/lib/display";

/**
 * Quiet Studio Glass page title — sign-in cadence: white word, one soft line,
 * no halo icon, no accent paint. Icon prop kept for call-site compatibility
 * but rendered only as a whisper (optional).
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
  back,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  /** Optional leading control (e.g. back button). */
  back?: React.ReactNode;
}) {
  const reduce = useReduceFx();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cx("px-5 pt-4 pb-3 max-lg:pr-14", className)}
    >
      <div className="flex items-start gap-3">
        {back}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {Icon && <Icon className="relative top-0.5 h-4 w-4 shrink-0 text-white/35" aria-hidden />}
            <h1 className="truncate font-display text-[1.65rem] font-semibold tracking-tight text-white">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="mt-1 max-w-md text-[13px] leading-snug text-white/45">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div>}
      </div>
      <div className="mt-4 h-px w-full bg-[var(--hairline)]" />
    </motion.div>
  );
}
