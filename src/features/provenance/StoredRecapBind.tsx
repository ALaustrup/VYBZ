import { useEffect, useState } from "react";
import { Loader2, Link2 } from "lucide-react";
import { NOT_MEASURED } from "@/product/invariants";
import { c2paLedgerLabel } from "./audioBind";
import {
  bindSessionStoredAudio,
  listHostHashedAssets,
  type HashedAsset,
} from "./provenanceApi";
import type { StoredAudioBind } from "./audioBind";

export function StoredRecapBind({
  liveSessionId,
  current,
  onBound,
}: {
  liveSessionId: string;
  current: StoredAudioBind | null | undefined;
  onBound: (next: StoredAudioBind) => void;
}) {
  const [assets, setAssets] = useState<HashedAsset[]>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void listHostHashedAssets(24).then((list) => {
      if (alive) setAssets(list);
    });
    return () => { alive = false; };
  }, []);

  async function bind() {
    if (!pick || busy) return;
    setBusy(true);
    setErr(null);
    const next = await bindSessionStoredAudio(liveSessionId, pick);
    setBusy(false);
    if (!next?.hex) {
      setErr("Couldn't bind that file. It needs a stored SHA.");
      return;
    }
    onBound(next);
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">
        <Link2 className="h-3.5 w-3.5 text-cyan-300" /> Stored recap
      </p>
      <p className="text-[11px] text-white/40">
        SHA comes from the file already in storage. Saying this file is the live mix is declared.
        C2PA on the file is {NOT_MEASURED}.
      </p>
      {current?.hex && (
        <p className="font-mono text-[11px] text-cyan-100/80">
          {current.hex.slice(0, 16)}… · C2PA {c2paLedgerLabel(current.c2paLedgerEvents)}
        </p>
      )}
      {assets.length === 0 ? (
        <p className="text-[12px] text-white/40">No stored files with a SHA yet.</p>
      ) : (
        <div className="flex gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink-950 px-2 py-1.5 text-[12px] text-white"
          >
            <option value="">Choose a file…</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title || a.sha256.slice(0, 12)}
              </option>
            ))}
          </select>
          <button type="button" disabled={!pick || busy} onClick={() => void bind()} className="btn btn-ghost h-8 px-3 py-0 text-[11px]">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Bind"}
          </button>
        </div>
      )}
      {err && <p className="text-[11px] text-amber-200/80">{err}</p>}
    </div>
  );
}
