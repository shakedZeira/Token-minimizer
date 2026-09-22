import { describe, it, expect } from "vitest"
import { maybeInjectNoProgress, sanitizeOutput } from "../src/io.js"

describe("io", () => {
  it("injects --no-progress for npm", () => {
    const args = { command: "npm install foo" }
    maybeInjectNoProgress(args)
    expect(args.command).toBe("npm install foo --no-progress")
  })

  it("does not double-inject", () => {
    const args = { command: "npm install --no-progress" }
    maybeInjectNoProgress(args)
    expect(args.command).toBe("npm install --no-progress")
  })

  it("does nothing for unknown commands", () => {
    const args = { command: "make build" }
    maybeInjectNoProgress(args)
    expect(args.command).toBe("make build")
  })

  it("sanitizeOutput strips ANSI", () => {
    const s = "\u001b[31mred\u001b[0m\n\n\n\ntext"
    expect(sanitizeOutput(s)).toBe("red\n\n\ntext")
  })

  it("sanitizeOutput collapses excess blank lines", () => {
    expect(sanitizeOutput("a\n\n\n\n\nb")).toBe("a\n\n\nb")
  })
})