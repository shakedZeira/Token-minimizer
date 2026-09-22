export const SYSTEM_DIRECTIVE =
  "Be concise: prefer short flags (git status --short, ls, grep -n), avoid dumping whole files when a targeted read/grep suffices, and don't repeat tool output verbatim back to the user."

export function injectSystemDirective(system: string[]): string[] {
  // Insert after index 0 (the main system block) so the cached prompt prefix stays stable.
  if (system.length === 0) {
    system.push(SYSTEM_DIRECTIVE)
    return system
  }
  system.splice(1, 0, SYSTEM_DIRECTIVE)
  return system
}