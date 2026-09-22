export const COMPACTION_GUIDANCE = `When summarizing this session, preserve: resolved user requirements, files changed (paths + key diffs), decisions and their reasons, failing tests, and next steps. Drop: verbose tool transcripts, exploratory dead ends, and repeated statements. Keep the summary dense and terse.`

export function injectCompactionContext(context: string[]): string[] {
  if (!context.includes(COMPACTION_GUIDANCE)) context.push(COMPACTION_GUIDANCE)
  return context
}