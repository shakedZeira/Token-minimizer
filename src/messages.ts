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
 */
export function trimMessages(messages: MessageEntry[], opts: MessageTrimOptions): void {
  const budgets = toolBudgets(opts.aggr)
  const len = messages.length

  for (let i = 0; i < len; i++) {
    const entry = messages[i]
    if (!entry || !Array.isArray(entry.parts)) continue

    const role = (entry.info as { role?: string }).role
    const isLast = i === len - 1

    for (let p = 0; p < entry.parts.length; p++) {
      const part = entry.parts[p]
      if (!part) continue

      if (part.type === "text") {
        if (opts.collapseText) {
          const next = collapseExcessNewlines(part.text)
          if (next !== part.text) entry.parts[p] = { ...part, text: next }
        }
        continue
      }

      if (isCompletedTool(part)) {
        const output = part.state.output
        if (opts.removeNoop && !isLast && noopOutput(output)) {
          // Remove only truly-empty completed outputs; whole call+result pair lives in one part
          entry.parts.splice(p, 1)
          p--
          continue
        }
        if (output.length > budgets.maxChars && ageOf(messages, i) >= budgets.ageTurns) {
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