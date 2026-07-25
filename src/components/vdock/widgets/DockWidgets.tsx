import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import * as api from "@/lib/api";
import { getFxIntensityPref, setFxIntensity, useFxIntensity, type FxIntensity } from "@/lib/display";
import {
  KEY_ROOTS,
  getWidgetPrefs,
  patchWidgetPrefs,
  playRefTone,
  retuneMetronome,
  setMetronome,
  useMetronomeOn,
  useWidgetPrefs,
} from "@/lib/vdock/widgetPrefs";
import { WIDGET_BY_ID, type WidgetId } from "@/lib/vdock/layout";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

/** Compact dock chip + optional detail sheet for every V-Dock widget. */
export function DockWidget({
  id,
  editing,
  dimmed,
  onDragStart,
}: {
  id: WidgetId;
  editing?: boolean;
  dimmed?: boolean;
  onDragStart?: (point: { x: number; y: number }) => void;
}) {
  const def = WIDGET_BY_ID[id];
  const [open, setOpen] = useState(false);
  const prefs = useWidgetPrefs();
  const metro = useMetronomeOn();
  const fx = useFxIntensity();
  const { profile, unread, showToast, refreshProfile } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [liveTitle, setLiveTitle] = useState<string | null>(null);

  useEffect(() => {
    if (id !== "matchRadar") return;
    void api.collabMatches(12).then((rows) => setMatchCount(rows.length)).catch(() => setMatchCount(0));
  }, [id]);

  useEffect(() => {
    if (id !== "topLivePeek") return;
    void api.topLiveSessions(1).then((rows) => {
      setLiveTitle(rows[0]?.title || rows[0]?.username || (rows[0] ? "Live" : null));
    }).catch(() => setLiveTitle(null));
  }, [id]);

  if (!def) return null;
  const Icon = def.icon;

  const badge = widgetBadge(id, {
    unread,
    metro,
    bpm: prefs.bpm,
    vc: profile?.modPoints ?? 0,
    open: prefs.openToWorkLocal ?? !!profile?.profile?.openToWork,
    matchCount,
    session: prefs.sessionRunning,
    ear: prefs.earBreakRunning,
    night: prefs.nightCraft,
    bridge: prefs.bridge.watching,
    liveTitle,
  });

  const label = widgetChipLabel(id, prefs, { metro, fx, liveTitle, vc: profile?.modPoints ?? 0 });

  return (
    <>
      <button
        type="button"
        data-dock-widget={id}
        title={def.blurb}
        aria-label={def.label}
        className={cx(
          "relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1 touch-none select-none transition",
          editing ? "vdock-pin-jiggle text-white/80" : "text-white/70 hover:text-white",
          dimmed && "pointer-events-none opacity-40",
          id === "openToWork" && (prefs.openToWorkLocal ?? profile?.profile?.openToWork) && "text-feel",
          id === "metronome" && metro && "text-veil-200",
        )}
        onPointerDown={(e) => {
          if (!editing || e.button !== 0) return;
          e.preventDefault();
          onDragStart?.({ x: e.clientX, y: e.clientY });
        }}
        onClick={() => {
          if (editing) return;
          void runQuickAction(id, {
            prefs,
            metro,
            navigate,
            showToast,
            refreshProfile,
            profile,
            setBusy,
            setOpen,
          });
        }}
      >
        <span className="relative">
          <Icon className="h-[18px] w-[18px]" />
          {badge != null && badge !== "" && (
            <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-wild px-0.5 text-[8px] font-bold text-white">
              {badge}
            </span>
          )}
        </span>
        <span className="hidden max-w-full truncate text-[9px] font-semibold sm:block">{label}</span>
      </button>

      <WidgetSheet
        open={open && !editing}
        title={def.label}
        blurb={def.blurb}
        onClose={() => setOpen(false)}
      >
        <WidgetBody
          id={id}
          busy={busy}
          matchCount={matchCount}
          liveTitle={liveTitle}
          onClose={() => setOpen(false)}
        />
      </WidgetSheet>
    </>
  );
}

function widgetBadge(
  id: WidgetId,
  s: {
    unread: number;
    metro: boolean;
    bpm: number;
    vc: number;
    open: boolean;
    matchCount: number | null;
    session: boolean;
    ear: boolean;
    night: boolean;
    bridge: boolean;
    liveTitle: string | null;
  },
): string | number | null {
  switch (id) {
    case "unreadStack": return s.unread > 0 ? (s.unread > 9 ? "9+" : s.unread) : null;
    case "matchRadar": return s.matchCount && s.matchCount > 0 ? s.matchCount : null;
    case "inviteQueue": return null;
    case "vcBalance": return null;
    case "metronome": return s.metro ? "•" : null;
    case "openToWork": return s.open ? "•" : null;
    case "bridgeWatch": return s.bridge ? "•" : null;
    case "topLivePeek": return s.liveTitle ? "•" : null;
    case "sessionTimer": return s.session ? "•" : null;
    case "earBreak": return s.ear ? "•" : null;
    case "nightCraft": return s.night ? "•" : null;
    default: return null;
  }
}

function widgetChipLabel(
  id: WidgetId,
  prefs: ReturnType<typeof useWidgetPrefs>,
  extra: { metro: boolean; fx: FxIntensity; liveTitle: string | null; vc: number },
): string {
  const def = WIDGET_BY_ID[id];
  switch (id) {
    case "metronome": return `${prefs.bpm}`;
    case "keyScale": return `${prefs.keyRoot}${prefs.keyMode === "minor" ? "m" : ""}`;
    case "fxIntensity": return extra.fx === "max" ? "Max" : extra.fx === "off" ? "Off" : "Soft";
    case "vcBalance": return `${extra.vc}`;
    case "topLivePeek": return extra.liveTitle ? "Live" : def.label;
    case "licenseStamp": return prefs.license === "free" ? "Free" : prefs.license === "collab-only" ? "Collab" : "Credit";
    default: return def.label;
  }
}

async function runQuickAction(
  id: WidgetId,
  ctx: {
    prefs: ReturnType<typeof useWidgetPrefs>;
    metro: boolean;
    navigate: ReturnType<typeof useNavigate>;
    showToast: (m: string) => void;
    refreshProfile: () => Promise<void>;
    profile: ReturnType<typeof useSession>["profile"];
    setBusy: (v: boolean) => void;
    setOpen: (v: boolean) => void;
  },
) {
  const { navigate, showToast, refreshProfile, profile, setBusy, setOpen, metro } = ctx;

  switch (id) {
    case "metronome":
      setMetronome(!metro);
      return;
    case "tuningFork":
      playRefTone(440);
      return;
    case "fxIntensity": {
      const order: FxIntensity[] = ["off", "soft", "max"];
      const now = getFxIntensityPref();
      const next = order[(order.indexOf(now) + 1) % order.length];
      setFxIntensity(next);
      showToast(`FX · ${next === "max" ? "VYBZ Max" : next}`);
      return;
    }
    case "monitorCue":
      patchWidgetPrefs({ monitorCue: !ctx.prefs.monitorCue });
      if (!ctx.prefs.monitorCue) setFxIntensity("off");
      showToast(!ctx.prefs.monitorCue ? "Monitor cue — FX off" : "Monitor cue off");
      return;
    case "nightCraft":
      patchWidgetPrefs({ nightCraft: !ctx.prefs.nightCraft });
      setFxIntensity(!ctx.prefs.nightCraft ? "soft" : "max");
      showToast(!ctx.prefs.nightCraft ? "Night craft on" : "Night craft off");
      return;
    case "goLiveArm":
      navigate("/social?go=1");
      return;
    case "vcBalance":
      navigate("/store");
      return;
    case "unreadStack":
      navigate("/activity");
      return;
    case "matchRadar":
      navigate("/connect");
      return;
    case "topLivePeek":
      navigate("/social");
      return;
    case "repoPulse":
    case "bridgeWatch":
    case "handoffReady":
    case "listingHeat":
      navigate("/projects");
      return;
    case "openToWork": {
      setBusy(true);
      try {
        const next = !(ctx.prefs.openToWorkLocal ?? !!profile?.profile?.openToWork);
        await api.updateMyProfile({
          profile: { ...(profile?.profile ?? {}), openToWork: next },
        });
        patchWidgetPrefs({ openToWorkLocal: next });
        await refreshProfile();
        showToast(next ? "Open to work" : "Not open to work");
      } catch {
        showToast("Couldn't update");
      } finally {
        setBusy(false);
      }
      return;
    }
    case "quickCapture":
      await quickCapture(showToast);
      return;
    case "sessionTimer":
      patchWidgetPrefs({
        sessionRunning: !ctx.prefs.sessionRunning,
        sessionSeconds: ctx.prefs.sessionRunning ? ctx.prefs.sessionSeconds : ctx.prefs.sessionSeconds,
      });
      return;
    case "earBreak":
      patchWidgetPrefs({
        earBreakRunning: !ctx.prefs.earBreakRunning,
        earBreakSeconds: ctx.prefs.earBreakRunning ? ctx.prefs.earBreakSeconds : 50 * 60,
      });
      showToast(!ctx.prefs.earBreakRunning ? "Ear break armed (50m)" : "Ear break cleared");
      return;
    default:
      setOpen(true);
  }
}

async function quickCapture(showToast: (m: string) => void) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    });
    rec.start();
    showToast("Recording 4s…");
    await new Promise((r) => setTimeout(r, 4000));
    rec.stop();
    stream.getTracks().forEach((t) => t.stop());
    const blob = await done;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vybz-capture-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    const bpm = getWidgetPrefs().bpm;
    patchWidgetPrefs({
      clipboardStem: { title: "Quick capture", bpm, key: `${getWidgetPrefs().keyRoot}`, at: Date.now() },
    });
    showToast("Capture saved");
  } catch {
    showToast("Mic permission needed");
  }
}

function WidgetSheet({
  open,
  title,
  blurb,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  blurb: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[72] bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-[73] mx-auto max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-card backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
                <p className="text-[12px] text-white/45">{blurb}</p>
              </div>
              <button type="button" aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full glass">
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function WidgetBody({
  id,
  busy,
  matchCount,
  liveTitle,
  onClose,
}: {
  id: WidgetId;
  busy: boolean;
  matchCount: number | null;
  liveTitle: string | null;
  onClose: () => void;
}) {
  const prefs = useWidgetPrefs();
  const metro = useMetronomeOn();
  const fx = useFxIntensity();
  const { profile, showToast } = useSession();
  const navigate = useNavigate();

  switch (id) {
    case "metronome":
      return (
        <div className="space-y-3">
          <p className="text-sm text-white/70">BPM <span className="font-display text-xl text-white">{prefs.bpm}</span></p>
          <input
            type="range" min={40} max={240} value={prefs.bpm}
            onChange={(e) => {
              patchWidgetPrefs({ bpm: Number(e.target.value) });
              retuneMetronome();
            }}
            className="w-full accent-veil-400"
          />
          <button type="button" className="btn btn-primary w-full py-3" onClick={() => setMetronome(!metro)}>
            {metro ? "Stop" : "Start"} metronome
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full py-2 text-sm"
            onClick={() => {
              // tap tempo: average last taps would be better; simple +1 for now via rapid clicks
              const last = (window as unknown as { __vybzTap?: number[] }).__vybzTap ?? [];
              const now = performance.now();
              last.push(now);
              while (last.length > 6) last.shift();
              (window as unknown as { __vybzTap: number[] }).__vybzTap = last;
              if (last.length >= 2) {
                const gaps = [];
                for (let i = 1; i < last.length; i++) gaps.push(last[i] - last[i - 1]);
                const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
                const bpm = Math.round(60000 / avg);
                if (bpm >= 40 && bpm <= 240) {
                  patchWidgetPrefs({ bpm });
                  retuneMetronome();
                  showToast(`Tap tempo · ${bpm}`);
                }
              }
            }}
          >
            Tap tempo
          </button>
        </div>
      );
    case "keyScale":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {KEY_ROOTS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => patchWidgetPrefs({ keyRoot: k })}
                className={cx(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  prefs.keyRoot === k ? "bg-veil-500/30 text-white" : "bg-white/5 text-white/50",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(["minor", "major"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => patchWidgetPrefs({ keyMode: m })}
                className={cx(
                  "flex-1 rounded-xl py-2 text-sm font-semibold capitalize",
                  prefs.keyMode === m ? "bg-veil-500/25 text-white" : "bg-white/5 text-white/45",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      );
    case "ideaScratch":
      return (
        <div className="space-y-2">
          <textarea
            value={prefs.ideaScratch}
            onChange={(e) => patchWidgetPrefs({ ideaScratch: e.target.value.slice(0, 280) })}
            rows={3}
            placeholder="Hook / lyric scratch…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
          <p className="text-[11px] text-white/35">Saved on this device · stamps with {prefs.keyRoot}{prefs.keyMode === "minor" ? "m" : ""} @ {prefs.bpm} BPM</p>
        </div>
      );
    case "clipboardStem":
      return (
        <div className="space-y-2 text-sm text-white/70">
          {prefs.clipboardStem ? (
            <>
              <p className="font-semibold text-white">{prefs.clipboardStem.title}</p>
              <p className="text-[12px] text-white/45">
                {prefs.clipboardStem.bpm ? `${prefs.clipboardStem.bpm} BPM · ` : ""}
                {prefs.clipboardStem.key ?? "—"} · {new Date(prefs.clipboardStem.at).toLocaleString()}
              </p>
              <button
                type="button"
                className="btn btn-primary w-full py-2"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${prefs.clipboardStem!.title} (${prefs.clipboardStem!.bpm ?? "?"} BPM, ${prefs.clipboardStem!.key ?? "?"})`,
                  );
                  showToast("Stem meta copied");
                }}
              >
                Copy meta
              </button>
            </>
          ) : (
            <p>No stem on clipboard — use Quick Capture or share from Studio.</p>
          )}
        </div>
      );
    case "licenseStamp":
      return (
        <div className="flex flex-col gap-2">
          {([
            ["credit-required", "Credit required"],
            ["collab-only", "Collab only"],
            ["free", "Free"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { patchWidgetPrefs({ license: id }); showToast(`Default · ${label}`); }}
              className={cx(
                "rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                prefs.license === id ? "bg-veil-500/25 text-white" : "bg-white/5 text-white/55",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      );
    case "nearbyScene":
      return (
        <div className="space-y-2">
          <input
            value={prefs.sceneTag}
            onChange={(e) => patchWidgetPrefs({ sceneTag: e.target.value.slice(0, 40) })}
            placeholder="City or scene tag…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
          <p className="text-[11px] text-white/35">Soft tag only — never precise location.</p>
        </div>
      );
    case "bridgeWatch":
      return (
        <div className="space-y-3 text-sm">
          <p className="text-white/70">
            Status:{" "}
            <span className="text-white">
              {prefs.bridge.watching ? (prefs.bridge.conflict ? "Conflict" : "Watching") : "Idle"}
            </span>
          </p>
          <button
            type="button"
            className="btn btn-primary w-full py-2"
            onClick={() => {
              patchWidgetPrefs({
                bridge: {
                  watching: !prefs.bridge.watching,
                  path: prefs.bridge.path || "Local Bridge folder",
                  lastSync: Date.now(),
                  conflict: false,
                },
              });
            }}
          >
            {prefs.bridge.watching ? "Pause watch" : "Mark watching"}
          </button>
          <button type="button" className="btn btn-ghost w-full py-2" onClick={() => { onClose(); navigate("/projects"); }}>
            Open Studio
          </button>
        </div>
      );
    case "roleBadge":
      return (
        <div className="space-y-2 text-sm text-white/70">
          <p>
            <span className="text-white/40">I am</span>{" "}
            <span className="text-white">{profile?.profile?.roleLabel || profile?.profile?.role || "Creator"}</span>
          </p>
          <p>
            <span className="text-white/40">Open</span>{" "}
            <span className="text-white">
              {(prefs.openToWorkLocal ?? profile?.profile?.openToWork) ? "Yes — seeking collabs" : "Not right now"}
            </span>
          </p>
          <button type="button" className="btn btn-ghost w-full py-2" onClick={() => { onClose(); navigate("/profile/edit"); }}>
            Edit roles
          </button>
        </div>
      );
    case "matchRadar":
      return (
        <div className="space-y-3">
          <p className="font-display text-2xl text-white">{matchCount ?? "—"}</p>
          <p className="text-sm text-white/50">High-fit matches in your deck</p>
          <button type="button" className="btn btn-primary w-full py-2" onClick={() => { onClose(); navigate("/connect"); }}>
            Open Network
          </button>
        </div>
      );
    case "topLivePeek":
      return (
        <div className="space-y-3">
          <p className="text-white">{liveTitle ?? "No one live in Top 3"}</p>
          <button type="button" className="btn btn-primary w-full py-2" onClick={() => { onClose(); navigate("/social"); }}>
            Social hub
          </button>
        </div>
      );
    case "voiceSlots":
      return (
        <div className="space-y-2 text-sm">
          <SlotRow color="bg-emerald-400" label="Green · 1st" name={prefs.voiceSlots.green} />
          <SlotRow color="bg-amber-300" label="Yellow · 2nd" name={prefs.voiceSlots.yellow} />
          <SlotRow color="bg-pink-400" label="Pink · 3rd" name={prefs.voiceSlots.pink} />
          <p className="text-[11px] text-white/35">Live occupancy wires in with room voice (slot lights).</p>
          <button
            type="button"
            className="btn btn-ghost w-full py-2 text-xs"
            onClick={() => {
              patchWidgetPrefs({
                voiceSlots: {
                  green: prefs.voiceSlots.green ?? "You",
                  yellow: prefs.voiceSlots.yellow,
                  pink: prefs.voiceSlots.pink,
                },
              });
            }}
          >
            Demo: claim green
          </button>
        </div>
      );
    case "vcBalance":
      return (
        <div className="space-y-3">
          <p className="font-display text-3xl text-white">{profile?.modPoints ?? 0} <span className="text-veil-200">V¢</span></p>
          <button type="button" className="btn btn-primary w-full py-2" onClick={() => { onClose(); navigate("/store"); }}>
            Top up
          </button>
        </div>
      );
    case "dmQuickReply":
      return (
        <div className="space-y-2">
          <p className="text-sm text-white/55">Open Messages to reply — dock composer stays opt-in for focus.</p>
          <button type="button" className="btn btn-primary w-full py-2" onClick={() => { onClose(); navigate("/messages"); }}>
            Messages
          </button>
        </div>
      );
    case "watermarkTrust":
      return (
        <p className="text-sm text-white/60">
          {prefs.watermarkAt
            ? `Last verified download · ${new Date(prefs.watermarkAt).toLocaleString()}`
            : "No watermarked download yet this session."}
        </p>
      );
    case "levelGuard":
      return (
        <div className="space-y-2">
          <p className="text-sm text-white/60">
            Browser output metering is limited. This chip flags a soft caution when you enable it.
          </p>
          <button
            type="button"
            className="btn btn-primary w-full py-2"
            onClick={() => {
              patchWidgetPrefs({ levelHot: !prefs.levelHot });
              showToast(prefs.levelHot ? "Level guard clear" : "Level guard — watch your gain");
            }}
          >
            {prefs.levelHot ? "Clear caution" : "Mark hot"}
          </button>
        </div>
      );
    case "tipJar":
    case "listingHeat":
    case "inviteQueue":
    case "studioPresence":
    case "listenTogether":
    case "handoffReady":
    case "repoPulse":
    case "goLiveArm":
    case "openToWork":
    case "fxIntensity":
    case "monitorCue":
    case "nightCraft":
    case "sessionTimer":
    case "earBreak":
    case "quickCapture":
    case "tuningFork":
    case "unreadStack":
      return (
        <div className="space-y-2 text-sm text-white/65">
          {busy && <Loader2 className="h-5 w-5 animate-spin text-veil-300" />}
          <p>
            {id === "fxIntensity" && `Intensity: ${fx}`}
            {id === "sessionTimer" && `Session ${fmtSec(prefs.sessionSeconds)} · ${prefs.sessionRunning ? "running" : "paused"}`}
            {id === "earBreak" && `Break in ${fmtSec(prefs.earBreakSeconds)}`}
            {id === "tipJar" && `Tip pulse · ${prefs.tipPulse}`}
            {id === "listingHeat" && `Listing views · ${prefs.listingViews}`}
            {id === "handoffReady" && (prefs.handoffReady ? "Handoff package marked ready" : "Mark when stems are packed")}
            {id === "listenTogether" && (prefs.listenHosting ? "Hosting listen-together" : "Not hosting")}
            {id === "inviteQueue" && "Check Activity for pending invites."}
            {id === "studioPresence" && "Open a Studio project room to see who's in."}
            {id === "repoPulse" && "Studio shows repo history & MRs."}
            {id === "goLiveArm" && "Arm Go Live from Social / Orb."}
            {id === "openToWork" && "Tap the chip to toggle availability."}
            {id === "monitorCue" && (prefs.monitorCue ? "Orb FX ducked for tracking" : "Off")}
            {id === "nightCraft" && (prefs.nightCraft ? "Night craft on" : "Off")}
            {id === "quickCapture" && "Tap the chip to record 4 seconds."}
            {id === "tuningFork" && "Tap the chip for A440."}
            {id === "unreadStack" && "Opens Activity."}
          </p>
          {(id === "handoffReady" || id === "listenTogether" || id === "listingHeat" || id === "tipJar") && (
            <button
              type="button"
              className="btn btn-ghost w-full py-2"
              onClick={() => {
                if (id === "handoffReady") patchWidgetPrefs({ handoffReady: !prefs.handoffReady });
                if (id === "listenTogether") patchWidgetPrefs({ listenHosting: !prefs.listenHosting });
                if (id === "listingHeat") patchWidgetPrefs({ listingViews: prefs.listingViews + 1 });
                if (id === "tipJar") patchWidgetPrefs({ tipPulse: prefs.tipPulse + 1 });
              }}
            >
              Toggle / bump
            </button>
          )}
        </div>
      );
    default:
      return <p className="text-sm text-white/50">Ready on V-Dock.</p>;
  }
}

function SlotRow({ color, label, name }: { color: string; label: string; name: string | null }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
      <span className={cx("h-2.5 w-2.5 rounded-full", color)} />
      <span className="text-white/45">{label}</span>
      <span className="ml-auto text-white">{name ?? "—"}</span>
    </div>
  );
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Tick session / ear-break timers while V-Dock mounted. */
export function useVDockWidgetTimers() {
  const prefs = useWidgetPrefs();
  useEffect(() => {
    if (!prefs.sessionRunning && !prefs.earBreakRunning) return;
    const iv = window.setInterval(() => {
      const p = getWidgetPrefs();
      const patch: Partial<ReturnType<typeof getWidgetPrefs>> = {};
      if (p.sessionRunning) patch.sessionSeconds = p.sessionSeconds + 1;
      if (p.earBreakRunning) {
        const next = Math.max(0, p.earBreakSeconds - 1);
        patch.earBreakSeconds = next;
        if (next === 0) {
          patch.earBreakRunning = false;
          try { navigator.vibrate?.([40, 40, 40]); } catch { /* ignore */ }
        }
      }
      if (Object.keys(patch).length) patchWidgetPrefs(patch);
    }, 1000);
    return () => window.clearInterval(iv);
  }, [prefs.sessionRunning, prefs.earBreakRunning]);
}
