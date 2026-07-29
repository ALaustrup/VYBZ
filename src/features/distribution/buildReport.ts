import {
  distributionVerdict,
  evaluateDistribution,
  type DistributionContext,
  type FindingDraft,
} from "@vybz/domain/releases";
import { buildZip, sha256Hex, type ZipEntry } from "./packageZip";

export type DistributionReport = {
  releaseId: string;
  title: string;
  generatedAt: string;
  verdict: "pass" | "fail" | "warnings";
  findings: FindingDraft[];
  packageKind: "zip" | "ddp-stub";
  sha256?: string;
};

export function buildDistributionReport(
  releaseId: string,
  ctx: DistributionContext & { title: string }
): DistributionReport {
  const findings = evaluateDistribution(ctx);
  return {
    releaseId,
    title: ctx.title,
    generatedAt: new Date().toISOString(),
    verdict: distributionVerdict(findings),
    findings,
    packageKind: "zip",
  };
}

/** Build browser/desktop ZIP package bytes + SHA-256. */
export async function buildDistributionPackage(report: DistributionReport): Promise<{
  bytes: Uint8Array;
  fileName: string;
  sha256: string;
  report: DistributionReport;
}> {
  const reportJson = new TextEncoder().encode(JSON.stringify(report, null, 2));
  const readme = new TextEncoder().encode(
    [
      `VYBZ distribution package`,
      `Release: ${report.title}`,
      `Id: ${report.releaseId}`,
      `Verdict: ${report.verdict}`,
      `Generated: ${report.generatedAt}`,
      ``,
      `Contents: DISTRIBUTION_REPORT.json (pass/fail + warnings).`,
      `DDP image authoring is stubbed in Phase 8 — ZIP is the portable export.`,
    ].join("\n")
  );

  const entries: ZipEntry[] = [
    { path: "DISTRIBUTION_REPORT.json", bytes: reportJson },
    { path: "README.txt", bytes: readme },
  ];
  const bytes = buildZip(entries);
  const sha256 = await sha256Hex(bytes);
  const fileName = `vybz-${report.releaseId.slice(0, 8)}-distribution.zip`;
  return {
    bytes,
    fileName,
    sha256,
    report: { ...report, sha256, packageKind: "zip" },
  };
}

/** Desktop DDP stub marker file set (same ZIP, different label). */
export async function buildDdpStubPackage(report: DistributionReport) {
  const base = await buildDistributionPackage({ ...report, packageKind: "ddp-stub" });
  const marker = new TextEncoder().encode("VYBZ DDP stub — full DDP authoring deferred.\n");
  const entries: ZipEntry[] = [
    { path: "DISTRIBUTION_REPORT.json", bytes: new TextEncoder().encode(JSON.stringify(base.report, null, 2)) },
    { path: "DDPINFO.txt", bytes: marker },
    { path: "README.txt", bytes: new TextEncoder().encode("DDP package stub for Desktop Alpha.\n") },
  ];
  const bytes = buildZip(entries);
  const sha256 = await sha256Hex(bytes);
  return {
    bytes,
    fileName: `vybz-${report.releaseId.slice(0, 8)}-ddp-stub.zip`,
    sha256,
    report: { ...base.report, sha256, packageKind: "ddp-stub" as const },
  };
}
