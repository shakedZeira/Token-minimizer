export const SYSTEM_DIRECTIVE =
  "Be concise in prose: prefer short flags (git status --short, ls, grep -n). Never claim a tool ran or a file was written unless you actually observe it in tool output."

export function injectSystemDirective(system: string[]): string[] {
  // Insert after index 0 (the main system block) so the cached prompt prefix stays stable.
  if (!Array.isArray(system)) return system
  if (Object.isFrozen(system)) return system
  if (system.length === 0) {
    system.push(SYSTEM_DIRECTIVE)
    return system
  }
  system.splice(1, 0, SYSTEM_DIRECTIVE)
  return system
}