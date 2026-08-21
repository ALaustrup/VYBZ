import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "@/store/session";
import { useReduceFx } from "@/lib/display";
import { drawerVariants, overlayVariants, springDrawer, withReduce } from "@/lib/motion";
import { formatVc, formatVcAddress, vcToUsd } from "@/lib/vc";
import { cx } from "@/lib/utils";
import { BuildStamp } from "@/components/BuildStamp";

type MoreItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  staff?: "mod" | "admin";
  memberOnly?: boolean;
};

type MoreSection = {
  id: string;
  label: string;
  items: MoreItem[];
};

/** Minimal overflow — hubs live on the dashboard; no page mosaic. */
const MORE_SECTIONS: MoreSection[] = [
  {
    id: "resources",
    label: "Resources",
    items: [
      { id: "flair", label: "Flair", to: "/store", icon: Sparkles },
      { id: "codex", label: "Codex & Legal", to: "/codex", icon: ScrollText },
      { id: "whitepaper", label: "Vc Whitepaper", to: "/legal/vc", icon: ScrollText },
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
 * Overflow drawer — wallet chip + legal/staff only (dashboard is the product).
 */
export function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { profile } = useSession();
  const reduce = useReduceFx();
  const role = profile?.platformRole ?? "member";
  const isAdmin = !!profile?.isAdmin || role === "admin";
  const vc = Number(profile?.modPoints ?? 0);
  const addr = formatVcAddress(profile?.username);

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
            className="mat-surface-strong fixed inset-y-0 right-0 z-[70] flex w-[min(100%,22rem)] flex-col border-l border-white/12"
          >
            <div className="border-b border-[var(--hairline)] px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">Menu</h2>
                  <p className="font-mono text-[12px] text-cyan-200/70">{addr || "VYBZ"}</p>
                </div>
                <button type="button" aria-label="Close" onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] active:scale-90">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => go("/workspace?tab=wallet")}
                className="mat-surface mt-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.99]"
                aria-label={`Vc balance ${formatVc(vc)}. Open wallet.`}
              >
                <Wallet className="h-4 w-4 shrink-0 text-[rgb(var(--neon-cyan))]" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[15px] font-semibold tracking-tight text-white">
                    {formatVc(vc)} <span className="text-cyan-200">Vc</span>
                  </span>
                  <span className="block text-[11px] text-white/40">≈ ${vcToUsd(vc).toFixed(2)} USD peg</span>
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
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
            <div className="border-t border-[var(--hairline)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <BuildStamp />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
