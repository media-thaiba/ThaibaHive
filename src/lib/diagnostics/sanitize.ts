export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return "";
  let clean = msg;
  // If message begins with or contains a Drizzle "Failed query:", completely redact the query body
  clean = clean.replace(/Failed query:\s*[\s\S]*?(\bparams\s*:|$)/i, "Failed query: [REDACTED]\nparams: ");
  // Redact everything following params: to the end of string (matches Drizzle query error: `Failed query: ...\nparams: ...`)
  clean = clean.replace(/\bparams\s*:\s*[\s\S]*$/i, "params: [REDACTED]");
  // Also redact bracketed params and inline values (...) if present
  clean = clean.replace(/params:\s*\[[\s\S]*?\]/gi, "params: [REDACTED]");
  clean = clean.replace(/values\s*\([\s\S]*?\)/gi, "values ([REDACTED])");
  return clean.length > 500 ? clean.slice(0, 500) + "... [TRUNCATED]" : clean;
}

export function extractCleanStack(err: Error): string | undefined {
  if (!err.stack) return undefined;
  // Discard the message portion of the stack (first line(s)) to prevent raw PII/params leakage,
  // keeping only pure V8 call frames ("at ...")
  const lines = err.stack.split("\n");
  const firstFrameIdx = lines.findIndex((l) => l.trimStart().startsWith("at "));
  if (firstFrameIdx === -1) return undefined;
  return lines.slice(firstFrameIdx, firstFrameIdx + 5).map((l) => l.trim()).join("\n");
}
