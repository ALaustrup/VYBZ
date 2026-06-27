import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Glasses, Loader2 } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { CONFESSIONS } from "@/data/confessions";
import { bgVariant } from "@/lib/backgrounds";
import {
  mountVeiledXR,
  type VeiledXRHandle,
  type XRConfession,
} from "@/xr/veiledXR";
import type { Confession } from "@/types";

type Support = "checking" | "supported" | "unsupported";

/**
 * MYVYB XR — the immersive WebXR entry. Mounts an imperative Three.js scene and
 * offers an "Enter VR" gateway (Quest 2/3). Falls back to a draggable 3D preview
 * on desktop/phones.
 */
export function XRPage() {
  const navigate = useNavigate();
  const { backendConfessions, recordSwipe, bgVariant: bgVariantId } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<VeiledXRHandle | null>(null);
  const [support, setSupport] = useState<Support>("checking");
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Build the data set: real confessions first, demo content as filler.
    const pool: Confession[] = [...backendConfessions, ...CONFESSIONS];
    const seen = new Set<string>();
    const xrData: XRConfession[] = [];
    for (const c of pool) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      xrData.push({
        id: c.id,
        text: c.text,
        alias: c.alias,
        feels: c.feels ?? 0,
        wilds: c.wilds ?? 0,
      });
      if (xrData.length >= 16) break;
    }

    const byId = new Map(pool.map((c) => [c.id, c]));
    const variant = bgVariant(bgVariantId);
    const handle = mountVeiledXR(el, {
      confessions: xrData,
      accent: variant.colors[0],
      accent2: variant.colors[1],
      onReact: (id, reaction) => {
        const conf = byId.get(id);
        if (conf) recordSwipe(conf, reaction);
      },
    });
    handleRef.current = handle;
    handle.isSupported().then((ok) => setSupport(ok ? "supported" : "unsupported"));

    return () => {
      handle.dispose();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enter() {
    if (!handleRef.current) return;
    setEntering(true);
    try {
      await handleRef.current.enterVR();
    } catch {
      setSupport("unsupported");
    } finally {
      setEntering(false);
    }
  }

  return (
    <div className="fixed inset-0 z-0 bg-ink-950">
      {/* Three.js canvas mounts here (fills the screen). */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Back. */}
      <button
        onClick={() => navigate("/")}
        aria-label="Back"
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full glass text-white/80 active:scale-90"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Title + enter gateway. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-[0.3em] text-gradient">
            MYVYB XR
          </h1>
          <p className="mt-1 text-xs text-white/45">
            Step inside the veil — confessions, all around you.
          </p>
        </div>

        {support === "checking" && (
          <span className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your headset…
          </span>
        )}

        {support === "supported" && (
          <button
            onClick={enter}
            disabled={entering}
            className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-veil-500 px-7 py-4 font-display text-lg font-semibold text-white shadow-glow transition active:scale-[0.97] disabled:opacity-60"
          >
            <Glasses className="h-5 w-5" />
            {entering ? "Entering…" : "Enter VR"}
          </button>
        )}

        {support === "unsupported" && (
          <div className="pointer-events-none max-w-xs rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs leading-relaxed text-white/55">
            Drag to look around · tap a confession to Feel it. For the full
            room-scale experience, open{" "}
            <span className="font-semibold text-white/80">myvybsocial.vercel.app/xr</span>{" "}
            in your Meta Quest 2/3 browser and tap{" "}
            <span className="font-semibold text-veil-200">Enter VR</span>.
          </div>
        )}
      </div>
    </div>
  );
}
