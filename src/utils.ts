import type { Message, Part } from "@opencode-ai/sdk"

export interface TokenSlimOptions {
  aggr: "light" | "balanced"
  features: {
    descriptions: boolean
    messages: boolean
    system: boolean
    compaction: boolean
    outputCleanup: boolean
    flags: boolean
    configDefaults: boolean
  }
}

export const DEFAULT_OPTIONS: TokenSlimOptions = {
  aggr: "light",
  features: {
    descriptions: true,
    messages: true,
    system: true,
    compaction: true,
    outputCleanup: true,
    flags: true,
    configDefaults: true,
  },
}

export function parseOptions(raw?: Record<string, unknown>): TokenSlimOptions {
  if (!raw || typeof raw !== "object") return DEFAULT_OPTIONS
  const aggr = raw.aggr === "light" ? "light" : "balanced"
  const f = raw.features
  const features =
    f && typeof f === "object"
      ? {
          descriptions: boolOf((f as Record<string, unknown>).descriptions, true),
          messages: boolOf((f as Record<string, unknown>).messages, true),
          system: boolOf((f as Record<string, unknown>).system, true),
          compaction: boolOf((f as Record<string, unknown>).compaction, true),
          outputCleanup: boolOf((f as Record<string, unknown>).outputCleanup, true),
          flags: boolOf((f as Record<string, unknown>).flags, true),
          configDefaults: boolOf((f as Record<string, unknown>).configDefaults, true),
        }
      : DEFAULT_OPTIONS.features
  return { aggr, features }
}

function boolOf(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

export function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/gi, "")
}

export function collapseBlankLines(text: string): string {
  return text.replace(/\n{4,}/g, "\n\n\n")
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim()
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export interface TruncateResult {
  text: string
  truncated: boolean
}

export function truncateCentered(text: string, maxChars: number, marker = "..."): TruncateResult {
  if (text.length <= maxChars) return { text, truncated: false }
  if (maxChars <= marker.length * 2 + 2) {
    return { text: text.slice(0, Math.max(0, maxChars)), truncated: true }
  }
  const half = Math.floor((maxChars - marker.length) / 2)
  return {
    text: `${text.slice(0, half)}${marker}${text.slice(-half)}`,
    truncated: true,
  }
}

export function isToolPart(part: Part): part is Extract<Part, { type: "tool" }> {
  return part.type === "tool"
}

export interface ToolOutputBudgets {
  /** Tool outputs older than the most recent N assistant turns get budgeted output */
  ageTurns: number
  /** Max characters kept (center-truncated) for old completed tool outputs */
  maxChars: number
  /** Tokens at which a tool chain turn is considered output-heavy */
  heavyChars: number
}

export function toolBudgets(aggr: "light" | "balanced"): ToolOutputBudgets {
  // Capability-safe trimming: long implementation sessions (file reads, reasoning,
  // then edits many turns later) need their working set intact. Only center-trim
  // tool outputs that are at least `ageTurns` assistant turns old AND exceed
  // maxChars; ageTurns is set high enough that a normal 10-20 step build never
  // loses a read mid-task (the old ageTurns=4/5 starved a sub-agent of file
  // contents it had loaded and it shipped a plan instead of edits).
  if (aggr === "light") return { ageTurns: 12, maxChars: 20000, heavyChars: 50000 }
  return { ageTurns: 10, maxChars: 16000, heavyChars: 30000 }
}

export interface RemoveNoopOptions {
  /** Remove completed tool outputs that are empty / whitespace / explicit no-op */
  removeNoop: boolean
}

export function noopOutput(output: string): boolean {
  const t = output.trim().toLowerCase()
  if (t === "") return true
  if (/^\((no output|no output returned|ok|done|success)\)$/.test(t)) return true
  if (/^output truncated; full content saved to /.test(t)) return false
  return false
}

export function messageUserInfo(info: Message): boolean {
  return (info as { role?: string }).role === "user"
}

export function toolCallTurnIndex(completed: number): number {
  // completed tool parts count toward assistant turns; keeps call/result pairing intact
  return completed
}

function cloneDeep(value: unknown): unknown {
  const sc = (globalThis as unknown as { structuredClone?: <T>(v: T) => T }).structuredClone
  if (typeof sc === "function") {
    try {
      return sc(value)
    } catch {
      /* fall through to JSON for objects with functions (tool definitions) */
    }
  }
  // JSON throws on circular refs — withOutGuard catches and fails closed.
  return JSON.parse(JSON.stringify(value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function restoreInPlace(target: unknown, source: unknown): void {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = 0
    for (const item of source) target.push(item)
    return
  }
  if (!isRecord(target) || !isRecord(source)) return
  for (const key of Object.keys(source)) {
    const t = target[key]
    const s = source[key]
    if (isRecord(t) && isRecord(s)) {
      restoreInPlace(t, s)
    } else if (Array.isArray(t) && Array.isArray(s)) {
      restoreInPlace(t, s)
    } else {
      target[key] = s
    }
  }
  for (const key of Object.keys(target)) {
    if (typeof target[key] === "function") continue
    if (!Object.prototype.hasOwnProperty.call(source, key)) delete target[key]
  }
}

export function withOutGuard(name: string, out: unknown, mutate: () => void): void {
  if (out === null || out === undefined || typeof out !== "object") return
  let snapshot: unknown
  try {
    snapshot = cloneDeep(out)
  } catch (err) {
    console.error(`[token-slim] ${name}: could not snapshot output; skipping mutation`, err)
    return
  }
  try {
    mutate()
  } catch (err) {
    console.error(`[token-slim] ${name}: error during mutation; restoring original output`, err)
    restoreInPlace(out, snapshot)
  }
}