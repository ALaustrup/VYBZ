import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hash, Loader2, Lock, Users } from "lucide-react";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import type { SocialRoomCard } from "@/types";

/**
 * Compact social rooms on the signed-in home — reuses listSocialRooms, no second stack.
 */
export function SocialRoomsPanel({ limit = 5 }: { limit?: number }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<SocialRoomCard[] | null>(null);

  useEffect(() => {
    if (!FLAGS.socialLive) {
      setRooms([]);
      return;
    }
    let alive = true;
    void api.listSocialRooms(limit).then((list) => {
      if (alive) setRooms(list);
    });
    return () => {
      alive = false;
    };
  }, [limit]);

  if (!FLAGS.socialLive) return null;

  if (rooms === null) {
    return (
      <div className="flex justify-center py-6" data-testid="social-home-rooms-loading">
        <Loader2 className="h-5 w-5 animate-spin text-white/35" />
      </div>
    );
  }

  return (
    <section className="mb-5" data-testid="social-home-rooms" aria-label="Social rooms">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            <Hash className="h-3 w-3" aria-hidden />
            Rooms
          </p>
          <h2 className="font-display text-lg font-semibold text-white">Gather</h2>
        </div>
        <Link to="/social" className="text-[12px] text-white/45 transition hover:text-white/80">
          All rooms
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className="forge-glass relative flex items-center gap-3 !rounded-xl px-4 py-3.5">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <Users className="relative z-[1] h-4 w-4 shrink-0 text-white/35" />
          <p className="relative z-[1] text-sm text-white/50">
            No rooms yet.{" "}
            <Link to="/social" className="text-white/70 underline-offset-2 hover:underline">
              Start one
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
          {rooms.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => navigate(`/rooms/${r.id}`)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/60">
                  <Hash className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                    {r.title}
                    {r.accessTier === "premium" ? (
                      <Lock className="h-3 w-3 shrink-0 text-amber-200/80" aria-hidden />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/40">
                    {r.ownerUsername ? `@${r.ownerUsername}` : "room"}
                    {r.members > 0 ? ` · ${r.members} members` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
