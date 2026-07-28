// Bunny CDN Token Authentication signer.
//
// Supports:
//   - advanced (default): HMAC-SHA256 → `HS256-` + base64url  (Token Auth V2 / current libs)
//   - basic: SHA256(key + path + expires) base64url           (legacy pull-zone mode)
//
// Set Edge secret BUNNY_TOKEN_AUTH_MODE=basic to force legacy if a zone still needs it.
// Host may be bare (`zone.b-cdn.net`) or include https:// — both are normalized.

export type BunnyTokenMode = "advanced" | "basic";

function normalizeHost(host: string): string {
  return host.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let b64 = "";
  for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
  return btoa(b64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return new Uint8Array(sig);
}

async function sha256Raw(message: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return new Uint8Array(digest);
}

/**
 * Mint a short-lived token URL for a secure-zone storage path (`drops/…`).
 */
export async function signBunnyUrl(
  host: string,
  key: string,
  storagePath: string,
  ttlSec = 7200,
  mode: BunnyTokenMode = "advanced",
): Promise<string> {
  const cdn = normalizeHost(host);
  const path = storagePath.startsWith("/") ? storagePath : `/${storagePath}`;
  const expires = Math.floor(Date.now() / 1000) + ttlSec;

  let token: string;
  if (mode === "basic") {
    // Legacy: Base64Url(SHA256(key + path + expires))
    const digest = await sha256Raw(key + path + String(expires));
    token = base64UrlFromBytes(digest);
  } else {
    // Advanced / Token Auth V2 (BunnyCDN.TokenAuthentication):
    // token = "HS256-" + Base64Url(HMAC-SHA256(key, path + expires))
    const mac = await hmacSha256(key, path + String(expires));
    token = `HS256-${base64UrlFromBytes(mac)}`;
  }

  return `https://${cdn}${path}?token=${encodeURIComponent(token)}&expires=${expires}`;
}

/** Whether a stored asset path lives in the token-authed secure Bunny zone. */
export function isSecureBunnyPath(p: string): boolean {
  return /^(drops|projects|repo-blobs)\//.test(p);
}
