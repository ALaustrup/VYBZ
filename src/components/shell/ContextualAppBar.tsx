import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Menu, Plus, Search } from "lucide-react";
import { BrandMark } from "@/components/Brand";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { AlertsMenu } from "@/components/shell/AlertsMenu";
import { ChatIndicator } from "@/components/shell/ChatIndicator";
import { AppBarWordmark } from "@/components/shell/AppBarWordmark";
import { chromeForPath } from "@/lib/appBarChrome";
import { useAppBarBridge } from "@/lib/appBarBridge";
import { usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { isApplePlatform } from "@/lib/platformKeys";
import { openCommandPalette } from "@/shell/commandPaletteStore";
import { ToolsLauncherButton } from "@/shell/ToolsLauncher";
import { AtcMeter } from "@/features/airtime/AtcMeter";
import { openShellNavDrawer } from "@/shell/shellNavDrawerStore";

/**
 * Quiet chrome — VYBZ · Search · + · Chat · Alerts · Me.
 * PeopleMenu stays in the tree, imported by nothing; Search opens the palette
 * (people, places, tools). Audio-reactive wordmark stays available on
 * AppBarWordmark; the signed-in bar keeps it still by default.
 * Track titles belong on VDock, never here.
 */
export function ContextualAppBar({
  onCompose,
  onGenerate,
  onBulkUpload: _onBulkUpload,
}: {
  onCompose?: () => void;
  onGenerate?: () => void;
  onBulkUpload?: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const chrome = chromeForPath(pathname);
  const bridge = useAppBarBridge();
  const player = usePlayer();
  const reduce = useReduceFx();
  const showBack = chrome.showBack || !!chrome.backTo;
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAddOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!addOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!addRef.current?.contains(e.target as Node)) setAddOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [addOpen]);

  useEffect(() => {
    document.title = player.track ? `${player.track.title} · VYBZ` : "VYBZ";
  }, [pathname, player.track?.title]);

  function onBack() {
    if (chrome.backTo) navigate(chrome.backTo);
    else navigate(-1);
  }

  return (
    <header className="app-bar app-bar--nexus app-bar--ops shrink-0" data-testid="suite-app-bar">
      <div className="app-bar-inner relative grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-1.5 justify-self-start">
          <button
            type="button"
            onClick={openShellNavDrawer}
            aria-label="Open navigation"
            data-testid="shell-nav-menu"
            className="forge-chip flex h-10 w-10 lg:hidden active:scale-90"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          {bridge.leading ?? (showBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:bg-white/8 hover:text-white/85 active:scale-90"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null)}
          <AppBarWordmark className="min-w-0 pl-0.5" />
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="VYBZ"
          className="relative z-[1] flex h-12 w-12 items-center justify-center justify-self-center overflow-visible bg-transparent p-0 active:scale-95"
          data-testid="suite-app-bar-mark"
        >
          <BrandMark orb className="h-9 w-9 sm:h-10 sm:w-10" />
        </button>

        <div className="flex min-w-0 items-center justify-end gap-1.5 justify-self-end">
          {bridge.actions}
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Search VYBZ"
            aria-keyshortcuts={isApplePlatform() ? "Meta+K" : "Control+K"}
            data-testid="search-button"
            data-tip="Search"
            className="forge-chip flex h-10 w-10 active:scale-90"
          >
            <Search className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div ref={addRef} className="relative">
            <button
              type="button"
              onClick={() => {
                if (onGenerate) setAddOpen((v) => !v);
                else onCompose?.();
              }}
              aria-label="Add"
              aria-expanded={onGenerate ? addOpen : undefined}
              aria-haspopup={onGenerate ? "menu" : undefined}
              data-testid="compose-button"
              data-tip="Add"
              className="forge-chip flex h-10 w-10 active:scale-90"
            >
              <Plus className="h-6 w-6" strokeWidth={2.25} />
            </button>
            <AnimatePresence>
              {addOpen && onGenerate ? (
                <motion.div
                  role="menu"
                  aria-label="Add"
                  data-testid="add-menu"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="forge-glass absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-40 overflow-hidden p-1.5"
                >
                  <span className="forge-glass-edge pointer-events-none" aria-hidden />
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="add-upload"
                    onClick={() => {
                      setAddOpen(false);
                      onCompose?.();
                    }}
                    className="relative z-[1] flex h-10 w-full items-center rounded-xl px-3 text-left text-[13px] text-white/85 transition hover:bg-white/[0.06]"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="add-generate"
                    onClick={() => {
                      setAddOpen(false);
                      onGenerate();
                    }}
                    className="relative z-[1] flex h-10 w-full items-center rounded-xl px-3 text-left text-[13px] text-white/85 transition hover:bg-white/[0.06]"
                  >
                    Generate
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <ChatIndicator />
          <AlertsMenu />
          <ToolsLauncherButton />
          <AtcMeter />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
