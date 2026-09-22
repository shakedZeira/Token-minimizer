import { describe, it, expect } from "vitest"
import { compressDescription } from "../src/descriptions.js"

describe("descriptions", () => {
  it("compresses known tools", () => {
    const before = "Run a shell command in the project directory with options..."
    expect(compressDescription("bash", before).length).toBeLessThan(before.length)
  })

  it("leaves unknown tools untouched", () => {
    const desc = "Do something obscure"
    expect(compressDescription("mcp__custom", desc)).toBe(desc)
  })

  it("doesn't expand if compressed is longer", () => {
    const tiny = "x"
    expect(compressDescription("read", tiny)).toBe(tiny)
  })
})