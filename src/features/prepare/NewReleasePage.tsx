import { Navigate } from "react-router-dom";

/** Legacy scan entry — Analyzer intake lives on `/releases` (audio-only desk). */
export function NewReleasePage() {
  return <Navigate to="/releases" replace />;
}
