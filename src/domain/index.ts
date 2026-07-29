/**
 * Domain layer boundary. Prepare release domain lives in packages/domain/releases
 * (@vybz/domain/releases). This module must not import Tauri, Capacitor, or DOM APIs.
 */
export const DOMAIN_LAYER = "src/domain" as const;
export type { ReleaseProject, ReleaseFinding } from "@vybz/domain/releases";
