import { useCallback, useEffect, useState } from "react";
import { KeyRound, Plus, Loader2, Trash2, Check, X } from "lucide-react";
import {
  listPasskeys,
  registerPasskey,
  renamePasskey,
  deletePasskey,
  passkeysSupported,
  type PasskeyRow,
} from "@/lib/passkey";
import { useSession } from "@/store/session";

/**
 * Signed-in passkey management: add a passkey (upgrades a password account to
 * one-tap sign-in), rename, and revoke. Degrades gracefully where WebAuthn is
 * unavailable. This is the post-login "add a passkey" affordance.
 */
export function PasskeysCard() {
  const { showToast } = useSession();
  const [rows, setRows] = useState<PasskeyRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const supported = passkeysSupported();

  const load = useCallback(async () => {
    setRows(await listPasskeys());
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function add() {
    setAdding(true); setErr(null);
    try {
      const { verified } = await registerPasskey();
      if (verified) { showToast("Passkey added"); await load(); }
      else setErr("Couldn’t add that passkey. Try again.");
    } catch (e) {
      const name = (e as { name?: string }).name;
      // Benign: user dismissed the OS sheet, or this device already has one.
      if (name !== "NotAllowedError" && name !== "AbortError" && name !== "InvalidStateError")
        setErr("Couldn’t add that passkey. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function saveRename(id: string) {
    await renamePasskey(id, label.trim() || "Passkey");
    setEditing(null);
    await load();
  }

  async function revoke(id: string) {
    await deletePasskey(id);
    await load();
  }

  return (
    <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-1 flex items-center gap-2.5">
        <KeyRound className="h-4 w-4 shrink-0 text-veil-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Passkeys</p>
          <p className="text-[11px] text-white/45">Sign in with Face ID, Touch ID, or your device PIN — no password to remember.</p>
        </div>
        {supported && (
          <button onClick={add} disabled={adding}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-veil-500/20 px-3 py-1.5 text-xs font-semibold text-veil-100 ring-1 ring-veil-400/30 active:scale-95 disabled:opacity-60">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
          </button>
        )}
      </div>

      {!supported && (
        <p className="mt-2 text-[11px] text-white/40">This device or browser doesn’t support passkeys.</p>
      )}
      {err && <p className="mt-2 text-xs font-medium text-wild">{err}</p>}

      {rows && rows.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li key={r.credential_id} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
              {editing === r.credential_id ? (
                <>
                  <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white focus:outline-none"
                    placeholder="Passkey name" />
                  <button onClick={() => saveRename(r.credential_id)} aria-label="Save" className="text-feel active:scale-90"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(null)} aria-label="Cancel" className="text-white/40 active:scale-90"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditing(r.credential_id); setLabel(r.label ?? "Passkey"); }}
                    className="min-w-0 flex-1 truncate text-left text-sm text-white/85 hover:text-white">
                    {r.label || "Passkey"}
                  </button>
                  <span className="shrink-0 text-[10px] text-white/35">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <button onClick={() => revoke(r.credential_id)} aria-label="Revoke passkey" className="shrink-0 text-white/40 hover:text-wild active:scale-90">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows && rows.length === 0 && supported && (
        <p className="mt-2 text-[11px] text-white/40">No passkeys yet. Add one for faster, safer sign-in.</p>
      )}
    </div>
  );
}
