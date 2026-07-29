import { Search } from "lucide-react";

/** Non-functional Suite search stub. */
export function CommandBar() {
  return (
    <div className="suite-command-bar shrink-0 border-b border-white/10 px-3 py-2">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/35" />
        <input
          type="search"
          readOnly
          placeholder="Search suite…"
          aria-label="Search suite"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-[13px] text-white/80 placeholder:text-white/35 focus:border-white/20 focus:outline-none"
        />
      </label>
    </div>
  );
}
