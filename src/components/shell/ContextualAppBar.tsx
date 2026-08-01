import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Disc3, Plus, Search, Upload } from "lucide-react";
import { BrandMark } from "@/components/Brand";
import { chromeForPath } from "@/lib/appBarChrome";
import { useAppBarBridge } from "@/lib/appBarBridge";
import { usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Soft frosted top bar — brand · living title · upload · profile.
 * Inspired by luminous glass music shells; keeps VYBZ cyan/mint identity.
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
  const player = usePlayer();
  const reduce = useReduceFx();
  const showBack = chrome.showBack || !!chrome.backTo;
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);

  const title = player.track?.title
    ? player.track.title
    : chrome.title && chrome.title !== "Home"
      ? chrome.title
      : "Music";

  useEffect(() => {
    document.title = player.track ? `${player.track.title} · VYBZ` : "VYBZ — Find Yours.";
  }, [pathname, player.track?.title]);

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
      <div className="app-bar-inner relative grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {bridge.leading ?? (showBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="glass-chip flex h-9 w-9 shrink-0 items-center justify-center text-white/85 transition active:scale-90"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null)}
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="VYBZ home"
            className="glass-chip relative flex h-10 w-10 items-center justify-center overflow-hidden active:scale-95"
          >
            <BrandMark
              className={cx("h-6 w-6", !reduce && "animate-[vybz-hue_12s_linear_infinite]")}
            />
          </button>
        </div>

        <div className="min-w-0 text-center">
          <p className="truncate font-display text-[15px] font-semibold tracking-[0.02em] text-white sm:text-[16px]">
            {title}
          </p>
          {player.track?.artist ? (
            <p className="truncate text-[11px] text-white/45">{player.track.artist}</p>
          ) : (
            <p className="truncate text-[11px] text-white/40">Find Yours.</p>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          {bridge.actions}
          <button
            type="button"
            onClick={() => navigate("/discover")}
            aria-label="Discover"
            className="glass-chip hidden h-10 w-10 items-center justify-center text-white/80 transition duration-suite-fast ease-suite hover:text-white hover:shadow-suite-sm active:scale-90 sm:flex"
          >
            <Search className="h-6 w-6" />
          </button>
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
                "glass-chip flex h-10 w-10 items-center justify-center text-white transition duration-suite-fast ease-suite active:scale-90",
                uploadOpen && "ring-1 ring-suite-cyan/50 shadow-suite-focus",
              )}
            >
              <Plus className="h-6 w-6" strokeWidth={2.25} />
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
                  className="glass-vibrant absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-56 overflow-hidden rounded-2xl border border-[var(--hairline)] p-1.5 shadow-suite-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUploadOpen(false);
                      onCompose?.();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/85 transition duration-suite-fast ease-suite hover:bg-white/10 hover:shadow-suite-sm"
                  >
                    <span className="glass-chip flex h-8 w-8 items-center justify-center text-suite-cyan/90">
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
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-white/85 transition duration-suite-fast ease-suite hover:bg-white/10 hover:shadow-suite-sm"
                  >
                    <span className="glass-chip flex h-8 w-8 items-center justify-center text-suite-success">
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
        </div>
      </div>
    </header>
  );
}
