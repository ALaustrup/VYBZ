/** Keep Asset Node reads inside the authorized folder. No filesystem paths. */

export function safeRelativePath(input: string): string | null {
  const normalized = input.replace(/\\/g, "/").replace(/\0/g, "").trim();
  if (!normalized || normalized.length > 1000) return null;
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return null;
  const parts = normalized.split("/").filter((part) => part !== "");
  if (!parts.length) return null;
  if (parts.some((part) => part === "." || part === ".." || part === "~")) return null;
  return parts.join("/");
}

export function isSafeRelativePath(input: string): boolean {
  return safeRelativePath(input) !== null;
}
