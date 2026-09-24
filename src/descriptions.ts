export interface ToolEntry {
  description: string
}

export const DESCRIPTION_MAP: Record<string, string> = {
  bash: "Run a shell command in the project directory.",
  read: "Read a file (or line range) and return its text.",
  edit: "Apply an exact string replacement to a file.",
  write: "Create or fully overwrite a file's contents.",
  grep: "Regex-search file contents, returning matching lines.",
  glob: "Find file paths by glob pattern.",
  list: "List files and subdirectories in a directory.",
  task: "Dispatch a subagent to complete a subtask and return its summary.",
  skill: "Load a specialized skill's instructions when its description matches the task.",
  webfetch: "Fetch and summarize a URL's content.",
  websearch: "Search the web and return ranked results.",
  todo: "Track current work via a todo list.",
  patch: "Apply a diff to the workspace.",
}

export function compressDescription(toolID: string, description: string): string {
  if (typeof description !== "string") return description
  const slim = DESCRIPTION_MAP[toolID]
  if (slim && slim.length < description.length) return slim
  return description
}