/**
 * M8 — assemble a checksummed release package (audio/art bytes optional).
 * Masterplan §10: packages complete and checksummed; every finding cites a rule.
 */

import type { ReleaseBundle, ReleaseFinding } from "@vybz/domain/releases";
import type { ReleaseCredit } from "@vybz/domain/credits";
import { buildZip, sha256Hex, type ZipEntry } from "@/features/distribution/packageZip";
import { getFindingGuide } from "@/features/prepare/findingGuide";

export const RELEASE_ASSEMBLE_VERSION = "m8.assemble.1";

export type ReleaseAssembleFile = {
  path: string;
  bytes: Uint8Array;
};

export type ReleaseAssembleManifest = {
  version: typeof RELEASE_ASSEMBLE_VERSION;
  releaseId: string;
  title: string;
  artistName: string | null;
  status: string;
  generatedAt: string;
  /** SHA-256 of the assembled ZIP bytes (measured after build; returned with package). */
  packageSha256: string;
  entrySha256: Record<string, string>;
  findings: Array<{
    code: string;
    severity: string;
    category: string;
    title: string;
    detail: string;
    status: string;
    ruleCitation: string;
  }>;
  credits: Array<{
    displayName: string;
    role: string;
    splitBps: number | null;
    status: string;
  }>;
  assets: Array<{
    kind: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string | null;
  }>;
};

function citeFinding(f: Pick<ReleaseFinding, "code" | "detail">): string {
  const guide = getFindingGuide(f.code);
  if (guide?.target) return `rule:${f.code} · ${guide.target}`;
  if (guide?.why) return `rule:${f.code} · ${guide.why}`;
  return `rule:${f.code} · ${f.detail.slice(0, 120)}`;
}

export async function assembleReleasePackage(opts: {
  bundle: ReleaseBundle;
  credits?: ReleaseCredit[];
  files?: ReleaseAssembleFile[];
}): Promise<{
  bytes: Uint8Array;
  sha256: string;
  fileName: string;
  manifest: ReleaseAssembleManifest;
}> {
  const { bundle, credits = [], files = [] } = opts;
  const { project, assets, findings } = bundle;

  const entrySha256: Record<string, string> = {};
  const zipEntries: ZipEntry[] = [];

  for (const file of files) {
    const path = file.path.replace(/\\/g, "/");
    entrySha256[path] = await sha256Hex(file.bytes);
    zipEntries.push({ path, bytes: file.bytes });
  }

  const findingsPayload = findings.map((f) => ({
    code: f.code,
    severity: f.severity,
    category: f.category,
    title: f.title,
    detail: f.detail,
    status: f.status,
    ruleCitation: citeFinding(f),
  }));

  const creditsPayload = credits.map((c) => ({
    displayName: c.displayName,
    role: c.role,
    splitBps: c.splitBps,
    status: c.status,
  }));

  const assetsPayload = assets.map((a) => ({
    kind: a.kind,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    checksum: a.checksum,
  }));

  const creditsJson = new TextEncoder().encode(JSON.stringify({ credits: creditsPayload }, null, 2));
  entrySha256["credits.json"] = await sha256Hex(creditsJson);
  zipEntries.push({ path: "credits.json", bytes: creditsJson });

  const findingsJson = new TextEncoder().encode(JSON.stringify({ findings: findingsPayload }, null, 2));
  entrySha256["findings.json"] = await sha256Hex(findingsJson);
  zipEntries.push({ path: "findings.json", bytes: findingsJson });

  const projectJson = new TextEncoder().encode(
    JSON.stringify(
      {
        id: project.id,
        title: project.title,
        artistName: project.artistName,
        status: project.status,
        metadata: project.metadata,
        assets: assetsPayload,
      },
      null,
      2
    )
  );
  entrySha256["project.json"] = await sha256Hex(projectJson);
  zipEntries.push({ path: "project.json", bytes: projectJson });

  const generatedAt = new Date().toISOString();
  const manifestForZip: Omit<ReleaseAssembleManifest, "packageSha256"> = {
    version: RELEASE_ASSEMBLE_VERSION,
    releaseId: project.id,
    title: project.title,
    artistName: project.artistName,
    status: project.status,
    generatedAt,
    entrySha256,
    findings: findingsPayload,
    credits: creditsPayload,
    assets: assetsPayload,
  };
  zipEntries.push({
    path: "MANIFEST.json",
    bytes: new TextEncoder().encode(JSON.stringify(manifestForZip, null, 2)),
  });

  const readme = new TextEncoder().encode(
    [
      "VYBZ release assemble package",
      `Version: ${RELEASE_ASSEMBLE_VERSION}`,
      `Release: ${project.title}`,
      `Id: ${project.id}`,
      "",
      "Contents: MANIFEST.json (per-entry SHA-256), project.json, findings.json",
      "(each warning cites a rule), credits.json (solo contributor metadata —",
      "no collaborative editing required), plus any audio/artwork bytes supplied.",
      "",
      "Package SHA-256 is measured after ZIP build and shown in the app (Law 1).",
      "VYBZ does not distribute to DSPs.",
    ].join("\n")
  );
  zipEntries.push({ path: "README.txt", bytes: readme });

  const bytes = buildZip(zipEntries);
  const sha256 = await sha256Hex(bytes);
  const manifest: ReleaseAssembleManifest = {
    ...manifestForZip,
    packageSha256: sha256,
  };

  return {
    bytes,
    sha256,
    fileName: `vybz-${project.id.slice(0, 8)}-release.zip`,
    manifest,
  };
}
