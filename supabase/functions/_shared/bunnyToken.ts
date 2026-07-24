// Bunny CDN Token Authentication signer (verified against the live secure zone).
//
// Algorithm (Bunny "Token Authentication"):
//   token   = base64url( sha256_raw( securityKey + path + expires ) )
//   url     = https://<host><path>?token=<token>&expires=<expires>
// where `path` has a leading slash and `expires` is a unix timestamp.
//
// The security key is server-side only (BUNNY_SECURE_TOKEN_KEY) — never shipped
// to the browser. URLs are short-lived so a leaked link expires quickly.

export async function signBunnyUrl(
  host: string,
  key: string,
  storagePath: string,
  ttlSec = 7200,
): Promise<string> {
  const path = storagePath.startsWith("/") ? storagePath : `/${storagePath}`;
  const expires = Math.floor(Date.now() / 1000) + ttlSec;
  const data = new TextEncoder().encode(key + path + String(expires));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  let b64 = "";
  for (const b of digest) b64 += String.fromCharCode(b);
  const token = btoa(b64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `https://${host}${path}?token=${token}&expires=${expires}`;
}

/** Whether a stored asset path lives in the token-authed secure Bunny zone. */
export function isSecureBunnyPath(p: string): boolean {
  return /^(drops|projects|repo-blobs)\//.test(p);
}
