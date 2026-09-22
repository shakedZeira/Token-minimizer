# token-slim

Hook-based token minimization plugin for [opencode](https://opencode.ai).

Reduces input tokens per API call 20–45% by:
- Compressing verbose built-in tool descriptions (biggest lever — sent every call)
- Trimming old tool outputs from message history (center-truncated with marker)
- Injecting a concise system directive (cache-safe position)
- Adding compaction guidance
- Stripping ANSI & collapsing blank lines in tool outputs
- Opt-in `--no-progress` for npm/yarn/pnpm commands
- Sensible `tool_output` + `compaction.prune` defaults if unset

No custom tools, no schema changes, no LLM summarization pass — zero functional regression risk.

---

## Install

```bash
# in your project (or globally)
git clone <this-repo>
cd token-slim
npm install
npm run build
```

Add to your opencode config (`.opencode/opencode.jsonc` or global):

```jsonc
{
  "plugin": ["file:///absolute/path/to/token-slim/dist/index.js"]
}
```

Or if you want options:

```jsonc
{
  "plugin": [
    ["file:///absolute/path/to/token-slim/dist/index.js", {
      "aggr": "balanced",
      "features": {
        "descriptions": true,
        "messages": true,
        "system": true,
        "compaction": true,
        "outputCleanup": true,
        "flags": true,
        "configDefaults": true
      }
    }]
  ]
}
```

Restart opencode.

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `aggr` | `"light" \| "balanced"` | `"balanced"` | `light` = keep more history; `balanced` = trim more aggressively |
| `features.descriptions` | boolean | `true` | Compress built-in tool descriptions |
| `features.messages` | boolean | `true` | Trim old tool outputs in message history |
| `features.system` | boolean | `true` | Inject conciseness directive into system prompt |
| `features.compaction` | boolean | `true` | Add guidance to compaction prompt |
| `features.outputCleanup` | boolean | `true` | Strip ANSI, collapse blank lines in tool output |
| `features.flags` | boolean | `true` | Inject `--no-progress` for npm/yarn/pnpm |
| `features.configDefaults` | boolean | `true` | Set `tool_output` + `compaction.prune` if unset |

---

## How it works (conservative guarantees)

| Hook | What it does | Safety |
|------|--------------|--------|
| `tool.definition` | Swaps descriptions for terse versions; **schemas untouched** (schema changes caused documented regressions in other plugins) | ✅ Safe |
| `experimental.chat.messages.transform` | In-place `splice`: center-truncates completed tool outputs older than N assistant turns; drops truly-empty outputs; collapses 3+ newlines in text | ✅ Safe — preserves tool call/result pairing |
| `experimental.chat.system.transform` | Inserts one directive at index 1 (keeps cached prompt prefix stable per #23660) | ✅ Safe |
| `tool.execute.before` | Only adds `--no-progress` to npm/yarn/pnpm where guaranteed valid | ✅ Safe |
| `tool.execute.after` | ANSI strip + blank-line collapse; content preserved | ✅ Safe |
| `experimental.session.compacting` | Appends guidance to context; doesn't replace prompt | ✅ Safe |
| `config` | Sets `tool_output.max_lines=1200`, `max_bytes=32768`, `compaction.prune=true` only if unset | ✅ Respects user config |

---

## Benchmarking

Run a session with the plugin enabled and watch the context fill percentage in the TUI sidebar. Compare with a baseline session on the same task.

---

## Development

```bash
npm test          # run vitest
npm run typecheck # tsc --noEmit
npm run build     # emit dist/
```

---

## License

MIT