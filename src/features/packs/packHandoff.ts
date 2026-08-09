/** Session handoff of a built pack ZIP to storefront editor (OR-020). */

const KEY = "vybz.packHandoff.v1";

export type PackHandoff = {
  title: string;
  fileName: string;
  /** Object URL — consumer must revoke. */
  objectUrl: string;
};

export function savePackHandoff(opts: { title: string; fileName: string; blob: Blob }): void {
  const objectUrl = URL.createObjectURL(opts.blob);
  const prev = sessionStorage.getItem(KEY);
  if (prev) {
    try {
      const old = JSON.parse(prev) as PackHandoff;
      if (old.objectUrl) URL.revokeObjectURL(old.objectUrl);
    } catch {
      /* ignore */
    }
  }
  const payload: PackHandoff = {
    title: opts.title,
    fileName: opts.fileName,
    objectUrl,
  };
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function takePackHandoff(): PackHandoff | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as PackHandoff;
  } catch {
    return null;
  }
}
