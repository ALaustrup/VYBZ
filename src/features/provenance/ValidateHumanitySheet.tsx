import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { OverlayPortal } from "@/lib/overlayPortal";
import { listProfileProjects } from "@/lib/api";
import { listHostStageNights, type StageNight } from "@/features/profile/stageNights";
import { SessionProvenanceBadge } from "./SessionProvenanceBadge";
import {
  associateSessionWork,
  listCreationSessionLinks,
} from "./provenanceApi";
import { WORK_SESSION_CLAIM } from "@/product/invariants";
import {
  attestWorkSessions,
  canValidateHumanity,
  linksForAsset,
  type WorkSessionLink,
} from "./workAttestation";

export function ValidateHumanitySheet({
  open,
  onClose,
  hostId,
  assetId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  hostId: string;
  assetId: string | null;
  title: string;
}) {
  const [nights, setNights] = useState<StageNight[]>([]);
  const [links, setLinks] = useState<WorkSessionLink[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [pick, setPick] = useState("");
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const eligible = canValidateHumanity({ isOwner: true, hasAsset: Boolean(assetId), online: true });
  const associated = attestWorkSessions(linksForAsset(links, assetId));

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void Promise.all([
      listHostStageNights(hostId, 40),
      listCreationSessionLinks(hostId),
      listProfileProjects(hostId).catch(() => []),
    ]).then(([nightList, linkList, projectList]) => {
      if (!alive) return;
      setNights(nightList.filter((n) => n.sealed));
      setLinks(linkList);
      setProjects(projectList.map((p) => ({ id: p.id, name: p.name })));
    });
    return () => {
      alive = false;
    };
  }, [open, hostId]);

  async function associate() {
    if (!pick || !eligible.ok || busy) return;
    setBusy(true);
    setErr(null);
    const ok = await associateSessionWork(pick, {
      assetId,
      projectId: projectId || null,
    });
    setBusy(false);
    if (!ok) {
      setErr("Couldn't associate that session. The file needs a stored SHA, and the live must be sealed.");
      return;
    }
    const next = await listCreationSessionLinks(hostId);
    setLinks(next);
  }

  if (!open) return null;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Validate Humanity"
          data-testid="validate-humanity-sheet"
          className="mat-surface-strong w-full max-w-md rounded-t-3xl border-t border-white/12 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:border"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-200/80" /> Validate Humanity
          </p>
          <p className="mt-1 font-display text-base font-semibold text-white">{title}</p>
          {associated.associated && associated.claim ? (
            <p className="mt-2 text-[13px] leading-relaxed text-cyan-100/85">{associated.claim}</p>
          ) : (
            <p className="mt-2 text-[13px] leading-relaxed text-white/55">
              Associate this stored file with a sealed VYBZ live. The MVP sentence is: {WORK_SESSION_CLAIM}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-white/35">{associated.refusal}</p>

          {associated.sessionCount > 0 && (
            <ul className="mt-3 space-y-1.5">
              {linksForAsset(links, assetId).map((link) => (
                <li key={link.liveSessionId} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
                  <a href={`/live/${link.liveSessionId}`} className="truncate font-mono text-[11px] text-cyan-100/80">
                    Session {link.liveSessionId.slice(0, 8)}
                  </a>
                  {link.strength && <SessionProvenanceBadge strength={link.strength} compact />}
                </li>
              ))}
            </ul>
          )}

          {!eligible.ok ? (
            <p className="mt-3 text-[12px] text-amber-200/80">{eligible.reason}</p>
          ) : nights.length === 0 ? (
            <p className="mt-3 text-[12px] text-white/40">No sealed lives yet. Go live, then come back.</p>
          ) : (
            <div className="mt-3 space-y-2">
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                data-testid="validate-humanity-session"
                className="w-full rounded-lg border border-white/10 bg-ink-950 px-2 py-2 text-[12px] text-white"
              >
                <option value="">Choose a sealed session…</option>
                {nights.map((n) => (
                  <option key={n.id} value={n.id}>
                    {(n.title || n.intent || "Live") + (n.strength ? ` · ${n.strength}` : "")}
                  </option>
                ))}
              </select>
              {projects.length > 0 && (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-ink-950 px-2 py-2 text-[12px] text-white"
                >
                  <option value="">Project (optional)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                disabled={!pick || busy}
                onClick={() => void associate()}
                data-testid="validate-humanity-bind"
                className="btn btn-primary h-9 w-full py-0 text-xs"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Associate session"}
              </button>
            </div>
          )}
          {err && <p className="mt-2 text-[11px] text-amber-200/80">{err}</p>}
          <button type="button" onClick={onClose} className="btn btn-ghost mt-3 h-9 w-full py-0 text-xs">
            Close
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}
