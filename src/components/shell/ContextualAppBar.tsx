import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Disc3, Plus, Upload } from "lucide-react";
import { BrandMark } from "@/components/Brand";
import { ProfileMenu } from "@/components/shell/ProfileMenu";
import { chromeForPath } from "@/lib/appBarChrome";
import { useAppBarBridge } from "@/lib/appBarBridge";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Minimal premium top bar: rotating VYBZ mark · Find Yours. · upload + · profile menu.
 */
export function ContextualAppBar({
  onCompose,
  onBulkUpload,
}: {
  onCompose?: () => void;
  onBulkUpload?: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const chrome = chromeForPath(pathname);
  const bridge = useAppBarBridge();
  const reduce = useReduceFx();
  const showBack = chrome.showBack || !!chrome.backTo;
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Find Yours.";
  }, [pathname]);

  useEffect(() => {
    setUploadOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!uploadOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!uploadRef.current?.contains(e.target as Node)) setUploadOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUploadOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [uploadOpen]);

  function onBack() {
    if (chrome.backTo) navigate(chrome.backTo);
    else navigate(-1);
  }

  return (
    <header className="app-bar shrink-0">
      <div className="app-bar-inner relative grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center justify-start gap-1.5">
          {bridge.leading ?? (showBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/80 transition hover:border-cyan-300/40 hover:text-white hover:shadow-[0_0_20px_-6px_rgba(0,194,255,0.5)] active:scale-90"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null)}
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="VYBZ home"
            className="group relative flex h-10 w-10 items-center justify-center rounded-full transition hover:shadow-[0_0_28px_-4px_rgba(0,214,143,0.55)] active:scale-95"
          >
            <span
              className={cx(
                "absolute inset-0 rounded-full opacity-50 blur-md",
                "bg-[conic-gradient(from_0deg,#00C2FF,#00D68F,#FF4D2E,#A855F7,#00C2FF)]",
                !reduce && "animate-[vybz-spin_10s_linear_infinite]",
              )}
              aria-hidden
            />
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-ink-950/90 ring-1 ring-white/20">
              <BrandMark
                className={cx(
                  "h-6 w-6",
                  !reduce && "animate-[vybz-hue_9s_linear_infinite]",
                )}
              />
            </span>
          </button>
        </div>

        <p className="pointer-events-none select-none text-center font-display text-[15px] font-semibold tracking-[0.04em] text-white sm:text-[16px]">
          Find Yours.
        </p>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          {bridge.actions}
          <div ref={uploadRef} className="relative">
            <button
              type="button"
              onClick={() => {
                if (!onCompose && !onBulkUpload) return;
                setUploadOpen((v) => !v);
              }}
              aria-label="Upload music"
              aria-expanded={uploadOpen}
              aria-haspopup="menu"
              className={cx(
                "flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition",
                "hover:border-cyan-300/45 hover:bg-[rgb(var(--neon-cyan)/0.15)] hover:text-cyan-100",
                "hover:shadow-[0_0_24px_-4px_rgba(0,194,255,0.55)] active:scale-90",
                uploadOpen && "border-cyan-300/50 bg-[rgb(var(--neon-cyan)/0.18)] text-cyan-50 shadow-[0_0_24px_-4px_rgba(0,194,255,0.5)]",
              )}
            >
              <Plus className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <AnimatePresence>
              {uploadOpen && (
                <motion.div
                  role="menu"
                  aria-label="Upload"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-56 overflow-hidden rounded-2xl border border-white/14 bg-ink-950/94 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85),0_0_32px_-10px_rgba(0,194,255,0.28)] backdrop-blur-2xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUploadOpen(false);
                      onCompose?.();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/80 transition hover:bg-white/[0.07] hover:text-white hover:shadow-[0_0_20px_-8px_rgba(0,214,143,0.5)]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--neon-cyan)/0.15)] text-cyan-200">
                      <Upload className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block">New drop</span>
                      <span className="block text-[10px] font-normal text-white/40">Track or music video</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUploadOpen(false);
                      onBulkUpload?.();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/80 transition hover:bg-white/[0.07] hover:text-white hover:shadow-[0_0_20px_-8px_rgba(0,214,143,0.5)]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--neon-mint)/0.15)] text-[rgb(var(--neon-mint))]">
                      <Disc3 className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block">Album / batch</span>
                      <span className="block text-[10px] font-normal text-white/40">Multiple masters</span>
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
