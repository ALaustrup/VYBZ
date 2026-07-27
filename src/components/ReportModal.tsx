import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { ReportKind, ReportReason } from "@/types";

const REASONS: { id: ReportReason; label: string }[] = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "hate", label: "Hate / abuse" },
  { id: "catfish", label: "Catfish / fake" },
  { id: "underage", label: "Underage" },
  { id: "nsfw", label: "NSFW" },
  { id: "impersonation", label: "Impersonation" },
  { id: "misinformation", label: "Misinformation" },
  { id: "illegal", label: "Illegal" },
  { id: "other", label: "Something else" },
];

/** Lightweight report dialog — feeds the moderation queue. */
export function ReportModal({ open, onClose, targetKind, targetId, targetLabel }: {
  open: boolean; onClose: () => void; targetKind: ReportKind; targetId: string; targetLabel?: string;
}) {
  const { showToast } = useSession();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  async function submit() {
    if (!reason) return;
    setBusy(true);
    try {
      await api.reportContent(targetKind, targetId, reason, detail.trim() || undefined);
      showToast("Thanks — our moderators will take a look.");
      onClose(); setReason(null); setDetail("");
    } catch (e) { showToast((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="glass-panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <Flag className="h-4 w-4 text-wild" />
          <h2 className="flex-1 font-display text-lg font-bold text-white">Report {targetKind}</h2>
          <button onClick={onClose} aria-label="Close" className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {targetLabel && <p className="mb-3 line-clamp-2 rounded-lg bg-black/20 px-3 py-2 text-[12px] text-white/60">{targetLabel}</p>}
        <div className="mb-3 flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r.id} onClick={() => setReason(r.id)}
              className={cx("rounded-full px-3 py-1.5 text-[13px] font-medium transition active:scale-95",
                reason === r.id ? "bg-wild/25 text-white ring-1 ring-wild/50" : "bg-white/[0.05] text-white/65 hover:text-white/90")}>
              {r.label}
            </button>
          ))}
        </div>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2}
          placeholder="Add any detail (optional)" className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[14px] text-white placeholder:text-white/35 focus:border-wild/50 focus:outline-none" />
        <button onClick={submit} disabled={!reason || busy} className="btn btn-primary w-full py-3 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
        </button>
      </div>
    </div>
  );
}
