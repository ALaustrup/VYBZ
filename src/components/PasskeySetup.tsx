import { useCallback, useEffect, useState } from "react";
import { Check, Fingerprint, Loader2, Pencil, Trash2 } from "lucide-react";
import { useApp } from "@/store/AppStore";
import {
  deletePasskey,
  listPasskeys,
  passkeysSupported,
  registerPasskey,
  renamePasskey,
  type PasskeyRow,
} from "@/lib/passkey";
import { cx } from "@/lib/utils";

function timeAgoShort(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return "just now";
}

/**
 * Add and manage passkeys: instant biometric sign-in (Face ID / fingerprint /
 * device). Lists the account's passkeys with rename + revoke. Requires an email
 * anchor (the recovery key), so we nudge there if the account isn't email-backed.
 */
export function PasskeySetup() {
  const { backendEnabled, showToast } = useApp();
  const [busy, setBusy] = useState(false);
  const [keys, setKeys] = useState<PasskeyRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const refresh = useCallback(() => {
    void listPasskeys().then(setKeys);
  }, []);

  useEffect(() => {
    if (backendEnabled) refresh();
  }, [backendEnabled, refresh]);

  if (!backendEnabled || !passkeysSupported()) return null;

  async function add() {
    setBusy(true);
    try {
      const { verified } = await registerPasskey();
      if (verified) {
        showToast("Passkey added — sign in with your face or fingerprint next time.");
        refresh();
      } else {
        showToast("Couldn't add that passkey.");
      }
    } catch (e) {
      const msg = String((e as Error)?.message ?? "");
      showToast(
        /email/i.test(msg)
          ? "Add an email above first, then create a passkey."
          : "Passkey setup was cancelled."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveLabel(id: string) {
    const label = draftLabel.trim();
    setEditing(null);
    if (!label) return;
    await renamePasskey(id, label);
    refresh();
  }

  async function revoke(id: string) {
    await deletePasskey(id);
    showToast("Passkey removed.");
    refresh();
  }

  return (
    <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-veil-300" />
        <h3 className="font-display text-sm font-semibold text-white">
          Passkey sign-in
        </h3>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-white/50">
        Sign in instantly with Face ID, fingerprint, or your device — no codes,
        no passwords.
      </p>

      {/* Existing passkeys. */}
      {keys.length > 0 && (
        <ul className="mb-3 space-y-2">
          {keys.map((k, i) => (
            <li
              key={k.credential_id}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2"
            >
              <Fingerprint className="h-4 w-4 shrink-0 text-veil-300/70" />
              {editing === k.credential_id ? (
                <input
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveLabel(k.credential_id)}
                  autoFocus
                  placeholder="Passkey name"
                  className="min-w-0 flex-1 rounded-lg bg-white/[0.06] px-2 py-1 text-sm text-white focus:outline-none"
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/85">
                    {k.label || `Passkey ${i + 1}`}
                  </p>
                  <p className="text-[10px] text-white/35">
                    used {timeAgoShort(k.last_used_at)}
                  </p>
                </div>
              )}
              {editing === k.credential_id ? (
                <button
                  onClick={() => saveLabel(k.credential_id)}
                  aria-label="Save name"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-feel active:scale-90"
                >
                  <Check className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditing(k.credential_id);
                    setDraftLabel(k.label ?? "");
                  }}
                  aria-label="Rename"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 active:scale-90 hover:text-white/70"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => revoke(k.credential_id)}
                aria-label="Revoke passkey"
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 active:scale-90 hover:text-wild"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={add}
        disabled={busy}
        className={cx(
          "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50",
          keys.length > 0
            ? "border border-white/10 text-white/75"
            : "bg-veil-500 text-white shadow-glow"
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="h-4 w-4" />
        )}
        {keys.length > 0 ? "Add another passkey" : "Add a passkey"}
      </button>
    </div>
  );
}
