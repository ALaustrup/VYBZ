/** Normalized platform errors for all bridge implementations. */

export type PlatformErrorCode =
  | "unsupported"
  | "permission_denied"
  | "cancelled"
  | "io"
  | "network"
  | "validation"
  | "unknown";

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly causeDetail?: unknown;

  constructor(code: PlatformErrorCode, message: string, causeDetail?: unknown) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.causeDetail = causeDetail;
  }
}

export function unsupported(feature: string): PlatformError {
  return new PlatformError("unsupported", `${feature} is not available on this platform`);
}

export function cancelled(feature = "operation"): PlatformError {
  return new PlatformError("cancelled", `${feature} cancelled`);
}

export function permissionDenied(feature: string): PlatformError {
  return new PlatformError("permission_denied", `Permission denied for ${feature}`);
}

export function normalizeUnknown(err: unknown, fallback = "Platform operation failed"): PlatformError {
  if (err instanceof PlatformError) return err;
  if (err instanceof Error) return new PlatformError("unknown", err.message, err);
  return new PlatformError("unknown", fallback, err);
}
