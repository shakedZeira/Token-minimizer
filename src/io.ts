import type { Part } from "@opencode-ai/sdk"
import { stripAnsi, collapseBlankLines, estimateTokens, withOutGuard } from "./utils.js"

export const ALLOWED_NO_PROGRESS_CMDS = ["npm", "yarn", "pnpm"]

/**
 * Safe, minimal flag injection: only append `--no-progress` to well-known package
 * managers where it's guaranteed valid and purely reduces verbosity.
 */
export function maybeInjectNoProgress(args: Record<string, unknown>): void {
  if (!args || typeof args !== "object") return
  const cmd = args.command
  if (!cmd || typeof cmd !== "string") return
  const trimmed = cmd.trimStart()
  for (const mgr of ALLOWED_NO_PROGRESS_CMDS) {
    if (trimmed.startsWith(mgr + " ")) {
      if (!/\s--no-progress(\s|$)/.test(trimmed)) {
        args.command = `${trimmed} --no-progress`
      }
      break
    }
  }
}

/**
 * Light output sanitization: strip ANSI, collapse excess blank lines.
 * Purely cosmetic — content preserved.
 */
export function sanitizeOutput(output: string): string {
  let t = stripAnsi(output)
  t = collapseBlankLines(t)
  return t
}

export interface ToolAfterHook {
  (input: { tool: string; sessionID: string; callID: string; args: any }, output: { title: string; output: string; metadata: any }): Promise<void>
}

export function makeAfterHook(): ToolAfterHook {
  return async (_input, output) => {
    withOutGuard("tool.execute.after", output, () => {
      if (typeof output.output === "string") {
        output.output = sanitizeOutput(output.output)
      }
    })
  }
}