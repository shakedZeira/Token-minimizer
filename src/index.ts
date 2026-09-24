import type { Plugin, PluginInput, PluginOptions, Hooks } from "@opencode-ai/plugin"
import type { Message, Part } from "@opencode-ai/sdk"
import { parseOptions, withOutGuard, DEFAULT_OPTIONS } from "./utils.js"
import { compressDescription } from "./descriptions.js"
import { trimMessages, MessageTrimOptions } from "./messages.js"
import { injectSystemDirective } from "./system.js"
import { injectCompactionContext } from "./compaction.js"
import { maybeInjectNoProgress, makeAfterHook } from "./io.js"
import { applyConfigDefaults } from "./config.js"

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

export const TokenSlim: Plugin = async (
  _input: PluginInput,
  options?: PluginOptions
) => {
  const opts = parseOptions(options as Record<string, unknown>)

  const msgTrimOpts: MessageTrimOptions = {
    aggr: opts.aggr,
    removeNoop: true,
    collapseText: true,
  }

  const hooks: Partial<Hooks> = {}

  if (opts.features.configDefaults) {
    hooks.config = async (cfg) => {
      withOutGuard("config", cfg, () => applyConfigDefaults(cfg as any))
    }
  }

  if (opts.features.descriptions) {
    hooks["tool.definition"] = async ({ toolID }, out) => {
      withOutGuard("tool.definition", out, () => {
        out.description = compressDescription(toolID, out.description)
      })
    }
  }

  if (opts.features.messages) {
    hooks["experimental.chat.messages.transform"] = async (_in, out) => {
      withOutGuard("experimental.chat.messages.transform", out, () => {
        trimMessages(out.messages as any, msgTrimOpts)
      })
    }
  }

  if (opts.features.system) {
    hooks["experimental.chat.system.transform"] = async (_in, out) => {
      withOutGuard("experimental.chat.system.transform", out, () => {
        injectSystemDirective(out.system)
      })
    }
  }

  if (opts.features.compaction) {
    hooks["experimental.session.compacting"] = async (_in, out) => {
      withOutGuard("experimental.session.compacting", out, () => {
        injectCompactionContext(out.context)
      })
    }
  }

  if (opts.features.flags) {
    hooks["tool.execute.before"] = async (_in, out) => {
      withOutGuard("tool.execute.before", out, () => {
        maybeInjectNoProgress(out.args as Record<string, unknown>)
      })
    }
  }

  if (opts.features.outputCleanup) {
    hooks["tool.execute.after"] = makeAfterHook()
  }

  return hooks
}

export default TokenSlim