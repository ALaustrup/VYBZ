import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EyeOff, Heart, Star, TrendingUp } from "lucide-react";
import { CONFESSIONS, OWN_CONFESSIONS } from "@/data/confessions";
import { VeiledArt } from "@/components/VeiledArt";
import { IdentityMeta } from "@/components/IdentityMeta";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useApp } from "@/store/AppStore";
import { useGeolocation } from "@/lib/useGeolocation";
import { anchorFrom, haversineMiles, type Coords } from "@/lib/geo";
import { cx, distanceMiles, formatCount, paletteFor } from "@/lib/utils";
import type { Confession } from "@/types";

type Window = "today" | "week" | "all";
type Scope = "global" | "near";
type Kind = "all" | "photo" | "video" | "text";

const WINDOWS: { id: Window; label: string; ms: number }[] = [
  { id: "today", label: "Today", ms: 24 * 3600_000 },
  { id: "week", label: "This week", ms: 7 * 24 * 3600_000 },
  { id: "all", label: "All time", ms: Infinity },
];
const KINDS: { id: Kind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photo", label: "Photos" },
  { id: "video", label: "Videos" },
  { id: "text", label: "Text" },
];
const NEAR_RADIUS = 100; // miles for the "Near me" scope

export function TrendingPage() {
  const { isSpotlighted, userConfessions, backendConfessions, refreshConfessions, isHidden } =
    useApp();
  const [window, setWindow] = useState<Window>("all");
  const [scope, setScope] = useState<Scope>("global");
  const [kind, setKind] = useState<Kind>("all");

  const geo = useGeolocation();
  const originRef = useRef<Coords | null>(null);
  if (geo.coords && !originRef.current) originRef.current = geo.coords;
  const live = geo.status === "granted" && geo.coords && originRef.current;

  const matchesKind = (c: Confession): boolean => {
    if (kind === "all") return true;
    if (kind === "text") return !c.photo;
    if (kind === "photo") return !!c.photo && c.mediaKind !== "video";
    return c.mediaKind === "video";
  };

  const milesOf = (c: Confession): number => {
    const origin = originRef.current;
    if (live && origin && geo.coords) return haversineMiles(geo.coords, anchorFrom(origin, c.seed));
    return distanceMiles(c.distance);
  };

  const ranked = useMemo(() => {
    const now = Date.now();
    const win = WINDOWS.find((w) => w.id === window)!.ms;
    const pool: Confession[] = [
      ...backendConfessions,
      ...userConfessions,
      ...OWN_CONFESSIONS,
      ...CONFESSIONS,
    ];
    const seen = new Set<string>();
    const filtered = pool
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .filter((c) => !isHidden(c.id))
      .filter((c) => (win === Infinity ? true : now - c.createdAt <= win))
      .filter(matchesKind)
      .filter((c) => (scope === "near" ? milesOf(c) <= NEAR_RADIUS : true));

    const spotlighted = filtered.filter((c) => isSpotlighted(c.id));
    const spotIds = new Set(spotlighted.map((c) => c.id));
    const rest = filtered
      .filter((c) => !spotIds.has(c.id))
      .sort((a, b) => b.feels + b.wilds - (a.feels + a.wilds));
    return [...spotlighted, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpotlighted, userConfessions, backendConfessions, window, scope, kind, live, geo.coords, geo.updatedAt]);

  const hero = ranked[0];
  const rest = ranked.slice(1);

  return (
    <PullToRefresh onRefresh={refreshConfessions} className="h-full px-4 pb-6">
      {/* Filters. */}
      <div className="space-y-2 pb-3 pt-1">
        <Segmented
          options={WINDOWS.map((w) => ({ id: w.id, label: w.label }))}
          value={window}
          onChange={(v) => setWindow(v as Window)}
        />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={scope === "global"} onClick={() => setScope("global")}>
            Global
          </Chip>
          <Chip
            active={scope === "near"}
            onClick={() => {
              setScope("near");
              if (geo.status !== "granted") geo.request();
            }}
          >
            Near me
          </Chip>
          <span className="mx-1 w-px self-stretch bg-white/10" />
          {KINDS.map((k) => (
            <Chip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>
              {k.label}
            </Chip>
          ))}
        </div>
        {scope === "near" && !live && (
          <p className="px-1 text-[11px] text-white/40">
            {geo.status === "denied"
              ? "Location blocked — showing approximate proximity."
              : "Enable location for true nearby trending."}
          </p>
        )}
      </div>

      {!hero ? (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <p className="text-sm text-white/50">Nothing trending in this slice yet.</p>
          <button
            onClick={() => {
              setWindow("all");
              setScope("global");
              setKind("all");
            }}
            className="mt-3 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/80 active:scale-95"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <HeroCard confession={hero} />
          <div className="mt-4 space-y-3">
            {rest.map((confession, i) => (
              <RankRow key={confession.id} rank={i + 2} confession={confession} />
            ))}
          </div>
        </>
      )}
    </PullToRefresh>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            "flex-1 rounded-full py-1.5 text-xs font-semibold transition active:scale-[0.98]",
            value === o.id ? "bg-veil-500 text-white shadow-glow" : "text-white/55"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95",
        active ? "bg-veil-500/25 text-white ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/55"
      )}
    >
      {children}
    </button>
  );
}

function HeroCard({ confession }: { confession: Confession }) {
  const { openConnection, isSpotlighted, displayLevel } = useApp();
  return (
    <HeroCardView
      confession={confession}
      level={displayLevel(confession)}
      onToggle={() => openConnection(confession.id)}
      spotlighted={isSpotlighted(confession.id)}
    />
  );
}

function HeroCardView({
  confession,
  level,
  onToggle,
  spotlighted,
}: {
  spotlighted: boolean;
  confession: Confession;
  level: number;
  onToggle: () => void;
}) {
  return (
    <motion.button
      layout
      onClick={onToggle}
      className="relative block h-72 w-full overflow-hidden rounded-3xl border border-white/10 text-left shadow-card"
    >
      <VeiledArt seed={confession.seed} level={level} />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        {spotlighted ? (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-ink-950 shadow-glow">
            <Star className="h-3.5 w-3.5 fill-current" /> Spotlighted
          </span>
        ) : (
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-glow">
            <TrendingUp className="h-3.5 w-3.5" /> #1 Trending
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="font-display text-xl leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          {confession.text}
        </p>
        <IdentityMeta
          gender={confession.gender}
          age={confession.age}
          location={confession.location}
          className="mt-2"
        />
        <div className="mt-3 flex items-center gap-4 text-sm">
          <Stat icon={Heart} value={confession.feels} className="text-feel" />
          <Stat icon={EyeOff} value={confession.wilds} className="text-shroud" />
        </div>
      </div>
    </motion.button>
  );
}

function RankRow({ rank, confession }: { rank: number; confession: Confession }) {
  const accent = paletteFor(confession.seed)[0];
  const { openConnection, isSpotlighted, displayLevel } = useApp();
  const spotlighted = isSpotlighted(confession.id);
  const level = displayLevel(confession);
  return (
    <motion.button
      layout
      onClick={() => openConnection(confession.id)}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left transition hover:bg-black/20"
    >
      <span
        className="w-6 shrink-0 text-center font-display text-lg font-bold"
        style={{ color: accent }}
      >
        {rank}
      </span>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
        <VeiledArt seed={confession.seed} level={level} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {spotlighted && (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-400/20 px-1.5 text-[10px] font-semibold text-amber-300">
              <Star className="h-2.5 w-2.5 fill-current" /> Spotlight
            </span>
          )}
          {confession.featured && !spotlighted && (
            <span className="text-[10px] font-semibold text-glow">✦</span>
          )}
        </div>
        <p className="text-sm leading-snug text-white/85 line-clamp-2">{confession.text}</p>
        <IdentityMeta
          gender={confession.gender}
          age={confession.age}
          location={confession.location}
          size="sm"
          className="mt-1.5"
        />
        <div className="mt-1.5 flex items-center gap-3 text-xs">
          <Stat icon={Heart} value={confession.feels} className="text-feel" />
          <Stat icon={EyeOff} value={confession.wilds} className="text-shroud" />
        </div>
      </div>
    </motion.button>
  );
}

function Stat({
  icon: Icon,
  value,
  className,
}: {
  icon: typeof Heart;
  value: number;
  className?: string;
}) {
  return (
    <span className={cx("flex items-center gap-1 font-medium", className)}>
      <Icon className="h-3.5 w-3.5" />
      {formatCount(value)}
    </span>
  );
}
