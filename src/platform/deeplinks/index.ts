/**
 * Deep-link / auth-callback route handler skeleton (Phase 1.5).
 * Full App Links verification lands in Phase 2.A / 2.D.
 */

export type DeepLinkKind =
  | "oauth_callback"
  | "magic_link"
  | "password_recovery"
  | "email_verification"
  | "invitation"
  | "open_release"
  | "open_finding"
  | "open_job"
  | "unknown";

export interface ParsedDeepLink {
  kind: DeepLinkKind;
  path: string;
  params: Record<string, string>;
  raw: string;
}

const KIND_BY_PREFIX: Array<{ prefix: string; kind: DeepLinkKind }> = [
  { prefix: "/auth/callback", kind: "oauth_callback" },
  { prefix: "/auth/confirm", kind: "email_verification" },
  { prefix: "/auth/recover", kind: "password_recovery" },
  { prefix: "/auth/magic", kind: "magic_link" },
  { prefix: "/invite", kind: "invitation" },
  { prefix: "/releases/", kind: "open_release" },
  { prefix: "/findings/", kind: "open_finding" },
  { prefix: "/jobs/", kind: "open_job" },
];

export function parseDeepLink(raw: string): ParsedDeepLink {
  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "https://vybz.cloud");
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const path = url.pathname;
    const match = KIND_BY_PREFIX.find((entry) => path.startsWith(entry.prefix));
    return {
      kind: match?.kind ?? "unknown",
      path,
      params,
      raw,
    };
  } catch {
    return { kind: "unknown", path: "", params: {}, raw };
  }
}

/** Map a parsed link to an in-app route (best-effort). */
export function deepLinkToAppPath(link: ParsedDeepLink): string | null {
  switch (link.kind) {
    case "oauth_callback":
    case "magic_link":
    case "email_verification":
      return "/auth/callback";
    case "password_recovery":
      return "/auth/recover";
    case "invitation":
      return `/invite${link.params.token ? `?token=${encodeURIComponent(link.params.token)}` : ""}`;
    case "open_release":
      return link.path;
    case "open_finding":
      return link.path;
    case "open_job":
      return link.path;
    default:
      return null;
  }
}
