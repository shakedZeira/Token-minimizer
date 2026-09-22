import { describe, it, expect } from "vitest"
import { injectCompactionContext, COMPACTION_GUIDANCE } from "../src/compaction.js"

describe("compaction", () => {
  it("adds guidance to context", () => {
    const ctx = ["existing"]
    injectCompactionContext(ctx)
    expect(ctx).toContain(COMPACTION_GUIDANCE)
  })

  it("does not duplicate guidance", () => {
    const ctx = [COMPACTION_GUIDANCE]
    injectCompactionContext(ctx)
    expect(ctx.filter(c => c === COMPACTION_GUIDANCE)).toHaveLength(1)
  })
})