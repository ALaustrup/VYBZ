import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Menu } from "lucide-react";
import { chromeForPath } from "@/lib/appBarChrome";
import { useAppBarBridge } from "@/lib/appBarBridge";
import { usePlayer } from "@/lib/audioBus";
import { openShellNavDrawer } from "@/shell/shellNavDrawerStore";

/**
 * Menu-only chrome. Search, +, Chat, Alerts, Me, Tools, and wallet live in
 * the drawer. AppBarWordmark and the header BrandMark stay in the tree,
 * imported by nothing. Track titles belong on VDock, never here.
 */
export function ContextualAppBar({
  onCompose: _onCompose,
  onGenerate: _onGenerate,
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
  const showBack = pathname !== "/" && (chrome.showBack || !!chrome.backTo);

  useEffect(() => {
    document.title = player.track ? `${player.track.title} · VYBZ` : "VYBZ";
  }, [pathname, player.track?.title]);

  function onBack() {
    if (chrome.backTo) navigate(chrome.backTo);
    else navigate(-1);
  }

  return (
    <header
      className="app-bar app-bar--nexus app-bar--ops app-bar--quiet shrink-0"
      data-testid="suite-app-bar"
    >
      <div className="app-bar-inner relative flex items-center gap-1.5">
        <button
          type="button"
          onClick={openShellNavDrawer}
          aria-label="Open navigation"
          data-testid="shell-nav-menu"
          className="forge-chip flex h-10 w-10 active:scale-90"
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
      </div>
    </header>
  );
}
