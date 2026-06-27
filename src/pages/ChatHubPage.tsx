import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  Hash,
  Inbox,
  MessagesSquare,
  Plus,
  Search,
  Shuffle,
  Users,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { FALLBACK_ROOMS } from "@/data/rooms";
import { ListSkeleton } from "@/components/Skeleton";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { EmptyState } from "@/components/EmptyState";
import { Roulette } from "@/components/Roulette";
import { CircleRow, CreateCircle } from "@/pages/CirclesPage";
import { cx } from "@/lib/utils";
import type { Circle, Room } from "@/types";

type Section = "rooms" | "circles" | "random";
type CircleTab = "mine" | "discover";

/**
 * Unified chat hub: one calm place to find a conversation. "Rooms" are the
 * always-on public lobbies; "Circles" are the communities you join or create.
 * Replaces the two separate, easily-confused nav entries.
 */
export function ChatHubPage() {
  const { profileId, isPremium, showToast, openInbox } = useApp();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("rooms");

  // Circles state.
  const [circleTab, setCircleTab] = useState<CircleTab>("mine");
  const [mine, setMine] = useState<Circle[]>([]);
  const [discover, setDiscover] = useState<Circle[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const cap = isPremium ? 15 : 5;
  const owned = useMemo(
    () => mine.filter((c) => c.ownerId === profileId).length,
    [mine, profileId]
  );

  const loadMine = () => backend.fetchMyCircles().then(setMine);
  useEffect(() => {
    setLoading(true);
    Promise.all([backend.fetchMyCircles(), backend.fetchDiscoverCircles()]).then(
      ([m, d]) => {
        setMine(m);
        setDiscover(d);
        setLoading(false);
      }
    );
  }, []);

  function search() {
    void backend.fetchDiscoverCircles(query).then(setDiscover);
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10">
      <div className="flex items-center justify-between pt-4">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-white">
          <MessagesSquare className="h-5 w-5 text-veil-300" /> Chat
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openInbox}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-white/80 active:scale-95"
          >
            <Inbox className="h-4 w-4" /> Direct
          </button>
          {section === "circles" && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-full bg-veil-500 px-3.5 py-2 text-xs font-semibold text-white shadow-glow active:scale-95"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          )}
        </div>
      </div>

      {/* Top section toggle: Rooms · Circles · Random. (Direct = inbox above.) */}
      <div className="my-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {(
          [
            { id: "rooms", label: "Rooms", icon: Hash },
            { id: "circles", label: "Circles", icon: Users },
            { id: "random", label: "Random", icon: Shuffle },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition",
              section === id ? "bg-veil-500 text-white shadow-glow" : "text-white/55"
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {section === "random" ? (
        <Roulette />
      ) : section === "rooms" ? (
        <RoomGrid onOpen={(id) => navigate(`/rooms?room=${id}`)} />
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <>
          {/* My / Discover sub-toggle. */}
          <div className="mb-3 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(
              [
                { id: "mine", label: "My Circles", icon: Users },
                { id: "discover", label: "Discover", icon: Compass },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCircleTab(id)}
                className={cx(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-semibold transition",
                  circleTab === id ? "bg-veil-500/30 text-white ring-1 ring-veil-400/40" : "text-white/55"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {circleTab === "mine" ? (
            mine.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No circles yet"
                body="Circles are your private corners of MYVYB. Discover one that fits, or start your own."
                action={
                  <div className="mt-1 flex gap-2">
                    <button
                      onClick={() => setCircleTab("discover")}
                      className="rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/80 active:scale-95"
                    >
                      Discover
                    </button>
                    <button
                      onClick={() => setCreating(true)}
                      className="rounded-full bg-veil-500 px-4 py-2 text-xs font-semibold text-white shadow-glow active:scale-95"
                    >
                      Create a circle
                    </button>
                  </div>
                }
              />
            ) : (
              <Stagger className="space-y-2">
                {mine.map((c) => (
                  <StaggerItem key={c.id}>
                    <CircleRow circle={c} onOpen={() => navigate(`/circles/${c.id}`)} />
                  </StaggerItem>
                ))}
              </Stagger>
            )
          ) : (
            <>
              <div className="mb-3 flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3">
                  <Search className="h-4 w-4 text-white/40" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                    placeholder="Search circles…"
                    className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                </div>
                <button
                  onClick={search}
                  className="rounded-xl bg-veil-500 px-4 text-sm font-semibold text-white active:scale-95"
                >
                  Go
                </button>
              </div>
              {discover.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  title="No circles found"
                  body="Nothing matches yet. Try a different search — or be the first to start one."
                  action={
                    <button
                      onClick={() => setCreating(true)}
                      className="mt-1 rounded-full bg-veil-500 px-4 py-2 text-xs font-semibold text-white shadow-glow active:scale-95"
                    >
                      Create a circle
                    </button>
                  }
                />
              ) : (
                <Stagger className="space-y-2">
                  {discover.map((c) => (
                    <StaggerItem key={c.id}>
                      <CircleRow circle={c} onOpen={() => navigate(`/circles/${c.id}`)} />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </>
          )}
        </>
      )}

      {creating && (
        <CreateCircle
          owned={owned}
          cap={cap}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            void loadMine();
            navigate(`/circles/${id}`);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

/** Curated public rooms as a clean 2-up card grid — no horizontal scrolling. */
function RoomGrid({ onOpen }: { onOpen: (id: string) => void }) {
  const rooms: Room[] = FALLBACK_ROOMS;
  return (
    <Stagger className="grid grid-cols-2 gap-2.5">
      {rooms.map((r) => (
        <StaggerItem key={r.id}>
          <button
            onClick={() => onOpen(r.id)}
            className="group flex h-full w-full flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition active:scale-[0.98] hover:bg-white/[0.06]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-veil-500/20 text-veil-200">
              <Hash className="h-5 w-5" />
            </span>
            <span className="font-display text-sm font-semibold text-white">
              {r.name}
            </span>
            <span className="line-clamp-2 text-[11px] leading-snug text-white/45">
              {r.topic}
            </span>
          </button>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
