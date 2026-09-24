import { describe, it, expect } from "vitest"
import { trimMessages, MessageTrimOptions } from "../src/messages.js"

function user(id: string, parts: any[] = [{ id: "p", type: "text", text: "hi" }]) {
  return {
    info: { id, role: "user", time: { created: 1 } },
    parts,
  }
}

function assistant(id: string, parts: any[]) {
  return {
    info: { id, role: "assistant", time: { created: 2 } },
    parts,
  }
}

function toolPart(callID: string, tool: string, output: string, completed = true) {
  return {
    id: `tp-${callID}`,
    sessionID: "s",
    messageID: "m",
    type: "tool" as const,
    callID,
    tool,
    state: {
      status: completed ? "completed" : "pending",
      input: {},
      output,
      title: tool,
      metadata: {},
      time: { start: 1, end: completed ? 2 : undefined },
    },
  }
}

function textPart(text: string) {
  return { id: "tp", sessionID: "s", messageID: "m", type: "text" as const, text }
}

describe("messages.trimMessages", () => {
  const opts: MessageTrimOptions = { aggr: "balanced", removeNoop: true, collapseText: true }

  it("collapses excess newlines in ASSISTANT text parts only (user prompts preserved)", () => {
    const msgs = [user("1", [textPart("a\n\n\n\nb")]), assistant("2", [textPart("c\n\n\n\nd")])]
    trimMessages(msgs, opts)
    expect(msgs[0].parts[0].text).toBe("a\n\n\n\nb")
    expect(msgs[1].parts[0].text).toBe("c\n\nd")
  })

  it("removes noop tool outputs (age >= 2, not last message)", () => {
    const msgs = [
      assistant("1", [toolPart("c1", "bash", "(no output)")]),
      user("2", [textPart("next")]),
      assistant("3", [toolPart("c2", "grep", "small")]),
      user("4", [textPart("next")]),
      assistant("5", [toolPart("c2", "grep", "small")]),
      user("6", [textPart("next")]),
    ]
    trimMessages(msgs, opts)
    expect(msgs[0].parts).toHaveLength(0)
  })

  it("does not remove noop from LAST message", () => {
    const msgs = [assistant("1", [toolPart("c1", "bash", "(ok)")])]
    trimMessages(msgs, opts)
    expect(msgs[0].parts).toHaveLength(1)
  })

  it("does not remove recent noop tool outputs (age < 2)", () => {
    const msgs = [
      assistant("1", [toolPart("c1", "bash", "(no output)")]),
      user("2", [textPart("next")]),
      assistant("3", [toolPart("c2", "grep", "small")]),
    ]
    trimMessages(msgs, opts)
    expect(msgs[0].parts).toHaveLength(1)
  })

  it("truncates old large tool outputs (age >= 10 for balanced)", () => {
    const msgs = [assistant("1", [toolPart("c1", "bash", "x".repeat(20000))])]
    for (let t = 0; t < 11; t++) msgs.push(user("u" + t, [textPart("next")]))
    for (let t = 0; t < 10; t++) msgs.push(assistant("a" + t, [toolPart("c2", "grep", "small")]))
    trimMessages(msgs, opts)
    const out = msgs[0].parts[0].state.output
    expect(out.length).toBeLessThanOrEqual(16000)
    expect(out).toContain("[output trimmed by token-slim]")
  })

  it("does not truncate older-large-output within protected window (age < ageTurns)", () => {
    const msgs = [assistant("1", [toolPart("c1", "bash", "x".repeat(20000))])]
    for (let t = 0; t < 10; t++) msgs.push(user("u" + t, [textPart("next")]))
    for (let t = 0; t < 9; t++) msgs.push(assistant("a" + t, [toolPart("c2", "grep", "small")]))
    trimMessages(msgs, opts)
    expect(msgs[0].parts[0].state.output.length).toBe(20000)
  })

  it("does not truncate recent tool outputs (age < ageTurns)", () => {
    const msgs = [
      user("1", [textPart("q")]),
      assistant("2", [toolPart("c1", "bash", "x".repeat(5000))]),
    ]
    trimMessages(msgs, opts)
    expect(msgs[1].parts[0].state.output.length).toBe(5000)
  })

  it("does not touch pending/running tool parts", () => {
    const msgs = [
      assistant("1", [
        { ...toolPart("c1", "bash", "out", false), state: { ...toolPart("c1", "bash", "out", false).state, status: "pending" } },
      ]),
    ]
    trimMessages(msgs, opts)
    expect(msgs[0].parts[0].state.status).toBe("pending")
  })
})