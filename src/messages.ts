import type { Message, Part } from "@opencode-ai/sdk"
import { toolBudgets, truncateCentered, noopOutput } from "./utils.js"

export interface MessageEntry {
  info: Message
  parts: Part[]
}

export interface MessageTrimOptions {
  aggr: "light" | "balanced"
  removeNoop: boolean
  collapseText: boolean
}

type CompletedToolPart = Extract<Part, { type: "tool" }> & {
  state: Extract<Extract<Part, { type: "tool" }>["state"], { status: "completed" }>
}

function isCompletedTool(part: Part): part is CompletedToolPart {
  return part.type === "tool" && part.state.status === "completed"
}

function collapseExcessNewlines(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
}

/**
 * Trims message history in place. Only mutates `messages` array entries;
 * never reassigns the array (in-place requirement of the hook).
 *
 * Capability-safe rules:
 * - Tool outputs are only trimmed when they are OLD (age >= ageTurns, kept high
 *   so a multi-turn implementation build never loses a mid-task file read).
 * - Prompt text (user messages) is NEVER newline-collapsed: the active
 *   instruction is byte-exact, so a sub-agent's task prompt (often blank-line
 *   rich markdown/code) cannot be mangled between turns.
 * - Only trimmed outputs are ever truncated; call/result pairing is kept and a
 *   substituted part carries the same id/session/message so ordering holds.
 */
export function trimMessages(messages: MessageEntry[], opts: MessageTrimOptions): void {
  const budgets = toolBudgets(opts.aggr)
  const len = messages.length

  for (let i = 0; i < len; i++) {
    const entry = messages[i]
    if (!entry || !Array.isArray(entry.parts)) continue

    const role = (entry.info as { role?: string }).role
    const age = ageOf(messages, i)

    for (let p = 0; p < entry.parts.length; p++) {
      const part = entry.parts[p]
      if (!part) continue

      if (part.type === "text") {
        // Assistant prose only — never collapse user prompts (task instructions).
        if (opts.collapseText && role === "assistant") {
          const next = collapseExcessNewlines(part.text)
          if (next !== part.text) entry.parts[p] = { ...part, text: next }
        }
        continue
      }

      if (isCompletedTool(part)) {
        const output = part.state.output
        if (opts.removeNoop && age >= 2 && noopOutput(output)) {
          // Remove only truly-empty OLD completed outputs; the whole call+result
          // pair lives in one part. Recent outputs (age < 2) are preserved so an
          // agent sees what it just ran.
          entry.parts.splice(p, 1)
          p--
          continue
        }
        if (output.length > budgets.maxChars && age >= budgets.ageTurns) {
          const { text } = truncateCentered(output, budgets.maxChars, "\n... [output trimmed by token-slim]\n")
          entry.parts[p] = {
            ...part,
            state: { ...part.state, output: text },
          }
        }
      }
    }
  }
}

/**
 * Age = number of assistant messages strictly after this message's index.
 * A message is "recent" (age < ageTurns) if it is among the last few assistant turns.
 */
function ageOf(messages: MessageEntry[], index: number): number {
  let age = 0
  for (let j = index + 1; j < messages.length; j++) {
    const r = (messages[j].info as { role?: string }).role
    if (r === "assistant") age++
  }
  return age
}