/**
 * Diagnostic Sanitization Utilities
 * Prevents raw SQL queries, bound parameters, and PII from leaking into logs or monitoring.
 */

export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return "";
  let clean = msg;
  // 1. Redact entire SQL query bodies
  clean = clean.replace(/((?:Failed query|query):\s*)[\s\S]*?(\bparams\s*:\s*|$)/i, (_match, prefix, suffix) => {
    return prefix + "[REDACTED] " + suffix;
  });
  // 2. Redact all parameters following 'params:'
  clean = clean.replace(/\bparams\s*:\s*[\s\S]*$/i, "params: [REDACTED]");
  // 3. Also redact bracketed params and inline values (...) if present
  clean = clean.replace(/params:\s*\[[\s\S]*?\]/gi, "params: [REDACTED]");
  // 4. Redact VALUES (...) and multi-row VALUES (...), (...) clauses in raw queries
  clean = clean.replace(/\bvalues\s*\([\s\S]*?\)(?:\s*,\s*\([\s\S]*?\))*/gi, "values ([REDACTED])");
  return clean.length > 500 ? clean.slice(0, 500) + "... [TRUNCATED]" : clean;
}

const V8_FRAME_REGEX = /^\s+at\s+(?:.*?\(.*?(?::\d+:\d+|<anonymous>|\(native\))\)|.*?(?::\d+:\d+|<anonymous>|\(native\))|node:.*:\d+:\d+)/;

export function extractCleanStack(err: Error): string | undefined {
  if (!err.stack) return undefined;
  // Discard the message portion of the stack (first line(s)) to prevent raw PII/params leakage,
  // matching only authenticated V8 call frames with indentation, location/anonymous/native markers.
  const lines = err.stack.split("\n");
  const firstFrameIdx = lines.findIndex((l) => V8_FRAME_REGEX.test(l));
  if (firstFrameIdx === -1) return undefined;
  return lines
    .slice(firstFrameIdx, firstFrameIdx + 5)
    .filter((l) => V8_FRAME_REGEX.test(l))
    .map((l) => l.trim())
    .join("\n");
}
