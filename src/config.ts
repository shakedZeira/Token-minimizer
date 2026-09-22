import type { Config } from "@opencode-ai/plugin"

export interface ExtendedConfig extends Config {
  tool_output?: {
    max_lines?: number
    max_bytes?: number
  }
  compaction?: {
    prune?: boolean
    auto?: boolean
    keep?: { tokens?: number }
    buffer?: number
  }
}

/**
 * Set conservative defaults only when the user hasn't explicitly configured them.
 * Runs once at plugin init via the `config` hook.
 *
 * IMPORTANT: `compaction.prune` is deliberately left ALONE. Forcing it on made
 * long-running sub-agents forget their instructions mid-task: compaction would
 * summarize away an early "run the suite exactly once" directive, and the
 * agent re-ran the suite to "confirm" (the reported loop). Pruning is the
 * ENGINE's call; the user can set compaction in opencode config if wanted.
 */
export function applyConfigDefaults(cfg: ExtendedConfig): void {
  if (cfg.tool_output === undefined) {
    cfg.tool_output = { max_lines: 2000, max_bytes: 65536 }
  }
}