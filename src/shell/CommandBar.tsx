import { Search } from "lucide-react";

/** Non-functional Suite search stub. */
export function CommandBar() {
  return (
    <div className="suite-command-bar shrink-0 border-b border-[var(--hairline)] px-3 py-2">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/35" />
        <input
          type="search"
          readOnly
          placeholder="Search suite…"
          aria-label="Search suite"
          className="glass-vibrant w-full rounded-xl border border-[var(--hairline)] py-2 pl-9 pr-3 text-[13px] text-white/80 placeholder:text-white/35 transition duration-suite-fast ease-suite hover:shadow-suite-sm focus:border-[var(--hairline-strong)] focus:outline-none focus:shadow-suite-focus"
        />
      </label>
    </div>
  );
}
