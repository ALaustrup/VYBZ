import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  EyeOff,
  Heart,
  LocateFixed,
  MapPin,
  MessageCircle,
  PenLine,
  Radar,
  Users,
} from "lucide-react";
import { CONFESSIONS } from "@/data/confessions";
import { useApp } from "@/store/AppStore";
import { VeiledArt } from "@/components/VeiledArt";
import { VeiledPhoto } from "@/components/VeiledPhoto";
import { VeiledVideo } from "@/components/VeiledVideo";
import { TrackCard } from "@/components/TrackCard";
import { IdentityMeta } from "@/components/IdentityMeta";
import { useGeolocation } from "@/lib/useGeolocation";
import { anchorFrom, haversineMiles, proximityLabel, type Coords } from "@/lib/geo";
import {
  cx,
  distanceMiles,
  formatCount,
  paletteFor,
  timeAgo,
} from "@/lib/utils";
import type { Confession } from "@/types";

// Selectable search radii (miles) — from your block out to country scale.
const RADII = [5, 25, 100, 500];

export function LocalPage() {
  const { userConfessions, openCompose, friends, backendConfessions, isMine, isHidden } =
    useApp();
  const [radius, setRadius] = useState(25);
  const geo = useGeolocation();

  // The first real fix anchors the world; live distance is then recomputed from
  // the user's moving position, so proximity is genuinely real-time.
  const originRef = useRef<Coords | null>(null);
  if (geo.coords && !originRef.current) originRef.current = geo.coords;
  const live = geo.status === "granted" && geo.coords && originRef.current;

  // Combine the user's own local posts with the demo set, then sort by
  // proximity. With a real fix we use haversine distance from live coords;
  // otherwise we fall back to each confession's static distance hint.
  const nearby = useMemo(() => {
    // Dedupe (a freshly posted backend confession can briefly exist in both the
    // optimistic backend list and userConfessions), newest-first.
    const seen = new Set<string>();
    const all = [...userConfessions, ...backendConfessions, ...CONFESSIONS]
      .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
      .filter((c) => !isHidden(c.id));
    const origin = originRef.current;
    return all
      .map((c) => {
        // Your own posts are always "right here" and must always appear — never
        // filtered out by a radius or a random placement.
        const isOwn = isMine(c.id) || c.alias === "You" || c.id.startsWith("own");
        let miles: number;
        if (isOwn) {
          miles = 0;
        } else if (live && origin && geo.coords) {
          miles = haversineMiles(geo.coords, anchorFrom(origin, c.seed));
        } else {
          miles = distanceMiles(c.distance);
        }
        return { confession: c, miles, isOwn };
      })
      .filter(({ miles, isOwn }) => isOwn || miles <= radius)
      .sort((a, b) => a.miles - b.miles);
    // geo.updatedAt forces a recompute as the user moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userConfessions, backendConfessions, radius, live, geo.coords, geo.updatedAt, isMine]);

  // Proximity pings: how many unveiled friends are within the current radius.
  const nearbyFriends = useMemo(() => {
    const origin = originRef.current;
    return Object.values(friends)
      .filter((f) => f.status === "friends")
      .filter((f) => {
        let miles: number;
        if (live && origin && geo.coords) {
          miles = haversineMiles(geo.coords, anchorFrom(origin, f.seed));
        } else {
          const c = CONFESSIONS.find((x) => x.id === f.confessionId);
          miles = c ? distanceMiles(c.distance) : 99;
        }
        return miles <= radius;
      }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends, radius, live, geo.coords, geo.updatedAt]);

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-6">
      {/* Radar header. */}
      <div className="relative mb-4 overflow-hidden rounded-3xl border border-white/10 p-5">
        <div className="absolute inset-0 -z-10 bg-veil-radial opacity-80" />
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-veil-400/40 animate-pulse-glow" />
            <span className="absolute inset-2 rounded-full border border-veil-400/30" />
            <Radar className="h-7 w-7 text-veil-200" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-white">
              Secrets near you
            </h2>
            <p className="flex items-center gap-1 text-sm text-white/55">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {nearby.length} within {radius} mi
              {live ? " of your live location" : " of your area"}
            </p>
          </div>
        </div>

        {/* Realtime location status / control. */}
        <LocationStatus geo={geo} live={!!live} />

        {/* Radius selector. */}
        <div className="mt-4 flex gap-2">
          {RADII.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={cx(
                "flex-1 rounded-xl border py-2 text-sm font-semibold transition active:scale-95",
                radius === r
                  ? "border-veil-400/60 bg-veil-500/20 text-white shadow-glow"
                  : "border-white/10 text-white/50"
              )}
            >
              {r} mi
            </button>
          ))}
        </div>
      </div>

      {/* Proximity ping — friends nearby right now. */}
      {nearbyFriends > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-2xl border border-feel/30 bg-feel/10 p-3 text-sm text-feel"
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">{nearbyFriends}</span> friend
            {nearbyFriends > 1 ? "s are" : " is"} within {radius} mi tonight
          </span>
        </motion.div>
      )}

      {/* Post CTA. */}
      <button
        onClick={openCompose}
        className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-veil-400/30 bg-veil-500/10 p-4 text-left transition active:scale-[0.99]"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-veil-500/30">
          <PenLine className="h-5 w-5 text-veil-100" />
        </div>
        <div>
          <p className="font-display font-semibold text-white">
            Share a secret near you
          </p>
          <p className="text-xs text-white/50">
            Post anonymously to people in your area
          </p>
        </div>
      </button>

      {nearby.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <p className="text-sm text-white/50">
            No secrets within {radius} mi yet. Be the first to confess.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {nearby.map(({ confession, miles }) =>
            confession.mediaKind === "audio" ? (
              <TrackCard
                key={confession.id}
                confession={confession}
                queue={nearby.map((n) => n.confession)}
              />
            ) : (
              <LocalRow key={confession.id} confession={confession} miles={miles} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function LocationStatus({
  geo,
  live,
}: {
  geo: ReturnType<typeof useGeolocation>;
  live: boolean;
}) {
  // Live readout once the device grants a real position.
  if (live && geo.coords) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-xl border border-feel/30 bg-feel/10 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-medium text-feel">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-feel opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-feel" />
          </span>
          Live · {geo.coords.lat.toFixed(4)}, {geo.coords.lng.toFixed(4)}
        </span>
        {geo.accuracy != null && (
          <span className="text-[11px] text-white/40">
            ±{Math.round(geo.accuracy)}m
          </span>
        )}
      </div>
    );
  }

  const label =
    geo.status === "locating"
      ? "Locating…"
      : geo.status === "denied"
        ? "Location blocked — enable it in settings"
        : geo.status === "unavailable"
          ? "Location unavailable on this device"
          : "Use my real location";

  return (
    <button
      onClick={geo.request}
      disabled={geo.status === "locating"}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-veil-400/40 bg-veil-500/15 py-2.5 text-sm font-semibold text-veil-100 transition active:scale-[0.99] disabled:opacity-60"
    >
      <LocateFixed className="h-4 w-4" />
      {label}
    </button>
  );
}

function LocalRow({
  confession,
  miles,
}: {
  confession: Confession;
  miles: number;
}) {
  const accent = paletteFor(confession.seed)[0];
  const { isUnveiled, recordSwipe, openConnection, displayLevel, isMine } = useApp();
  const isYours = isMine(confession.id) || confession.alias === "You";
  const connected = isYours || isUnveiled(confession.id);
  const level = isYours ? 1 : displayLevel(confession);

  // Tap casts a Feel (and opens the conversation, which is open on every post).
  function handleClick() {
    if (!connected) recordSwipe(confession, "feel");
    openConnection(confession.id);
  }

  return (
    <motion.button
      layout
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      className={cx(
        "flex w-full items-stretch gap-3 rounded-2xl border p-3 text-left transition",
        isYours
          ? "border-veil-400/40 bg-veil-500/[0.08]"
          : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]"
      )}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        {confession.mediaKind === "video" && confession.photo ? (
          <VeiledVideo
            src={confession.photo}
            level={level}
            clipStart={confession.clipStart}
            clipEnd={confession.clipEnd}
            paused
          />
        ) : confession.photo ? (
          <VeiledPhoto src={confession.photo} level={level} />
        ) : (
          <VeiledArt seed={confession.seed} level={level} />
        )}
        <span
          className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: "rgba(5,3,7,0.7)", color: accent }}
        >
          {proximityLabel(miles)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {isYours && (
            <span className="rounded-full bg-veil-500/30 px-2 py-0.5 text-[10px] font-semibold text-veil-100">
              You
            </span>
          )}
          {!isYours && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-veil-200">
              <MessageCircle className="h-3.5 w-3.5" />
              Connect
            </span>
          )}
        </div>
        <p className="text-sm leading-snug text-white/85">{confession.text}</p>
        <IdentityMeta
          gender={confession.gender}
          age={confession.age}
          location={confession.location}
          size="sm"
          className="mt-1.5"
        />
        <div className="mt-1.5 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-feel">
            <Heart className="h-3.5 w-3.5" />
            {formatCount(confession.feels)}
          </span>
          <span className="flex items-center gap-1 text-shroud">
            <EyeOff className="h-3.5 w-3.5" />
            {formatCount(confession.wilds)}
          </span>
          <span className="ml-auto text-white/35">
            {timeAgo(confession.createdAt)}
          </span>
        </div>
      </div>
    </motion.button>
  );
}
