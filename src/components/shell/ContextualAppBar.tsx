import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { BrandMark } from "@/components/Brand";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { AlertsMenu } from "@/components/shell/AlertsMenu";
import { ChatIndicator } from "@/components/shell/ChatIndicator";
import { AppBarWordmark } from "@/components/shell/AppBarWordmark";
import { chromeForPath } from "@/lib/appBarChrome";
import { useAppBarBridge } from "@/lib/appBarBridge";
import { usePlayer } from "@/lib/audioBus";
import { isApplePlatform } from "@/lib/platformKeys";
import { openCommandPalette } from "@/shell/commandPaletteStore";
import { ToolsLauncherButton } from "@/shell/ToolsLauncher";
import { AtcMeter } from "@/features/airtime/AtcMeter";

/**
 * Quiet chrome — VYBZ · Search · + · Chat · Alerts · Me.
 * PeopleMenu stays in the tree, imported by nothing; Search opens the palette
 * (people, places, tools). Audio-reactive wordmark stays available on
 * AppBarWordmark; the signed-in bar keeps it still by default.
 * Track titles belong on VDock, never here.
 */
export function ContextualAppBar({
  onCompose,
  onBulkUpload: _onBulkUpload,
}: {
  onCompose?: () => void;
  onBulkUpload?: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const chrome = chromeForPath(pathname);
  const bridge = useAppBarBridge();
  const player = usePlayer();
  const showBack = chrome.showBack || !!chrome.backTo;

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
          <button
            type="button"
            onClick={() => onCompose?.()}
            aria-label="Add"
            data-testid="compose-button"
            data-tip="Add"
            className="forge-chip flex h-10 w-10 active:scale-90"
          >
            <Plus className="h-6 w-6" strokeWidth={2.25} />
          </button>
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
