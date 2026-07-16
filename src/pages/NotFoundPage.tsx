import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Home } from "lucide-react";
import { BrandLockup } from "@/components/Brand";

/** Smoked-glass 404 — replaces the silent `* → /` redirect. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="glass-panel w-full max-w-md p-8"
      >
        <div className="mb-5 flex justify-center"><BrandLockup height="h-8" /></div>
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-veil-500/20 text-veil-100">
          <Compass className="h-7 w-7" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-gradient">Off the map</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/60">
          This path doesn't exist on VYBZ — or it moved. Head home and keep creating.
        </p>
        <button onClick={() => navigate("/")} className="btn btn-primary mt-6 w-full py-3.5 text-[15px]">
          <Home className="h-4 w-4" /> Back to the feed
        </button>
      </motion.div>
    </div>
  );
}
