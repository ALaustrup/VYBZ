import { useNavigate } from "react-router-dom";
import { HardDrive, Search, Sparkles, Upload, Wallet } from "lucide-react";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { AlertsMenu } from "@/components/shell/AlertsMenu";
import { ChatIndicator } from "@/components/shell/ChatIndicator";
import { AtcMeter } from "@/features/airtime/AtcMeter";
import { formatVc, formatVcAddress, vcToUsd } from "@/lib/vc";
import { isApplePlatform } from "@/lib/platformKeys";
import { openCommandPalette } from "@/shell/commandPaletteStore";
import { closeShellNavDrawer } from "@/shell/shellNavDrawerStore";
import { ToolsLauncherButton } from "@/shell/ToolsLauncher";
import { useSession } from "@/store/session";

/**
 * Default chrome that used to live in the top bar. One drawer, one Alerts.
 */
export function DrawerChrome({
  onCompose,
  onGenerate,
}: {
  onCompose?: () => void;
  onGenerate?: () => void;
}) {
  const navigate = useNavigate();
  const { profile } = useSession();
  const vc = Number(profile?.modPoints ?? 0);
  const addr = formatVcAddress(profile?.username);

  function go(to: string) {
    closeShellNavDrawer();
    navigate(to);
  }

  return (
    <div className="border-b border-white/10 px-3 pb-3" data-testid="drawer-chrome">
      <button
        type="button"
        onClick={() => {
          closeShellNavDrawer();
          openCommandPalette();
        }}
        aria-label="Search VYBZ"
        aria-keyshortcuts={isApplePlatform() ? "Meta+K" : "Control+K"}
        data-testid="search-button"
        className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
      >
        <Search className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.75} />
        Search
      </button>

      <div className="mt-1" aria-label="Add" data-testid="compose-button">
        <button
          type="button"
          data-testid="add-upload"
          aria-label="Add"
          onClick={() => {
            closeShellNavDrawer();
            onCompose?.();
          }}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
        >
          <Upload className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.75} />
          Upload
        </button>
        <button
          type="button"
          role="menuitem"
          data-testid="add-generate"
          onClick={() => {
            closeShellNavDrawer();
            onGenerate?.();
          }}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.75} />
          Generate
        </button>
        <button
          type="button"
          role="menuitem"
          data-testid="add-node"
          onClick={() => go("/library?tab=device")}
          className="flex h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
        >
          <HardDrive className="h-4 w-4 shrink-0 text-white/50" strokeWidth={1.75} />
          This device
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <ChatIndicator />
        <AlertsMenu />
        <ToolsLauncherButton />
        <AccountMenu />
      </div>

      <AtcMeter />

      <button
        type="button"
        onClick={() => go("/workspace?tab=wallet")}
        aria-label={addr ? `Wallet ${addr}` : "Open wallet"}
        className="mt-2 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/[0.06]"
      >
        <Wallet className="h-4 w-4 shrink-0 text-cyan-200/80" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[12px] text-cyan-100/80">
            {addr || "VYBZ"}
          </span>
          <span className="block text-[11px] text-white/40">
            {formatVc(vc)} Vc · ≈ ${vcToUsd(vc).toFixed(2)}
          </span>
        </span>
      </button>
    </div>
  );
}
