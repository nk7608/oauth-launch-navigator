// Checks names and supported settings only; never include secret values in messages.
export const REQUIRED_KEYS = ["COMPOSIO_API_KEY", "OPENROUTER_API_KEY", "TAVILY_API_KEY"] as const;

export function generationSetupIssue(env: Record<string, string | undefined> = process.env): string | undefined {
  const missing: string[] = REQUIRED_KEYS.filter((name) => !env[name]?.trim());
  if (env.VERCEL && !env.BLOB_READ_WRITE_TOKEN?.trim()) missing.push("BLOB_READ_WRITE_TOKEN");
  if (missing.length) return `Live research is not configured: missing ${missing.join(", ")}. Library guides still work.`;
  if (env.LLM_PROVIDER && env.LLM_PROVIDER !== "openrouter") {
    return "Live research requires LLM_PROVIDER=openrouter. Library guides still work.";
  }
}
