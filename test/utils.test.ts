import { describe, it, expect } from "vitest"
import {
  stripAnsi,
  collapseBlankLines,
  collapseWhitespace,
  truncateCentered,
  estimateTokens,
  noopOutput,
  toolBudgets,
} from "../src/utils.js"

describe("utils", () => {
  it("stripAnsi removes escape sequences", () => {
    const s = "\u001b[31mred\u001b[0m text"
    expect(stripAnsi(s)).toBe("red text")
  })

  it("collapseBlankLines reduces 4+ newlines to 3", () => {
    expect(collapseBlankLines("a\n\n\n\nb")).toBe("a\n\n\nb")
    expect(collapseBlankLines("a\n\nb")).toBe("a\n\nb")
  })

  it("collapseWhitespace trims ends and excess newlines", () => {
    expect(collapseWhitespace("a\n\n\nb")).toBe("a\n\nb")
    expect(collapseWhitespace("  a \n  b  \n")).toBe("a \n  b")
  })

  it("truncateCentered keeps small text", () => {
    expect(truncateCentered("hello", 20).text).toBe("hello")
    expect(truncateCentered("hello", 20).truncated).toBe(false)
  })

  it("truncateCentered truncates with marker", () => {
    const r = truncateCentered("abcdefghijklmnopqrstuvwxyz", 20)
    expect(r.truncated).toBe(true)
    expect(r.text.length).toBeLessThanOrEqual(20)
    expect(r.text).toContain("...")
  })

  it("estimateTokens approx chars/4", () => {
    expect(estimateTokens("1234")).toBe(1)
    expect(estimateTokens("12345678")).toBe(2)
  })

  it("noopOutput detects empty/no-op", () => {
    expect(noopOutput("")).toBe(true)
    expect(noopOutput("   ")).toBe(true)
    expect(noopOutput("(no output returned)")).toBe(true)
    expect(noopOutput("(ok)")).toBe(true)
    expect(noopOutput("(done)")).toBe(true)
    expect(noopOutput("output truncated; full content saved to /x")).toBe(false)
  })

  it("toolBudgets returns different tiers", () => {
    expect(toolBudgets("light").ageTurns).toBe(12)
    expect(toolBudgets("balanced").ageTurns).toBe(10)
    expect(toolBudgets("balanced").maxChars).toBeLessThan(toolBudgets("light").maxChars)
    expect(toolBudgets("balanced").maxChars).toBe(16000)
  })
})