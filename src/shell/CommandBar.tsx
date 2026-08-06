import { Search } from "lucide-react";
import { isApplePlatform } from "@/lib/platformKeys";
import { openCommandPalette } from "@/shell/commandPaletteStore";

/**
 * Trigger for the command palette.
 *
 * This was a `readOnly` input styled to look like search, which matched
 * nothing and went nowhere. It is now a real control; the palette does the work.
 */
export function CommandBar() {
  return (
    <div className="suite-command-bar shrink-0 border-b border-[var(--surface-border)] px-3 py-2">
      <button
        type="button"
        onClick={openCommandPalette}
        aria-keyshortcuts={isApplePlatform() ? "Meta+K" : "Control+K"}
        className="glass-vibrant flex min-h-[2.5rem] w-full items-center gap-2.5 rounded-xl border border-[var(--surface-border)] px-3 py-2 text-left text-[13px] text-white/50 transition duration-suite-fast ease-suite hover:border-[var(--surface-border-strong)] hover:text-white/70 focus:outline-none focus:shadow-suite-focus"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
        <span className="min-w-0 flex-1 truncate">Search VYBZ</span>
        <kbd className="hidden shrink-0 rounded-md border border-[var(--surface-border)] px-1.5 py-0.5 text-[10px] font-semibold text-white/40 sm:block">
          {isApplePlatform() ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
    </div>
  );
}
