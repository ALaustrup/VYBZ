import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye, Hash, Loader2, Lock, Plus, Radio, Users, X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { GoLiveSheet } from "@/components/GoLiveSheet";
import { LiveTileStage, liveSeedFromId } from "@/components/LiveTileStage";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";
import type { LiveSessionCard, SocialRoomCard } from "@/types";

/** Unified Social Live hub — Top 3 public lives + social room discovery. */
export function SocialPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { showToast, refreshProfile, profile } = useSession();
  const [lives, setLives] = useState<LiveSessionCard[]>([]);
  const [rooms, setRooms] = useState<SocialRoomCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [goLive, setGoLive] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [top, social] = await Promise.all([
      api.topLiveSessions(3),
      api.listSocialRooms(40),
    ]);
    setLives(top);
    setRooms(social);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (params.get("go") === "1") {
      setGoLive(true);
      params.delete("go");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  useRegisterAppBar({
    actions: (
      <>
        <button type="button" onClick={() => setCreating(true)} className="cta-pill h-9 !bg-white/[0.06]">
          <Plus className="h-3.5 w-3.5" /> Room
        </button>
        <button type="button" onClick={() => setGoLive(true)} className="cta-pill h-9">
          <Radio className="h-3.5 w-3.5" /> Go live
        </button>
      </>
    ),
  }, []);

  if (!FLAGS.socialLive) {
    return (
      <EmptyState
        icon={Radio}
        title="Social Live off"
        body="Set VITE_FEATURE_SOCIAL_LIVE on (default) to use the Social hub."
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6 pt-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
        ) : (
          <div className="space-y-8">
            <section>
              <p className="eyebrow mb-3">Live now</p>
              {lives.length === 0 ? (
                <p className="text-sm text-white/40">
                  No public streams — Go live from the Orb or the control above.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {lives.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => navigate(`/live/${s.id}`)}
                      className="broadcast-bezel group relative overflow-hidden mat-surface p-0 text-left transition active:scale-[0.99]"
                    >
                      <div className="relative min-h-[7.5rem] p-4">
                        <LiveTileStage seed={liveSeedFromId(s.hostId)} accent="#34f5a0" />
                        <span className="absolute right-3 top-3 z-[3] rounded-md bg-wild/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Live
                        </span>
                        <div className="relative z-[1] flex items-center gap-3">
                          <Avatar url={s.avatarUrl} name={s.username || s.displayName} id={s.hostId} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-[15px] font-semibold text-white">
                              {s.username || s.displayName || "Creator"}
                            </p>
                            <p className="truncate text-[12px] text-white/55">
                              {s.title || s.intent || "Ultra live"}
                            </p>
                          </div>
                        </div>
                        <p className="relative z-[1] mt-3 flex items-center gap-2 text-[11px] text-white/40">
                          <Eye className="h-3 w-3" />{s.viewerCount}
                          <span>·</span>
                          <span>#{i + 1}</span>
                          <span>·</span>
                          <span>{timeAgo(s.startedAt)}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate("/live")}
                className="mt-3 text-[12px] text-veil-200/80 hover:text-veil-100"
              >
                All live streams →
              </button>
            </section>

            <section>
              <p className="eyebrow mb-3 flex items-center gap-1.5">
                <Hash className="h-3 w-3" /> Rooms
              </p>
              {rooms.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No social rooms yet"
                  body="Create a free or premium V¢ room — persistent text (and voice when enabled)."
                />
              ) : (
                <ul className="divide-y divide-[var(--hairline)]">
                  {rooms.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/rooms/${r.id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-display text-[15px] font-semibold text-white">
                          {r.title}
                          {r.accessTier === "premium" && (
                            <Lock className="ml-1.5 inline h-3.5 w-3.5 text-amber-200/80" />
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {r.ownerUsername ? `@${r.ownerUsername}` : "room"}
                          {r.accessTier === "premium"
                            ? ` · ${r.vcPrice ?? 0} V¢ / ${r.billingPeriod ?? "month"}`
                            : " · free"}
                          {r.voiceEnabled ? " · voice" : ""}
                          {` · ${r.members} members`}
                        </p>
                      </button>
                      {r.accessTier === "premium" && !r.canAccess && (
                        <button
                          type="button"
                          className="btn btn-primary h-8 shrink-0 px-2.5 text-[11px]"
                          onClick={async () => {
                            try {
                              const id = await api.subscribeRoomVc(r.id);
                              if (id) {
                                showToast("Subscribed with V¢");
                                await refreshProfile();
                                await load();
                              } else showToast("Couldn't subscribe");
                            } catch {
                              showToast("Not enough V¢ (cosmetic credits)");
                            }
                          }}
                        >
                          Join
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-white/30">
                Balance: {profile?.modPoints ?? 0} V¢ · Taxonomy rooms stay under Messages → Rooms
              </p>
            </section>
          </div>
        )}
      </div>

      <GoLiveSheet open={goLive} onClose={() => setGoLive(false)} />
      {creating && (
        <CreateSocialRoomSheet
          onClose={() => setCreating(false)}
          onCreated={async (id) => {
            setCreating(false);
            await load();
            navigate(`/rooms/${id}`);
          }}
        />
      )}
    </div>
  );
}

function CreateSocialRoomSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { showToast } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [price, setPrice] = useState(50);
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [voice, setVoice] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      const id = await api.createSocialRoom({
        title: title.trim(),
        description: description.trim() || undefined,
        accessTier: tier,
        vcPrice: tier === "premium" ? price : undefined,
        billingPeriod: tier === "premium" ? period : undefined,
        voiceEnabled: voice,
        perks: tier === "premium" ? { drop_zone: true, priority_voice: voice } : {},
      });
      if (id) onCreated(id);
      else {
        showToast("Couldn't create room");
        setBusy(false);
      }
    } catch {
      showToast("Couldn't create room");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-md space-y-3 rounded-t-3xl border border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">New room</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full glass" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Room name"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 280))}
          placeholder="What is this room for?"
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
        />
        <div className="flex gap-2">
          {(["free", "premium"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={cx(
                "flex-1 rounded-xl py-2 text-xs font-semibold capitalize",
                tier === t ? "bg-veil-500/25 text-veil-100 ring-1 ring-veil-400/40" : "bg-white/[0.04] text-white/50",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {tier === "premium" && (
          <div className="flex gap-2">
            <label className="flex-1 text-[11px] text-white/45">
              V¢ / period
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex-1 text-[11px] text-white/45">
              Period
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as "week" | "month")}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
              >
                <option value="week" className="bg-ink-900">Weekly</option>
                <option value="month" className="bg-ink-900">Monthly</option>
              </select>
            </label>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} className="rounded" />
          Enable voice channel (LiveKit when configured)
        </label>
        <button type="submit" disabled={busy || title.trim().length < 2} className="btn btn-primary w-full py-3 disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create room"}
        </button>
      </form>
    </div>
  );
}
