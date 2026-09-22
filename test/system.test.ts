import { describe, it, expect } from "vitest"
import { injectSystemDirective, SYSTEM_DIRECTIVE } from "../src/system.js"

describe("system", () => {
  it("inserts directive at index 1", () => {
    const sys = ["main system block"]
    injectSystemDirective(sys)
    expect(sys).toEqual(["main system block", SYSTEM_DIRECTIVE])
  })

  it("pushes if empty", () => {
    const sys: string[] = []
    injectSystemDirective(sys)
    expect(sys).toEqual([SYSTEM_DIRECTIVE])
  })

  it("uses splice not reassignment", () => {
    const sys = ["a", "b", "c"]
    const ref = sys
    injectSystemDirective(sys)
    expect(sys).toBe(ref)
    expect(sys[0]).toBe("a")
    expect(sys[1]).toBe(SYSTEM_DIRECTIVE)
  })
})