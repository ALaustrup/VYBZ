import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CREDIT_ROLES, type CreditRole, type ReleaseCredit } from "@vybz/domain/credits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StateView } from "@/components/states/StateView";
import { useSession } from "@/store/session";
import { getReleaseBundle } from "@/features/prepare/service";
import {
  addCredit,
  deleteCredit,
  ensureMetadataCredits,
  getPrepareOwnerId,
  listCredits,
  updateCredit,
} from "@/features/credits/service";
import { SyncConflictPanel } from "@/features/sync/SyncConflictPanel";
import { NexusPageHeader } from "@/components/NexusPageHeader";

function roleLabel(role: CreditRole): string {
  return role.replace(/_/g, " ");
}

export function ReleaseCreditsPage() {
  const { id } = useParams();
  const { userId } = useSession();
  const ownerId = getPrepareOwnerId(userId);
  const [credits, setCredits] = useState<ReleaseCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<CreditRole>("primary_artist");
  const [splitPct, setSplitPct] = useState("");
  const [saving, setSaving] = useState(false);
  const [releaseTitle, setReleaseTitle] = useState("Release");

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const bundle = await getReleaseBundle(ownerId, id);
      if (bundle) {
        setReleaseTitle(bundle.project.title);
        const audio = bundle.assets.find((a) => a.kind === "audio");
        const probe = (audio?.probe ?? {}) as { artistFromName?: string; composerFromName?: string };
        await ensureMetadataCredits({
          ownerId,
          releaseId: id,
          artistName: bundle.project.artistName || probe.artistFromName,
          composerName: probe.composerFromName ?? null,
        });
      }
      setCredits(await listCredits(ownerId, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credits");
    } finally {
      setLoading(false);
    }
  }, [id, ownerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const splitWarning = useMemo(() => {
    const total = credits.reduce((s, c) => s + (c.splitBps ?? 0), 0);
    if (total === 0) return null;
    return `${(total / 100).toFixed(1)}% allocated`;
  }, [credits]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const splitBps = splitPct.trim() === "" ? null : Math.round(Number(splitPct) * 100);
      await addCredit({
        ownerId,
        releaseId: id,
        displayName: name,
        role,
        splitBps: Number.isFinite(splitBps as number) ? splitBps : null,
        source: "manual",
        sortOrder: credits.length,
      });
      setName("");
      setSplitPct("");
      setCredits(await listCredits(ownerId, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save credit");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirm(credit: ReleaseCredit) {
    await updateCredit(ownerId, credit.id, { status: "confirmed" });
    setCredits(await listCredits(ownerId, id!));
  }

  async function onDelete(creditId: string) {
    await deleteCredit(ownerId, creditId);
    setCredits(await listCredits(ownerId, id!));
  }

  if (loading) return <StateView variant="loading" title="Loading credits" />;
  if (!id) return <StateView variant="error" title="Missing release" />;

  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-[max(7rem,env(safe-area-inset-bottom))] md:p-8"
      data-testid="credits-page"
    >
      <NexusPageHeader
        eyebrow="Credits"
        title={releaseTitle}
        subtitle="Every name accounted for. Every split confirmed."
        backTo={{ href: `/release/${id}`, label: "← Prepare" }}
      />
      <h1 className="sr-only" data-testid="credits-release-title">{releaseTitle}</h1>
      {splitWarning ? <p className="text-xs text-white/45">{splitWarning}</p> : null}

      {error ? <StateView variant="error" title="Credits error" body={error} /> : null}

      <SyncConflictPanel projectId={id} />

      <form className="forge-card flex flex-col gap-3" onSubmit={onAdd}>
        <Input
          label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contributor name"
          data-testid="credits-name"
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-snow">Role</span>
          <select
            className="rounded-suite-md border border-white/10 bg-abyss/60 px-3 py-2 text-sm text-snow"
            value={role}
            onChange={(e) => setRole(e.target.value as CreditRole)}
            data-testid="credits-role"
          >
            {CREDIT_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Split % (optional)"
          value={splitPct}
          onChange={(e) => setSplitPct(e.target.value)}
          placeholder="e.g. 50"
          inputMode="decimal"
          data-testid="credits-split"
        />
        <Button type="submit" variant="forge" loading={saving} className="min-h-11" data-testid="credits-add">
          Add credit
        </Button>
      </form>

      {credits.length === 0 ? (
        <StateView
          variant="empty"
          title="No credits yet"
          body="Add contributors manually, or import audio so artist metadata can seed a primary artist."
        />
      ) : null}
      <ul className="flex flex-col gap-2" data-testid="credits-list">
        {credits.map((c) => (
          <li
            key={c.id}
            className="forge-card flex flex-wrap items-center justify-between gap-3"
            data-testid={`credits-row-${c.id}`}
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-snow" data-testid="credits-row-name">
                {c.displayName}
              </p>
              <p className="text-xs text-fog">
                {roleLabel(c.role)}
                {c.splitBps != null ? ` · ${(c.splitBps / 100).toFixed(1)}%` : ""}
                {c.source === "audio_metadata" ? " · from audio metadata" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={c.status === "confirmed" ? "success" : "neutral"}>{c.status}</Badge>
              {c.status !== "confirmed" ? (
                <Button size="sm" variant="secondary" onClick={() => void onConfirm(c)} data-testid="credits-confirm">
                  Confirm
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => void onDelete(c.id)}>
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>

    </div>
  );
}
