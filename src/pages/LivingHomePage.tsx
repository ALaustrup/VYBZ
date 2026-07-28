import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AudioLines, GripVertical, Inbox, Loader2, Pencil, Sparkles, Users, Radio,
} from "lucide-react";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { ProfileLiveFeed } from "@/components/profile/ProfileLiveFeed";
import { WallAlerts } from "@/components/home/WallAlerts";
import { useResolvedCosmetics, Flair, CosmeticAvatarShell } from "@/lib/cosmetics";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import {
  resolveIntentMix,
  showCreateFacets,
  type IntentMix,
} from "@/lib/intentMix";
import {
  PULSE_CATALOG,
  defaultPulseOrder,
  loadPulseOrder,
  savePulseOrder,
  reorderPulse,
  type PulseId,
} from "@/lib/livingHomeLayout";
import { cx } from "@/lib/utils";

const PULSE_ICONS = {
  spark: Sparkles,
  messages: Inbox,
  network: Users,
  drops: AudioLines,
  live: Radio,
} as const;

/**
 * @deprecated Orphaned — not routed in App.tsx. Living Home is frozen (launch GTM).
 * Hub home is ProfilePage / dashboard. Kept only so layout helpers don't break.
 * Living Home — Dark Smoke glyph canvas.
 * Avatar-dominant hero → must-ack alerts → Wall → icon Pulse grid.
 */
export function LivingHomePage() {
  const { profile, unread } = useSession();
  const navigate = useNavigate();
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  const [, setMix] = useState<IntentMix>(() => resolveIntentMix(profile?.profile));
  const [pulseOrder, setPulseOrder] = useState<PulseId[]>([]);
  const [dragging, setDragging] = useState<PulseId | null>(null);
  const [overId, setOverId] = useState<PulseId | null>(null);
  const dragId = useRef<PulseId | null>(null);

  useEffect(() => {
    const next = resolveIntentMix(profile?.profile);
    setMix(next);
    const createOn = showCreateFacets(profile?.profile);
    const loveOn = (next.weights.love ?? 0) >= 0.15 || next.pillars.includes("love");
    const meetupOn = (next.weights.meetup ?? 0) >= 0.15 || next.pillars.includes("meetup");
    const fallback = defaultPulseOrder({ loveOn, meetupOn, createOn });
    setPulseOrder(loadPulseOrder(fallback));
  }, [profile?.profile]);

  useRegisterAppBar({
    title: "Home",
    actions: (
      <button
        type="button"
        onClick={() => navigate("/profile/edit")}
        aria-label="Edit"
        data-tip="Edit"
        className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
      >
        <Pencil className="h-4 w-4" />
      </button>
    ),
  }, []);

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  const name = profile.displayName || profile.username || "You";

  function onDragStart(id: PulseId) {
    dragId.current = id;
    setDragging(id);
  }
  function onDragOver(e: React.DragEvent, id: PulseId) {
    e.preventDefault();
    setOverId(id);
  }
  function onDrop(id: PulseId) {
    const from = dragId.current;
    if (from) {
      const next = reorderPulse(pulseOrder, from, id);
      setPulseOrder(next);
      savePulseOrder(next);
    }
    dragId.current = null;
    setDragging(null);
    setOverId(null);
  }
  function onDragEnd() {
    dragId.current = null;
    setDragging(null);
    setOverId(null);
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-1 pb-8 pt-2">
      <section className="glass-panel mb-4 p-5" data-dark-stage>
        <div className="flex flex-col items-center text-center">
          <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
            <Avatar url={profile.avatarUrl} name={profile.username} id={profile.id} size="xl" square />
          </CosmeticAvatarShell>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <h1 className="font-display text-2xl font-bold text-white">{name}</h1>
            <Flair data={cosmetics.flair} />
          </div>
          {profile.username && (
            <p className="mt-0.5 text-[13px] text-white/40">@{profile.username}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Link to="/profile/edit" aria-label="Edit" data-tip="Edit" className="btn btn-ghost h-8 px-3 py-0 text-[12px]">
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            <Link to="/store" aria-label="Flair" data-tip="Flair" className="btn btn-ghost h-8 px-3 py-0 text-[12px]">
              ✦
            </Link>
            {(unread ?? 0) > 0 && (
              <Link to="/messages" aria-label={`${unread} new`} data-tip="Inbox" className="btn btn-primary h-8 px-3 py-0 text-[12px]">
                <Inbox className="h-3.5 w-3.5" /> {unread}
              </Link>
            )}
          </div>
        </div>
      </section>

      <WallAlerts />

      <section className="mb-5">
        <ProfileLiveFeed excludeMustAck />
      </section>

      <section>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {pulseOrder.map((id) => {
            const meta = PULSE_CATALOG.find((p) => p.id === id)!;
            const Icon = PULSE_ICONS[id];
            return (
              <div
                key={id}
                draggable
                onDragStart={() => onDragStart(id)}
                onDragOver={(e) => onDragOver(e, id)}
                onDrop={() => onDrop(id)}
                onDragEnd={onDragEnd}
                className={cx(
                  "relative rounded-2xl glass-panel transition",
                  dragging === id ? "opacity-50" : "opacity-100",
                  overId === id && dragging && dragging !== id
                    ? "ring-2 ring-[rgb(var(--neon-cyan)/0.5)]"
                    : "",
                )}
                data-dark-stage
              >
                <Link
                  to={meta.to}
                  aria-label={meta.title}
                  data-tip={meta.title}
                  className="flex flex-col items-center gap-1.5 p-3 active:scale-[0.97]"
                  onClick={(e) => { if (dragging) e.preventDefault(); }}
                >
                  <span
                    className="absolute left-1 top-1 cursor-grab text-white/20 active:cursor-grabbing"
                    aria-hidden
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgb(var(--neon-cyan)/0.12)] text-[rgb(var(--neon-cyan))]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-[11px] font-semibold text-white/80">{meta.title}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
