/** Injected at build time from Vercel / GitHub SHA. */
export const BUILD_SHA: string = __VYBZ_BUILD_SHA__;

export function buildLabel(): string {
  const sha = BUILD_SHA;
  if (!sha || sha === "local") return "local build";
  return sha.slice(0, 7);
}
