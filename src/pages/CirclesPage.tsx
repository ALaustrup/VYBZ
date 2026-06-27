import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Loader2, Lock, Plus, Search, Users } from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { circleGradient } from "@/lib/cosmetics";
import { cx, timeAgo } from "@/lib/utils";
import type { Circle } from "@/types";

type Tab = "mine" | "discover";

export function CirclesPage() {
  const { profileId, isPremium, showToast } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("mine");
  const [mine, setMine] = useState<Circle[]>([]);
  const [discover, setDiscover] = useState<Circle[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const cap = isPremium ? 15 : 5;
  const owned = useMemo(() => mine.filter((c) => c.ownerId === profileId).length, [mine, profileId]);

  const loadMine = () => backend.fetchMyCircles().then(setMine);
  useEffect(() => {
    setLoading(true);
    Promise.all([backend.fetchMyCircles(), backend.fetchDiscoverCircles()]).then(([m, d]) => {
      setMine(m);
      setDiscover(d);
      setLoading(false);
    });
  }, []);

  function search() {
    void backend.fetchDiscoverCircles(query).then(setDiscover);
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-10">
      <div className="flex items-center justify-between pt-4">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-white">
          <Users className="h-5 w-5 text-veil-300" /> Social Circles
        </h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-full bg-veil-500 px-3.5 py-2 text-xs font-semibold text-white shadow-glow active:scale-95"
        >
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="my-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {([
          { id: "mine", label: "My Circles", icon: Users },
          { id: "discover", label: "Discover", icon: Compass },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition",
              tab === id ? "bg-veil-500 text-white shadow-glow" : "text-white/55"
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
        </div>
      ) : tab === "mine" ? (
        mine.length === 0 ? (
          <Empty text="You haven't joined any circles yet. Discover one — or create your own." />
        ) : (
          <div className="space-y-2">
            {mine.map((c) => (
              <CircleRow key={c.id} circle={c} onOpen={() => navigate(`/circles/${c.id}`)} />
            ))}
          </div>
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
            <button onClick={search} className="rounded-xl bg-veil-500 px-4 text-sm font-semibold text-white active:scale-95">
              Go
            </button>
          </div>
          {discover.length === 0 ? (
            <Empty text="No circles found. Be the first to start one." />
          ) : (
            <div className="space-y-2">
              {discover.map((c) => (
                <CircleRow key={c.id} circle={c} onOpen={() => navigate(`/circles/${c.id}`)} />
              ))}
            </div>
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

export function CircleRow({ circle, onOpen }: { circle: Circle; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left transition active:scale-[0.99] hover:bg-white/[0.06]"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-veil-500/20 text-2xl"
        style={circleGradient(circle.theme) ? { background: circleGradient(circle.theme) } : undefined}
      >
        {circle.icon || "🌀"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display font-semibold text-white">{circle.name}</p>
          {circle.nsfw && (
            <span className="rounded-full bg-wild/80 px-1.5 py-0.5 text-[9px] font-bold text-white">18+</span>
          )}
          {circle.visibility !== "public" && <Lock className="h-3 w-3 text-white/40" />}
        </div>
        {circle.description && (
          <p className="truncate text-xs text-white/55">{circle.description}</p>
        )}
        <p className="mt-0.5 text-[10px] text-white/35">
          {circle.memberCount} member{circle.memberCount === 1 ? "" : "s"} · active {timeAgo(circle.lastActiveAt)}
        </p>
      </div>
    </button>
  );
}

export function CreateCircle({
  owned,
  cap,
  onClose,
  onCreated,
  showToast,
}: {
  owned: number;
  cap: number;
  onClose: () => void;
  onCreated: (id: string) => void;
  showToast: (t: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("🌀");
  const [busy, setBusy] = useState(false);
  const atCap = owned >= cap;

  async function create() {
    if (name.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      const id = await backend.createCircle(name, desc, icon);
      if (id) onCreated(id);
    } catch (e) {
      showToast(/limit/i.test(String((e as Error)?.message)) ? "You've reached your circle limit." : "Couldn't create the circle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl border-t border-white/10 bg-ink-900 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
        <h2 className="mb-1 font-display text-lg font-bold text-white">Create a circle</h2>
        <p className="mb-4 text-xs text-white/45">{owned}/{cap} circles used.</p>
        {atCap ? (
          <p className="rounded-xl border border-wild/30 bg-wild/10 p-3 text-sm text-wild">
            You've reached your circle limit ({cap}). {cap === 5 && "MYVYB Plus unlocks 15."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={icon}
                onChange={(e) => setIcon([...e.target.value].slice(-1).join(""))}
                className="w-14 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-center text-2xl"
                aria-label="Icon emoji"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                placeholder="Circle name"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 160))}
              rows={2}
              placeholder="What's this circle about? (optional)"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/60 active:scale-95">
            Cancel
          </button>
          {!atCap && (
            <button
              onClick={create}
              disabled={busy || name.trim().length < 2}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-veil-500 py-2.5 text-sm font-semibold text-white shadow-glow active:scale-95 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const Empty = ({ text }: { text: string }) => (
  <p className="px-6 py-12 text-center text-sm text-white/45">{text}</p>
);
