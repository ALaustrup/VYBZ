import type { ShellMode } from "@/contracts";

/** CSS / layout composition mode derived from PlatformBridge.kind */
export function shellModeClass(mode: ShellMode): string {
  return `shell-mode-${mode}`;
}

export function isDenseShell(mode: ShellMode): boolean {
  return mode === "desktop";
}

export function isTouchShell(mode: ShellMode): boolean {
  return mode === "android";
}
