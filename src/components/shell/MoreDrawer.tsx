import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Images,
  MessageSquare,
  Plus,
  Radio,
  ScrollText,
  Shield,
  ShieldCheck,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/store/session";
import { useReduceFx } from "@/lib/display";
import { drawerVariants, overlayVariants, springDrawer, withReduce } from "@/lib/motion";
import { cx } from "@/lib/utils";

type MoreItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Show only for mod/admin. */
  staff?: "mod" | "admin";
  /** Show only for non-staff members (e.g. apply). */
  memberOnly?: boolean;
};

type MoreSection = {
  id: string;
  label: string;
  items: MoreItem[];
};

/** Overflow only — Network/Studio hubs live on pins + Network strip. */
const MORE_SECTIONS: MoreSection[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "library", label: "Library", to: "/library", icon: Images },
      { id: "social", label: "Social", to: "/social", icon: Radio },
      { id: "rooms", label: "Rooms", to: "/rooms", icon: MessageSquare },
      { id: "store", label: "Store", to: "/store", icon: Store },
      { id: "activity", label: "Activity", to: "/activity", icon: Bell },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    items: [
      { id: "codex", label: "Codex & Legal", to: "/codex", icon: ScrollText },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    items: [
      { id: "mod", label: "Moderate", to: "/mod", icon: Shield, staff: "mod" },
      { id: "admin", label: "Admin", to: "/admin", icon: ShieldCheck, staff: "admin" },
      { id: "apply-mod", label: "Become a moderator", to: "/apply-mod", icon: Shield, memberOnly: true },
    ],
  },
];

function canSee(item: MoreItem, role: string, isAdmin: boolean): boolean {
  if (item.staff === "admin") return isAdmin || role === "admin";
  if (item.staff === "mod") return isAdmin || role === "admin" || role === "moderator";
  if (item.memberOnly) return !isAdmin && role === "member";
  return true;
}

/**
 * Secondary navigation drawer (3C). Keeps the V-Dock clean — overflow
 * destinations live here behind the AppBar menu control.
 */
export function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { profile, unread } = useSession();
  const reduce = useReduceFx();
  const role = profile?.platformRole ?? "member";
  const isAdmin = !!profile?.isAdmin || role === "admin";
  const vc = profile?.modPoints ?? 0;

  function go(to: string) {
    onClose();
    navigate(to);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={withReduce(reduce, { duration: 0.18 })}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="More"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={withReduce(reduce, springDrawer)}
            className="mat-surface-strong fixed inset-y-0 right-0 z-[70] flex w-[min(100%,22rem)] flex-col border-l border-white/10"
          >
            <div className="border-b border-[var(--hairline)] px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">More</h2>
                  <p className="text-[12px] text-white/40">Secondary destinations</p>
                </div>
                <button type="button" aria-label="Close" onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => go("/store")}
                className="mat-surface mt-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99]"
                aria-label={`V¢ balance ${vc}. Top up.`}
              >
                <span className="font-display text-[15px] font-semibold tracking-tight text-white">
                  {vc.toLocaleString()} <span className="text-cyan-200">V¢</span>
                </span>
                <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/15 text-cyan-100">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </button>
            </div>

            <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {MORE_SECTIONS.map((section) => {
                const items = section.items.filter((item) => canSee(item, role, isAdmin));
                if (!items.length) return null;
                return (
                  <div key={section.id} className="mb-5">
                    <p className="eyebrow mb-2 px-2">{section.label}</p>
                    <ul className="space-y-1">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const badge = item.id === "activity" && unread > 0 ? unread : 0;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => go(item.to)}
                              className={cx(
                                "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                                "border border-transparent hover:border-white/10 hover:bg-white/[0.05] active:scale-[0.99]",
                              )}
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-100/90">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-white/85">
                                {item.label}
                              </span>
                              {badge > 0 && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-wild px-1.5 text-[10px] font-bold text-white">
                                  {badge > 9 ? "9+" : badge}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
