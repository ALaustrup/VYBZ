/**
 * Deep-link / auth-callback route handler (Phase 1.5 + Phase 6 Android).
 * Supports https://vybz.cloud/... and custom scheme vybz://release/{id}.
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
  /** Normalized release id when kind is open_release */
  releaseId?: string;
}

const KIND_BY_PREFIX: Array<{ prefix: string; kind: DeepLinkKind }> = [
  { prefix: "/auth/callback", kind: "oauth_callback" },
  { prefix: "/auth/confirm", kind: "email_verification" },
  { prefix: "/auth/recover", kind: "password_recovery" },
  { prefix: "/auth/magic", kind: "magic_link" },
  { prefix: "/invite", kind: "invitation" },
  { prefix: "/releases/", kind: "open_release" },
  { prefix: "/release/", kind: "open_release" },
  { prefix: "/findings/", kind: "open_finding" },
  { prefix: "/jobs/", kind: "open_job" },
];

function parseVybzScheme(raw: string): ParsedDeepLink | null {
  // vybz://release/{id} or vybz:release/{id}
  const m = /^vybz:(?:\/\/)?release\/([^/?#]+)/i.exec(raw.trim());
  if (!m) return null;
  const releaseId = decodeURIComponent(m[1]!);
  return {
    kind: "open_release",
    path: `/release/${releaseId}`,
    params: {},
    raw,
    releaseId,
  };
}

export function parseDeepLink(raw: string): ParsedDeepLink {
  const custom = parseVybzScheme(raw);
  if (custom) return custom;

  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "https://vybz.cloud");
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const path = url.pathname;
    const match = KIND_BY_PREFIX.find((entry) => path.startsWith(entry.prefix));
    let releaseId: string | undefined;
    if (match?.kind === "open_release") {
      const parts = path.split("/").filter(Boolean);
      // /release/:id or /releases/:id
      if (parts[0] === "release" || parts[0] === "releases") releaseId = parts[1];
    }
    return {
      kind: match?.kind ?? "unknown",
      path,
      params,
      raw,
      releaseId,
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
      if (link.releaseId) return `/release/${link.releaseId}`;
      return link.path.startsWith("/releases/")
        ? link.path.replace(/^\/releases\//, "/release/")
        : link.path;
    case "open_finding":
      return link.path;
    case "open_job":
      return link.path;
    default:
      return null;
  }
}
