import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import type { AffiliateLink } from "@/lib/api";

/** Display-only affiliate / gear links — never influence match scores. */
export function AffiliateLinks({ userId, editable }: { userId: string; editable?: boolean }) {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [merchant, setMerchant] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLinks(await api.listAffiliateLinks(userId));
  }
  useEffect(() => { void load(); }, [userId]);

  async function add() {
    if (!label.trim() || !url.trim()) return;
    setBusy(true);
    try {
      await api.upsertAffiliateLink({ label, url, merchant: merchant || null });
      setLabel(""); setUrl(""); setMerchant("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.deleteAffiliateLink(id);
    await load();
  }

  if (!editable && links.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="eyebrow mb-1">Gear I use</p>
      <p className="mb-3 text-[11px] leading-snug text-white/40">
        Plugins, interfaces, monitors — affiliate links may earn a commission. Never affect match ranking.
      </p>
      {links.length > 0 && (
        <div className="mb-3 divide-y divide-[var(--hairline)]">
          {links.map((l) => (
            <div key={l.id} className="flex items-center gap-2 py-2.5">
              <a href={l.url} target="_blank" rel="sponsored noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-veil-100 hover:text-white">
                <span className="font-medium text-white/85">{l.label}</span>
                {l.merchant && <span className="text-white/40"> · {l.merchant}</span>}
                <ExternalLink className="ml-1 inline h-3 w-3 opacity-50" />
              </a>
              {editable && (
                <button type="button" onClick={() => remove(l.id)} aria-label="Remove"
                  className="rounded-full p-1 text-white/35 hover:text-wild"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      )}
      {editable && (
        <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <input value={label} onChange={(e) => setLabel(e.target.value.slice(0, 80))} placeholder="Label — e.g. My headphones"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (affiliate URL)"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <input value={merchant} onChange={(e) => setMerchant(e.target.value.slice(0, 80))} placeholder="Merchant (optional)"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
          <button type="button" onClick={add} disabled={busy || !label.trim() || !url.trim()}
            className="btn btn-primary h-10 w-full py-0 text-sm disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add link</>}
          </button>
        </div>
      )}
    </div>
  );
}
