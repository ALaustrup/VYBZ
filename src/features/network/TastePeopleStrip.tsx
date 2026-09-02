import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/features/network/FollowButton";
import * as api from "@/lib/api";

/**
 * People who share your listening. Follow — not Connect.
 * DashMatchPanel stays in the tree with its Connect CTA.
 */
export function TastePeopleStrip({ limit = 8 }: { limit?: number }) {
  const [rows, setRows] = useState<api.TasteMatch[] | null>(null);

  useEffect(() => {
    let alive = true;
    void api.tasteMatches(limit).then((list) => {
      if (alive) setRows(list);
    });
    return () => {
      alive = false;
    };
  }, [limit]);

  if (rows === null) {
    return (
      <div className="flex justify-center py-4" data-testid="taste-people-strip-loading">
        <Loader2 className="h-4 w-4 animate-spin text-white/35" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="mb-5" data-testid="taste-people-strip" aria-label="Similar listening">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        Similar listening
      </p>
      <ul className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {rows.map((m) => {
          const name = m.displayName?.trim() || m.username?.trim() || "Member";
          const genres = m.sharedGenres.slice(0, 2).join(" · ");
          return (
            <li
              key={m.userId}
              className="forge-glass relative flex w-[11.5rem] shrink-0 flex-col items-center gap-2 !rounded-xl px-3 py-3"
            >
              <span className="forge-glass-edge pointer-events-none" aria-hidden />
              <Link
                to={`/u/${m.userId}`}
                className="relative z-[1] flex min-w-0 flex-col items-center gap-1.5 text-center"
              >
                <Avatar url={m.avatarUrl} name={name} id={m.userId} size="md" />
                <span className="w-full truncate text-[13px] font-semibold text-white">{name}</span>
                <span className="w-full truncate text-[11px] text-white/40">
                  {genres || "Similar listening"}
                </span>
              </Link>
              <FollowButton
                creatorId={m.userId}
                className="relative z-[1] forge-chip !min-h-8 w-full gap-1 px-2.5 text-[11px]"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
