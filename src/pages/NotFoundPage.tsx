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
        className="forge-glass-edge w-full max-w-md p-8"
      >
        <div className="mb-5 flex justify-center"><BrandLockup height="h-8" /></div>
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-veil-500/20 text-veil-100">
          <Compass className="h-7 w-7" />
        </span>
        <p className="nexus-eyebrow">404</p>
        <h1 className="nexus-headline mt-2 text-2xl">Off the map</h1>
        <p className="nexus-subline mt-2 text-[15px]">
          This path doesn't exist on VYBZ — or it moved. Head home and keep creating.
        </p>
        <button onClick={() => navigate("/")} className="forge-cta mt-6 w-full py-3.5 text-[15px]">
          <Home className="h-4 w-4" /> Back to the feed
        </button>
      </motion.div>
    </div>
  );
}
